// Melody matching test: every test clip against every recording of the pilot melody store.
//   node melody_eval.mjs SETDIR OUT.jsonl store-*.json [--part K --of N]
// Per clip: the true recording's score and place, and the 5 best recordings (code, score, place, tempo, key shift).
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
globalThis.window = undefined; await import(path.join(ROOT, 'js/engine/melody.js')); const M = globalThis.MELODY;
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const SET = process.argv[2], OUT = process.argv[3], K = +arg('part', 0), N = +arg('of', 1);
const stores = process.argv.slice(4).filter(a => a.endsWith('.json'));
const refs = {}; for (const f of stores) for (const [c, v] of Object.entries(JSON.parse(fs.readFileSync(f)))) refs[c] = M.unpack(new Uint8Array(Buffer.from(v.mf, 'base64')));
const cases = JSON.parse(fs.readFileSync(path.join(SET, 'cases.json'))).filter((_, i) => i % N === K);
fs.writeFileSync(OUT, '');
for (const c of cases) {
  const d = spawnSync('ffmpeg', ['-loglevel', 'error', '-i', path.join(SET, c.file), '-vn', '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], {maxBuffer: 1 << 28});
  const x = new Float32Array(d.stdout.buffer, d.stdout.byteOffset, d.stdout.length >> 2);
  const t0 = Date.now(), qs = [M.f0(x), M.f0(x, {filter: false})];
  const res = [];
  for (const [code, ref] of Object.entries(refs)) {
    let best = {score: -1};
    for (const q of qs) { const r = M.match(q, ref, {refine: false}); if (r.score > best.score) best = {...r, q}; }
    res.push({code, ...best});
  }
  res.sort((a, b) => b.score - a.score);
  for (const r of res.slice(0, 3)) if (r.score > 0) { const f = M.match(r.q, refs[r.code]); if (f.score >= r.score) Object.assign(r, f); }
  res.sort((a, b) => b.score - a.score);
  const strip = r => ({code: r.code, score: +r.score.toFixed(3), at: r.at == null ? null : +r.at.toFixed(2), k: r.k && +r.k.toFixed(3), shift: r.shift && +r.shift.toFixed(2)});
  const tr = res.find(r => r.code === c.code);
  fs.appendFileSync(OUT, JSON.stringify({name: c.name, variant: c.variant, code: c.code, copies: c.copies, segments: c.segments, intro: c.intro,
    ms: Date.now() - t0, truth: tr ? strip(tr) : null, top: res.slice(0, 5).map(strip)}) + '\n');
  console.log(c.name, 'true', tr && tr.score.toFixed(3), 'top', res[0].code.slice(0, 30), res[0].score.toFixed(3), Date.now() - t0, 'ms');
}
