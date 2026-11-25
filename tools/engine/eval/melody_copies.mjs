// Same performance or not, by melody (not affected by tape speed, unlike the landmark check): 40 s windows of recording A
// every 60 s are matched into recording B; the pair is the same performance when most windows land on ONE straight time
// line (time in B = k·time in A + b, 0.85 <= k <= 1.18, within 1.5 s) with a good melody score.
//   node melody_copies.mjs PAIRS.json OUT.json        PAIRS: [[codeA, urlA, codeB, urlB, why], ...]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
globalThis.window = undefined; await import(path.join(ROOT, 'js/engine/melody.js')); const M = globalThis.MELODY;
const [PAIRS, OUT] = process.argv.slice(2), cache = {}, tmp = path.join(os.tmpdir(), 'mc-a');
const contour = (code, url) => {
  if (cache[code]) return cache[code];
  const d0 = spawnSync('curl', ['-sSL', '--fail', '--retry', '5', '-o', tmp, url]); if (d0.status) return null;
  const d = spawnSync('ffmpeg', ['-loglevel', 'error', '-i', tmp, '-vn', '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], {maxBuffer: 1 << 31});
  return cache[code] = M.unpack(M.pack(M.f0(new Float32Array(d.stdout.buffer, d.stdout.byteOffset, d.stdout.length >> 2))));
};
const out = [];
for (const [a, ua, b, ub, why] of JSON.parse(fs.readFileSync(PAIRS))) {
  const A = contour(a, ua), B = contour(b, ub); if (!A || !B) { out.push({a, b, why, err: 'download'}); continue; }
  const F = M.FPS, W = 40 * F, pts = [];
  for (let s = 0; s + W <= A.length; s += 60 * F) {
    const q = A.subarray(s, s + W); if (q.filter(v => !isNaN(v)).length < 0.3 * W) continue;
    const r = M.match(q, B, {refine: false}); pts.push({ta: s / F, tb: r.at, k: r.k, score: r.score});
  }
  let best = [];
  for (const p of pts) for (const q of pts) { if (q.ta - p.ta < 60) continue; const k = (q.tb - p.tb) / (q.ta - p.ta); if (k < 0.85 || k > 1.18) continue;
    const inl = pts.filter(x => x.score >= 0.6 && Math.abs(x.tb - (p.tb + k * (x.ta - p.ta))) < 1.5); if (inl.length > best.length) best = inl; }
  const share = pts.length ? best.length / pts.length : 0, span = best.length ? best[best.length - 1].ta - best[0].ta : 0;
  const same = best.length >= 3 && share >= 0.5 && span >= 180;
  out.push({a, b, why, windows: pts.length, onLine: best.length, share: +share.toFixed(2), span: Math.round(span), same,
    k: best.length >= 2 ? +((best[best.length - 1].tb - best[0].tb) / (best[best.length - 1].ta - best[0].ta)).toFixed(4) : null});
  console.log(same ? 'SAME' : 'not ', a.slice(0, 35), '|', b.slice(0, 35), pts.length, 'windows,', best.length, 'on one line, span', Math.round(span), 's');
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
