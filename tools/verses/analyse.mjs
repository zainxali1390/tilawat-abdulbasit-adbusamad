// Verse map of the whole library: which surah and ayahs are recited at each point of every recording.
//
//   node analyse.mjs list  --out todo.json                  recordings not analysed yet (or whose file changed)
//   node analyse.mjs part  --todo todo.json --part 3 --of 24 --out parts/
//   node analyse.mjs merge --parts parts/                    adds the results to vm/ (kept between runs)
//   node analyse.mjs replace                                 re-places every stored transcript (after a better matcher)
//
// Each recording is listened to by the same Quran speech model the app uses (models/whisper-tiny-ar-quran), one
// 30 s stretch every 60 s, and each transcript is placed in the Quran text by the app's own matcher (js/ayah.js).
// Stored in vm/ (in the repository, so nothing is analysed twice):
//   vm/manifest.json   {v, built, recs: {code: [length_s, windows]}, failed: {code: reason}}
//   vm/NN.json         {code: [[t, surah, ayah, surah2, ayah2, conf, level], ...]}   level 2 confirmed, 1 possible, 0 none
//   vm/text/NN.json    {code: [[t, transcript], ...]}   the raw transcripts, so better matching never needs the model again
// NN = shard of the code (FNV-1a hash % 64, the same function as js/finder.js), so the app downloads only what it needs.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import os from 'node:os';
import {execFileSync, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..', '..'), VM = path.join(ROOT, 'vm');
const WIN = 30, STEP = 60, SHARDS = 64;
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
export const shardOf = code => { let h = 0x811c9dc5; for (const ch of Buffer.from(code, 'utf8')) { h ^= ch; h = Math.imul(h, 0x01000193) >>> 0; } return h % SHARDS; };
const hex = n => n.toString(16).padStart(2, '0');

/* the app's matcher, loaded from js/ayah.js and js/quran-data.js (one implementation for the app and this tool) */
function matcher() {
  const ctx = {console, isAr: () => false, numFmt: String};
  vm.createContext(ctx);
  const load = f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^(const|let) /gm, 'var '), ctx);
  load('js/quran-data.js'); load('js/ayah.js');
  const lines = fs.readFileSync(path.join(ROOT, 'data/quran-uthmani.txt'), 'utf8').trim().split('\n');
  ctx.QMATCH.build(lines, ctx.SURAHS.map(x => x[2]));
  return text => { const p = text ? ctx.ayahPlace(text) : null; return p ? [p.surah, p.ayah, p.surah2, p.ayah2, p.conf, p.level === 'confirmed' ? 2 : 1] : [0, 0, 0, 0, 0, 0]; };
}

function readJSON(f, d) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } }
function manifest() { return readJSON(path.join(VM, 'manifest.json'), {v: 1, recs: {}, failed: {}}); }

async function list() {
  const out = arg('out', 'todo.json');
  const allf = out.replace(/\.json$/, '') + '-all.json';
  execFileSync('python3', [path.join(ROOT, 'tools/fingerprint/build_index.py'), 'list', '--out', allf]);
  const all = JSON.parse(fs.readFileSync(allf, 'utf8')), man = manifest();
  const todo = all.filter(r => !man.recs[r.code] && !(man.failed || {})[r.code]);
  if (process.argv.includes('--retry-failed')) todo.push(...all.filter(r => (man.failed || {})[r.code]));
  fs.writeFileSync(out, JSON.stringify(todo));
  console.log('recordings', all.length, '| analysed', Object.keys(man.recs).length, '| to analyse', todo.length);
}

async function part() {
  const todo = JSON.parse(fs.readFileSync(arg('todo', 'todo.json'), 'utf8')), k = +arg('part', 0), n = +arg('of', 1), out = arg('out', 'parts');
  const mine = todo.filter((_, i) => i % n === k);
  fs.mkdirSync(out, {recursive: true});
  const {pipeline, env} = await import('@huggingface/transformers');
  env.allowRemoteModels = false; env.localModelPath = path.join(ROOT, 'models') + '/';
  const asr = await pipeline('automatic-speech-recognition', 'whisper-tiny-ar-quran', {dtype: {encoder_model: 'fp32', decoder_model_merged: 'q8'}});
  const place = matcher();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vm-'));
  const res = {};
  const t0 = Date.now();
  for (const [i, rec] of mine.entries()) {
    const raw = path.join(tmp, 'a'), pcm = path.join(tmp, 'p.f32');
    try {
      let src = rec.url;
      if (!/^https?:/.test(src)) src = path.join(ROOT, decodeURIComponent(src));
      else {
        const r = spawnSync('curl', ['-sS', '-L', '--fail', '--retry', '6', '--retry-delay', '10', '--retry-all-errors', '--connect-timeout', '30', '-m', '2400', '-A', 'abdulbasit-app-indexer', '-o', raw, src]);
        if (r.status !== 0) { res[rec.code] = {err: 'download failed'}; continue; }
        src = raw;
      }
      const d = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', src, '-vn', '-ac', '1', '-ar', '16000', '-f', 'f32le', pcm]);
      if (d.status !== 0) { res[rec.code] = {err: 'could not decode'}; continue; }
      const size = fs.statSync(pcm).size, len = size / 4 / 16000, fd = fs.openSync(pcm, 'r'), wins = [];
      for (let t = 0; t < Math.max(1, len - 3); t += STEP) {
        const n2 = Math.round(Math.min(WIN, len - t) * 16000), buf = Buffer.alloc(n2 * 4);
        fs.readSync(fd, buf, 0, buf.length, Math.round(t * 16000) * 4);
        const x = new Float32Array(buf.buffer, buf.byteOffset, n2);
        let e = 0; for (let j = 0; j < x.length; j += 16) e += x[j] * x[j];
        const text = e / (x.length / 16) < 1e-7 ? '' : (await asr(x, {language: 'ar', task: 'transcribe'})).text.trim();
        wins.push([t, text, ...place(text)]);
      }
      fs.closeSync(fd);
      res[rec.code] = {len: Math.round(len * 10) / 10, wins};
      console.log(`${i + 1}/${mine.length}`, rec.code.slice(0, 50), `${wins.length} windows`, wins.filter(w => w[7] === 2).length, 'confirmed', `${Math.round((Date.now() - t0) / 1000)} s`);
    } catch (e) { res[rec.code] = {err: String(e.message || e).slice(-160)}; }
    finally { for (const f of [raw, pcm]) try { fs.unlinkSync(f); } catch (e) {} }
    if (i % 10 === 9) fs.writeFileSync(path.join(out, `part-${String(k).padStart(3, '0')}.json`), JSON.stringify(res));
  }
  fs.writeFileSync(path.join(out, `part-${String(k).padStart(3, '0')}.json`), JSON.stringify(res));
}

function save(man, place, text) {
  fs.mkdirSync(path.join(VM, 'text'), {recursive: true});
  for (let s = 0; s < SHARDS; s++) {
    fs.writeFileSync(path.join(VM, hex(s) + '.json'), JSON.stringify(place[s] || {}));
    fs.writeFileSync(path.join(VM, 'text', hex(s) + '.json'), JSON.stringify(text[s] || {}));
  }
  man.built = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(path.join(VM, 'manifest.json'), JSON.stringify(man));
}
function loadAll() {
  const place = [], text = [];
  for (let s = 0; s < SHARDS; s++) { place[s] = readJSON(path.join(VM, hex(s) + '.json'), {}); text[s] = readJSON(path.join(VM, 'text', hex(s) + '.json'), {}); }
  return {place, text};
}

async function merge() {
  const dir = arg('parts', 'parts'), man = manifest(), {place, text} = loadAll();
  man.failed = man.failed || {};
  let added = 0, failed = 0;
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
    for (const [code, r] of Object.entries(readJSON(path.join(dir, f), {}))) {
      const s = shardOf(code);
      if (r.err) { man.failed[code] = r.err; failed++; continue; }
      place[s][code] = r.wins.map(w => [w[0], ...w.slice(2)]);
      text[s][code] = r.wins.map(w => [w[0], w[1]]);
      man.recs[code] = [r.len, r.wins.length];
      delete man.failed[code];
      added++;
    }
  }
  /* recordings no longer in the library are dropped */
  const cur = new Set(JSON.parse(execFileSync('python3', ['-c', `import sys,json;sys.path.insert(0,'${path.join(ROOT, 'tools/fingerprint')}');import build_index as b;print(json.dumps([r['code'] for r in b.list_recs()]))`]).toString()));
  for (const code of Object.keys(man.recs)) if (!cur.has(code)) { delete man.recs[code]; const s = shardOf(code); delete place[s][code]; delete text[s][code]; }
  save(man, place, text);
  console.log('added', added, '| failed', failed, '| analysed in total', Object.keys(man.recs).length);
}

/* re-place every stored transcript with the current matcher (no listening needed) */
async function replace() {
  const man = manifest(), {place, text} = loadAll(), p = matcher();
  for (let s = 0; s < SHARDS; s++) for (const [code, ws] of Object.entries(text[s])) place[s][code] = ws.map(([t, tx]) => [t, ...p(tx)]);
  save(man, place, text);
  console.log('re-placed', Object.keys(man.recs).length, 'recordings');
}

const cmd = process.argv[2];
if (cmd === 'list') await list(); else if (cmd === 'part') await part(); else if (cmd === 'merge') await merge(); else if (cmd === 'replace') await replace();
else if (cmd) { console.error('unknown command ' + cmd); process.exit(1); }
