// Quran-content test (step 4): what the app's speech model + matcher say each test clip recites, against the truth.
//   node content_eval.mjs SETDIR OUT.jsonl [--truth truth.json ...] [--mode app|multi] [--part K --of N]
// mode app:   the windows the finder uses for a clip it can't place by sound (whole clip if <= 30 s, else 28 s windows),
//             each transcribed and placed with ayahPlace (js/ayah.js), exactly as in the app
// The truth: transcripts of the CLEAN original stretch (content_truth.py), placed with the same matcher; used only when
// "confirmed" and consistent with the surahs in the recording's title.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..', '..', '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const args = k => process.argv.flatMap((a, i) => a === '--' + k ? [process.argv[i + 1]] : []);
const SET = process.argv[2], OUT = process.argv[3], MODE = arg('mode', 'app'), K = +arg('part', 0), N = +arg('of', 1), MODEL = arg('model', 'whisper-tiny-ar-quran');

export function makeMatcher() {
  const ctx = {console, isAr: () => false, numFmt: String};
  vm.createContext(ctx);
  const load = f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^(const|let) /gm, 'var '), ctx);
  load('js/quran-data.js'); load('js/ayah.js');
  const lines = fs.readFileSync(path.join(ROOT, 'data/quran-uthmani.txt'), 'utf8').trim().split('\n');
  ctx.QMATCH.build(lines, ctx.SURAHS.map(x => x[2]));
  /* surahs named in a title such as "Al-Qamar (49–55) · Ar-Raḥmān", in order */
  const titleSurahs = t => { const o = []; for (const part of (t || '').split(/\s*·\s*/)) { const q = part.replace(/^(Sūrah|Surah)\s+/i, ''); let best = 0, bl = 0;
    ctx.SURAHS.forEach((s, i) => { const n = s[1]; if (q.startsWith(n) && n.length > bl && !/[a-zāīūḥʿʾ]/i.test(q.charAt(n.length) || ' ')) { best = i + 1; bl = n.length; } }); if (best) o.push(best); } return o; };
  return {place: text => text ? ctx.ayahPlace(text) : null, titleSurahs, ctx};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const M = makeMatcher();
  const cases = JSON.parse(fs.readFileSync(path.join(SET, 'cases.json'))).filter((_, i) => i % N === K);
  // truth
  const T = {};
  for (const f of args('truth')) Object.assign(T, JSON.parse(fs.readFileSync(f)).texts);
  const truthOf = (seg, title) => {
    const key = `${seg.code}|${seg.at.toFixed(2)}|${((seg.b - seg.a) * seg.rate).toFixed(2)}`, text = T[key];
    if (text == null) return {status: 'missing'};
    const p = M.place(text);
    if (!p || p.level !== 'confirmed') return {status: 'unplaced', text};
    const ts = M.titleSurahs(title);
    if (ts.length && !ts.includes(p.surah) && !ts.includes(p.surah2)) return {status: 'disagrees with title', text, p: [p.surah, p.ayah, p.surah2, p.ayah2], ts};
    return {status: 'ok', text, p: [p.surah, p.ayah, p.surah2, p.ayah2]};
  };
  let TF; try { TF = await import('@huggingface/transformers'); } catch (e) {
    const {createRequire} = await import('node:module'); const req = createRequire(path.join(ROOT, 'tools/verses/package.json'));
    TF = await import(req.resolve('@huggingface/transformers')); }
  const {pipeline, env} = TF.pipeline ? TF : TF.default;
  env.allowRemoteModels = false; env.localModelPath = path.join(ROOT, 'models') + '/';
  const asr = await pipeline('automatic-speech-recognition', MODEL, {dtype: {encoder_model: arg('enc', 'fp32'), decoder_model_merged: 'q8'}});
  fs.writeFileSync(OUT, '');
  for (const c of cases) {
    const d = spawnSync('ffmpeg', ['-loglevel', 'error', '-i', path.join(SET, c.file), '-vn', '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], {maxBuffer: 1 << 28});
    const x = new Float32Array(d.stdout.buffer, d.stdout.byteOffset, d.stdout.length >> 2), dur = x.length / 16000;
    let wins = [];
    if (MODE === 'app') {
      if (dur <= 30) wins.push([0, dur]); else { const n = Math.min(4, Math.ceil(dur / 28)); for (let i = 0; i < n; i++) { const a = n === 1 ? 0 : Math.round(i * (dur - 28) / (n - 1)); wins.push([a, 28]); } }
    } else if (MODE === 'multi') {
      // overlapping 12 s windows every 6 s, plus the whole clip (or 28 s windows)
      for (let a = 0; a + 4 <= dur; a += 6) wins.push([a, Math.min(12, dur - a)]);
      if (dur <= 30) wins.push([0, dur]);
    }
    const t0 = Date.now(), res = [];
    for (const [a, len] of wins) {
      const seg = x.subarray(Math.round(a * 16000), Math.round((a + len) * 16000));
      const text = (await asr(seg, {language: 'ar', task: 'transcribe'})).text.trim();
      const p = M.place(text);
      res.push({a, len, text, p: p ? [p.surah, p.ayah, p.surah2, p.ayah2, p.level, p.conf] : null});
    }
    const truth = c.segments.map(s => ({a: s.a, b: s.b, ...truthOf(s, c.title)}));
    fs.appendFileSync(OUT, JSON.stringify({name: c.name, variant: c.variant, title: c.title, dur, mode: MODE + (MODEL === 'whisper-tiny-ar-quran' ? '' : ':' + MODEL.replace('whisper-', '').replace('-ar-quran', '')) + (arg('enc', 'fp32') === 'fp32' ? '' : '-enc' + arg('enc')), ms: Date.now() - t0, wins: res, truth}) + '\n');
    console.log(c.name, res.map(r => r.p ? `${r.p[0]}:${r.p[1]}-${r.p[2]}:${r.p[3]} ${r.p[4]}` : '-').join(' | '), '| truth', truth.map(t => t.p ? `${t.p[0]}:${t.p[1]}-${t.p[2]}:${t.p[3]}` : t.status).join(' '));
  }
}
