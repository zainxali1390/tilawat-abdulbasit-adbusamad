// Clip-quality estimators (js/engine/features.js) on the test set: each edited clip against the clean clip of the same
// source recording, and the detection of phone band, noise, echo/reverb and distortion.
//   node test_transforms.mjs SETDIR
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
globalThis.window = undefined;
await import(path.join(ROOT, 'js/engine/features.js'));
const SET = process.argv[2];
const cases = JSON.parse(fs.readFileSync(path.join(SET, 'cases.json')));
const pcm = f => { const d = spawnSync('ffmpeg', ['-loglevel', 'error', '-i', path.join(SET, f), '-vn', '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], {maxBuffer: 1 << 28}); return new Float32Array(d.stdout.buffer, d.stdout.byteOffset, d.stdout.length >> 2); };
const want = {'very noisy': ['noise3', 'combo2'], distorted: ['distort']};
const rows = {}, conf = {};
for (const c of cases) {
  if (c.variant.startsWith('join') || c.variant.startsWith('intro')) continue;
  const r = globalThis.ENGINE.transforms(pcm(c.file));
  (rows[c.variant] = rows[c.variant] || []).push(r);
  for (const [lab, vs] of Object.entries(want)) {
    const k = conf[lab] || (conf[lab] = {tp: 0, fn: 0, fp: 0, tn: 0});
    const has = r.labels.includes(lab), should = vs.includes(c.variant);
    if (should && has) k.tp++; else if (should) k.fn++; else if (has) k.fp++; else k.tn++;
  }
}
const med = (a, f) => { const v = a.map(f).filter(x => x != null).sort((x, y) => x - y); return v.length ? v[v.length >> 1] : null; };
console.log('variant          band(lo-hi Hz)   snr dB  reverb ms  echo  clip%   labels (share of clips)');
for (const [v, rs] of Object.entries(rows)) {
  const labs = {}; for (const r of rs) for (const l of r.labels) labs[l] = (labs[l] || 0) + 1;
  console.log(v.padEnd(16), `${med(rs, r => r.band[0])}-${med(rs, r => r.band[1])}`.padEnd(16), String(med(rs, r => r.snr)).padStart(6), String(med(rs, r => r.reverb)).padStart(9), String(med(rs, r => r.echo)).padStart(5),
    (100 * med(rs, r => r.clip)).toFixed(2).padStart(6), ' ', Object.entries(labs).map(([l, n]) => `${l} ${n}/${rs.length}`).join(', '));
}
for (const [l, k] of Object.entries(conf)) console.log(`${l}: detected ${k.tp}/${k.tp + k.fn} of the clips with it; wrongly on ${k.fp}/${k.fp + k.tn} of the others`);
