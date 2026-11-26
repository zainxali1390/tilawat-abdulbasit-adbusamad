// Archive melody index (Step 9; design §3.1-3.2): melody frames (mf/) and melody hashes (mh/) for every recording.
//   node tools/engine/build_index.mjs part  RECS.json OUTDIR --part K --of N   download, pitch-track, write OUTDIR/part-K.json
//   node tools/engine/build_index.mjs merge RECS.json PARTSDIR                  write mf/ and mh/ (reuses unchanged recordings)
// RECS.json: [{code, url}] (tools/fingerprint/build_index.py list). A recording already in mf/manifest.json with the same
// url is not downloaded again (incremental: only new or changed recordings are processed).
//
// mf/r/XX/<fnv>.bin   one file per recording: its melody, 1 byte per 50 ms frame (MELODY.pack). XX = first 2 hex digits.
// mf/manifest.json    {v, built, build, fps, recs: {code: [fnv hex, frames, url]}, failed: {code: reason}}
// mh/s/HH/LL.bin      melody hashes (MELODY.hashes), sharded by key = hash >> 6: HH = key >> 8, LL = key & 255 (2-hex each).
//                     Layout: 64 × uint32 counts (one list per low 6 bits of the hash), then the lists of uint32 entries
//                     (recording index << 18 | frame), each list sorted.
// mh/manifest.json    {v, built, build, fps, sub: 64, recs: [code, …], entries, hashes}
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
globalThis.window = undefined; await import(path.join(ROOT, 'js/engine/melody.js')); const M = globalThis.MELODY;
const fnv = s => { let h = 0x811c9dc5; for (const b of Buffer.from(s, 'utf8')) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };
const [cmd, RECS, DIR] = process.argv.slice(2);
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? +process.argv[i + 1] : d; };
const recs = JSON.parse(fs.readFileSync(RECS));
/* INDEX_ROOT: where mf/ and mh/ live (default: the repository; tests point it elsewhere) */
const OUTROOT = process.env.INDEX_ROOT || ROOT, MF = path.join(OUTROOT, 'mf'), MH = path.join(OUTROOT, 'mh');
const oldMan = fs.existsSync(path.join(MF, 'manifest.json')) ? JSON.parse(fs.readFileSync(path.join(MF, 'manifest.json'))) : {recs: {}};
const mfPath = id => path.join(MF, 'r', id.slice(0, 2), id + '.bin');

if (cmd === 'part') {
  const K = arg('--part', 0), N = arg('--of', 1), tmp = path.join(os.tmpdir(), 'bi-' + K);
  const mine = recs.filter((r, i) => i % N === K), out = {}, t0 = Date.now();
  let done = 0, reused = 0;
  for (const r of mine) {
    const o = oldMan.recs[r.code];
    if (o && o[2] === r.url && fs.existsSync(mfPath(o[0]))) { reused++; continue; }
    let src = r.url;
    if (/^https?:/.test(src)) { const d = spawnSync('curl', ['-sSL', '--fail', '--retry', '5', '--max-time', '1800', '-o', tmp, src]); if (d.status) { out[r.code] = {err: 'download ' + d.status}; continue; } src = tmp; }
    else if (!path.isAbsolute(src)) src = path.join(ROOT, src);
    const d = spawnSync('ffmpeg', ['-loglevel', 'error', '-i', src, '-vn', '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], {maxBuffer: 1 << 30});
    if (d.status || !d.stdout.length) { out[r.code] = {err: 'decode'}; continue; }
    const mf = M.pack(M.f0(new Float32Array(d.stdout.buffer, d.stdout.byteOffset, d.stdout.length >> 2)));
    out[r.code] = {url: r.url, mf: Buffer.from(mf).toString('base64')};
    done++;
    if (done % 10 === 0) console.log(`${done + reused}/${mine.length}`, Math.round((Date.now() - t0) / 1000) + ' s');
  }
  fs.mkdirSync(DIR, {recursive: true});
  fs.writeFileSync(path.join(DIR, `part-${K}.json`), JSON.stringify(out));
  console.log(`part ${K}: ${done} tracked, ${reused} unchanged, ${Object.values(out).filter(x => x.err).length} failed, ${Math.round((Date.now() - t0) / 1000)} s`);
}

if (cmd === 'merge') {
  const fresh = {};
  for (const f of fs.readdirSync(DIR).filter(f => /^part-\d+\.json$/.test(f))) Object.assign(fresh, JSON.parse(fs.readFileSync(path.join(DIR, f))));
  const man = {v: 1, built: new Date().toISOString().slice(0, 10), fps: M.FPS, recs: {}, failed: {}};
  const contours = [], codes = [];
  const keep = new Set();
  for (const r of recs) {
    const f = fresh[r.code], o = oldMan.recs[r.code];
    let bytes = null, id = fnv(r.code);
    if (f && f.mf) { bytes = Buffer.from(f.mf, 'base64'); fs.mkdirSync(path.dirname(mfPath(id)), {recursive: true}); fs.writeFileSync(mfPath(id), bytes); }
    else if (o && o[2] === r.url && fs.existsSync(mfPath(o[0]))) { id = o[0]; bytes = fs.readFileSync(mfPath(id)); }
    else { man.failed[r.code] = f && f.err || 'not processed'; continue; }
    man.recs[r.code] = [id, bytes.length, r.url]; keep.add(id);
    codes.push(r.code); contours.push(M.unpack(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.length)));
  }
  /* recordings no longer in the list: their files go */
  if (fs.existsSync(path.join(MF, 'r'))) for (const d of fs.readdirSync(path.join(MF, 'r'))) for (const f of fs.readdirSync(path.join(MF, 'r', d))) if (!keep.has(f.replace('.bin', ''))) fs.unlinkSync(path.join(MF, 'r', d, f));
  /* the build id: a hash of the recording list and lengths, so a page never mixes two builds (design §3.5) */
  man.build = fnv(man.built + '|' + codes.map(c => c + '/' + man.recs[c][1]).join('|'));
  fs.mkdirSync(MF, {recursive: true}); fs.writeFileSync(path.join(MF, 'manifest.json'), JSON.stringify(man));
  /* melody hashes */
  const lists = new Map(); let entries = 0;
  contours.forEach((m, ri) => { for (const [h, t] of M.hashes(m)) { let l = lists.get(h); if (!l) lists.set(h, l = []); l.push((ri << 18 | Math.min(t, 262143)) >>> 0); entries++; } });
  fs.rmSync(path.join(MH, 's'), {recursive: true, force: true});
  const shards = new Map();
  for (const [h, l] of lists) { const key = h >>> 6; if (!shards.has(key)) shards.set(key, []); shards.get(key).push([h & 63, l]); }
  let bytes = 0;
  for (const [key, subs] of shards) {
    const counts = new Uint32Array(64), parts = Array.from({length: 64}, () => []);
    for (const [lo, l] of subs) { parts[lo] = l.sort((a, b) => a - b); counts[lo] = l.length; }
    const body = Uint32Array.from(parts.flat()), buf = Buffer.concat([Buffer.from(counts.buffer), Buffer.from(body.buffer)]);
    const p = path.join(MH, 's', (key >> 8).toString(16).padStart(2, '0'), (key & 255).toString(16).padStart(2, '0') + '.bin');
    fs.mkdirSync(path.dirname(p), {recursive: true}); fs.writeFileSync(p, buf); bytes += buf.length;
  }
  fs.mkdirSync(MH, {recursive: true}); fs.writeFileSync(path.join(MH, 'manifest.json'), JSON.stringify({v: 1, built: man.built, build: man.build, fps: M.FPS, sub: 64, recs: codes, entries, hashes: lists.size, shards: shards.size, bytes}));
  const hours = contours.reduce((s, m) => s + m.length, 0) / M.FPS / 3600;
  console.log(`mf: ${codes.length} recordings (${hours.toFixed(1)} h), ${Object.keys(man.failed).length} failed; mh: ${entries} entries, ${lists.size} distinct hashes, ${shards.size} shard files, ${(bytes / 1e6).toFixed(1)} MB`);
}
