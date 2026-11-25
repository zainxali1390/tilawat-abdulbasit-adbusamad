// Melody store (pilot): each recording's pitch contour with js/engine/melody.js (the same code the app runs on clips).
//   node build_melody.mjs LIST.json OUT.json [--part K --of N]        LIST: [{code, url}]
// OUT: {code: {dur, mf: base64 of 1 byte per 50 ms frame}}  (docs/RECOGNITION-DESIGN.md §3.1; the full archive in step 9)
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
globalThis.window = undefined; await import(path.join(ROOT, 'js/engine/melody.js')); const M = globalThis.MELODY;
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const [LIST, OUT] = process.argv.slice(2), K = +arg('part', 0), N = +arg('of', 1);
const lst = JSON.parse(fs.readFileSync(LIST)).filter((_, i) => i % N === K), out = {}, tmp = path.join(os.tmpdir(), 'mf-a');
for (const r of lst) {
  const t0 = Date.now();
  let src = r.url;
  if (/^https?:/.test(src)) { const d = spawnSync('curl', ['-sSL', '--fail', '--retry', '5', '-o', tmp, src]); if (d.status) { console.log('download failed', r.code); continue; } src = tmp; }
  const d = spawnSync('ffmpeg', ['-loglevel', 'error', '-i', src, '-vn', '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], {maxBuffer: 1 << 31});
  if (d.status) { console.log('decode failed', r.code); continue; }
  const x = new Float32Array(d.stdout.buffer, d.stdout.byteOffset, d.stdout.length >> 2);
  const mf = M.pack(M.f0(x));
  out[r.code] = {dur: +(x.length / 16000).toFixed(1), mf: Buffer.from(mf).toString('base64')};
  console.log(r.code.slice(0, 50), Math.round(x.length / 16000), 's', Date.now() - t0, 'ms', 'voiced', (mf.filter(v => v).length / mf.length).toFixed(2));
}
fs.writeFileSync(OUT, JSON.stringify(out));
