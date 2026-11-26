// Is a hidden-run confirmation a copy of the clip's passage? (Step 6.) The whole-recording copy check
// (melody_copies.mjs) can miss a recording that holds only part of the other (a compilation, a cut tape), so this looks
// only at the clip's own neighbourhood: 20 s windows of the original, every 10 s, from 2 min before the clip to 2 min
// after it, are matched by melody into recording B. The same performance puts most windows on ONE straight time line
// (0.85 <= k <= 1.18, within 1.5 s), and that line passes through the place the landmark search reported. A different
// performance of the same verses scatters them. Controls: the same test on pairs known to be different performances
// (a region in the middle of A).
//   node melody_local.mjs CASES.json OUT.json
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
globalThis.window = undefined; await import(path.join(ROOT, 'js/engine/melody.js')); const M = globalThis.MELODY;
const [CASES, OUT] = process.argv.slice(2), cache = {}, tmp = path.join(os.tmpdir(), 'ml-a');
const contour = (code, url) => {
  if (cache[code]) return cache[code];
  let src = tmp;
  if (/^https?:/.test(url)) { const d0 = spawnSync('curl', ['-sSL', '--fail', '--retry', '5', '-o', tmp, url]); if (d0.status) return null; }
  else src = path.join(ROOT, decodeURIComponent(url));   // recordings kept in the repository (audio/)
  const d = spawnSync('ffmpeg', ['-loglevel', 'error', '-i', src, '-vn', '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], {maxBuffer: 1 << 30});
  return cache[code] = M.unpack(M.pack(M.f0(new Float32Array(d.stdout.buffer, d.stdout.byteOffset, d.stdout.length >> 2))));
};
const F = M.FPS, W = 20 * F, out = [];
for (const c of JSON.parse(fs.readFileSync(CASES))) {
  const A = contour(c.a, c.ua), B = contour(c.b, c.ub); if (!A || !B) { out.push({...c, err: 'download'}); continue; }
  const durA = A.length / F;
  /* the clip's passage in A (first segment from the original), or the middle of A for a control */
  const g = c.segs && c.segs[0], from = g ? g.at : durA / 2 - 10, to = g ? g.at + g.len * g.rate : durA / 2 + 10;
  const pts = [];
  for (let t = Math.max(0, from - 120); t + 20 <= Math.min(durA, to + 120); t += 10) {
    const q = A.subarray(Math.round(t * F), Math.round(t * F) + W); if (q.filter(v => !isNaN(v)).length < 0.3 * W) continue;
    const r = M.match(q, B, {refine: true}); pts.push({ta: t, tb: r.at, k: r.k, score: r.score});
  }
  let best = [], bk = null;
  for (const p of pts) for (const q of pts) { if (q.ta - p.ta < 30) continue; const k = (q.tb - p.tb) / (q.ta - p.ta); if (k < 0.85 || k > 1.18) continue;
    const inl = pts.filter(x => x.score >= 0.6 && Math.abs(x.tb - (p.tb + k * (x.ta - p.ta))) < 1.5);
    if (inl.length > best.length) { best = inl; bk = {k, p}; } }
  /* where the line puts the clip's start in B, against the landmark search's place */
  const pred = bk ? bk.p.tb + bk.k * (from - bk.p.ta) : null;
  const res = {name: c.name, kind: c.kind, a: c.a, b: c.b, windows: pts.length, onLine: best.length,
    share: pts.length ? +(best.length / pts.length).toFixed(2) : 0, k: bk ? +bk.k.toFixed(4) : null,
    predicted: pred == null ? null : +pred.toFixed(1), landmark: c.fpos == null ? null : +c.fpos.toFixed(1),
    meanScore: best.length ? +(best.reduce((s, x) => s + x.score, 0) / best.length).toFixed(3) : null};
  res.agrees = res.landmark != null && res.predicted != null && Math.abs(res.predicted - res.landmark) < 2;
  out.push(res);
  console.log(c.kind.padEnd(7), c.name.padEnd(20), c.b.slice(0, 32).padEnd(32), `${res.onLine}/${res.windows} on one line, k ${res.k},`,
    `clip at ${res.predicted} (search said ${res.landmark})`, res.agrees ? 'AGREES' : '');
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
