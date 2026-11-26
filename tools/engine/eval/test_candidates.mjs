// Step 8 functional tests: js/engine/candidates.js and the melody hashes (pure functions, Node).
//   node test_candidates.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
globalThis.window = undefined;
await import(path.join(ROOT, 'js/engine/candidates.js')); await import(path.join(ROOT, 'js/engine/melody.js'));
const C = globalThis.CAND, M = globalThis.MELODY;
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

/* landmarks: the best vote per recording over every search and block, in the runner's form and in finderSearch's form */
const lm = C.landmarks([{mode: 'r', f: 1, blocks: [{t0: 0, c: [['A', 5, 2, 100], ['B', 4, 2, 50]]}]},
                        {mode: 'p', f: 2, blocks: [{t0: 0, c: [['B', 9, 3, 51], ['C', 3, 1, 10]]}]}]);
ok(lm.map(x => x.code).join() === 'B,A,C' && lm[0].mode === 'p' && lm[0].t === 51, 'landmarks: best vote per recording across searches (B from the pitch search first)');
const lm2 = C.landmarks([{man: {recs: [['X', 1], ['Y', 2]]}, blocks: [{c: [{rec: 1, off: 100, s: 7, sp: 3}]}]}], 0.032);
ok(lm2[0].code === 'Y' && Math.abs(lm2[0].t - 3.2) < 1e-9, 'landmarks: finderSearch result form (rec index, frame offset)');

/* verses: from the real vi/ index. Surah 55 (Ar-Rahman) ayah 13 is heard in many recordings */
const vi = s => JSON.parse(fs.readFileSync(path.join(ROOT, 'vi', String(s).padStart(3, '0') + '.json')));
const v55 = vi(55), vs = C.verses([{su: 55, ay: 13, su2: 55, ay2: 13, level: 'confirmed'}], s => s === 55 ? v55 : null, 2);
ok(vs.length > 20, `verses: Ar-Rahman 55:13 lists ${vs.length} recordings`);
ok(vs.every((x, i) => i === 0 || vs[i - 1].k <= x.k), 'verses: nearer and surer windows first');
ok(vs[0].d === 0 && vs.every(x => x.d <= 2), 'verses: the exact ayah first, none further than 2 ayat');
ok(C.verses([{su: 200, ay: 1, su2: 200, ay2: 1}], () => null).length === 0, 'verses: an unknown surah gives nothing');

/* fusion */
const F = C.fuse({lm: [{code: 'A', t: 10}, {code: 'B', t: 300}], verse: [{code: 'B', t: 320}, {code: 'D', t: 5}], mel: [{code: 'E', t: 1}]}, {K: 30});
ok(F[0].code === 'B' && F[0].agree && F[0].t === 300, 'fuse: a recording two sources put at the same time comes first, with the landmark time');
ok(F.length === 4 && new Set(F.map(x => x.code)).size === 4, 'fuse: one entry per recording');
ok(C.fuse({lm: Array.from({length: 50}, (_, i) => ({code: 'r' + i, t: 0}))}, {K: 30}).length === 30, 'fuse: at most K entries');
const F2 = C.fuse({lm: [{code: 'A', t: 10}], verse: [{code: 'A', t: 900}]}, {K: 30});
ok(!F2[0].agree, 'fuse: two sources far apart in time do not get the agreement bonus');

/* melody hashes: key and tempo do not change them; a different tune shares few */
const tune = n => Float32Array.from({length: n}, (_, i) => 60 + 3 * Math.sin(i / 9) + 1.5 * Math.sin(i / 23));
const a = M.hashes(tune(600)).map(x => x[0]);
const shifted = M.hashes(Float32Array.from(tune(600), v => v + 3)).map(x => x[0]);
ok(shifted.filter(h => a.includes(h)).length >= 0.9 * shifted.length, 'hashes: +3 semitones keeps the hashes');
const slow = Float32Array.from({length: 720}, (_, i) => tune(600)[Math.min(599, Math.round(i / 1.2))]);
const hs = M.hashes(slow).map(x => x[0]);
ok(hs.filter(h => a.includes(h)).length >= 0.6 * hs.length, `hashes: 1.2x slower keeps most (${hs.filter(h => a.includes(h)).length}/${hs.length})`);
const other = M.hashes(Float32Array.from({length: 600}, (_, i) => 60 + 4 * Math.sin(i / 5) * Math.cos(i / 37))).map(x => x[0]);
ok(other.filter(h => a.includes(h)).length < 0.2 * other.length, 'hashes: a different tune shares few');
/* vote: the clip cut from recording 1 at 10 s, slowed 1.1x, is found there with tempo ~1/1.1 */
/* non-repeating melodies: smoothed random walks (seeded), like recitation phrases rather than periodic tones */
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const walk = n => { const o = new Float32Array(n); let v = 60, d = 0; for (let i = 0; i < n; i++) { d = 0.9 * d + (rnd() - 0.5) * 0.6; v += d; v += (60 - v) * 0.02; o[i] = v; } return o; };
const recs = [walk(4000), walk(4000), walk(4000)];
const idx = M.hashIndex(recs), clip = Float32Array.from({length: 330}, (_, i) => recs[1][200 + Math.round(i / 1.1)]);
const r = M.hashVote(clip, h => idx.get(h));
ok(r.list[0] && r.list[0].rec === 1 && Math.abs(r.list[0].t - 10) < 1 && Math.abs(r.list[0].k - 1 / 1.1) < 0.05, 'hashVote: right recording, place and tempo ' + JSON.stringify(r.list[0]));
ok(M.hashVote(new Float32Array(300).fill(NaN), h => idx.get(h)).list.length === 0, 'hashVote: no voice, no candidates');
console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
