// Step 12: confidence levels measured. js/engine/verify.js is applied to every run of the in-page test (run_exact.js:
// the shortlist with each recording's evidence, and the app finder's own results), original present and hidden.
//   node verify_eval.mjs EXACT.jsonl.gz [--grid]
// Present runs: per level, the answer's recording is right (the original or a copy) or wrong.
// Hidden runs (original and its copies removed): any answer other than "none" names a wrong recording, unless that
// recording is a copy found since (Step 10 copy groups, and the pairs the passage check proved directly).
// Precision of a level = right / (right + wrong in present runs + wrong in hidden runs).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..', '..', '..');
globalThis.window = undefined; await import(path.join(ROOT, 'js/engine/verify.js')); const V = globalThis.VERIFY;
const F = process.argv[2], GRID = process.argv.includes('--grid');
const rows = zlib.gunzipSync(fs.readFileSync(F)).toString().split('\n').filter(Boolean).map(JSON.parse).filter(r => !r.error);
const groups = JSON.parse(fs.readFileSync(path.join(path.dirname(F), 'copy-groups-step10.json'))).groups.map(g => new Set(g));
const direct = new Set();
for (const r of JSON.parse(fs.readFileSync(path.join(HERE, 'results/melody-local-20261126-1918/local.json'))))
  if (r.kind === 'hidden' && r.agrees && r.onLine >= 3) { direct.add(r.a + '|' + r.b); direct.add(r.b + '|' + r.a); }
const step6 = JSON.parse(fs.readFileSync(path.join(HERE, 'results/melody-local-20261125-2236/copy-groups.json'))).groups.map(g => new Set(g));
/* two ways of counting copies: "chained" (all groups joined) and "direct" (Step 6 groups + pairs checked directly) */
const sameChained = (a, b) => a === b || groups.some(g => g.has(a) && g.has(b));
const sameDirect = (a, b, src) => a === b || step6.some(g => g.has(a) && g.has(b)) || direct.has(a + '|' + b) || direct.has(src + '|' + b);
const LV = ['confirmed', 'high', 'possible', 'none'];
function run(rules, same) {
  const T = Object.fromEntries(LV.map(l => [l, {right: 0, wrong: 0, hidden: 0, tsOk: 0}]));
  const finder = {confirmed: {right: 0, wrong: 0, hidden: 0}, high: {right: 0, wrong: 0, hidden: 0}, possible: {right: 0, wrong: 0, hidden: 0}, none: {right: 0, wrong: 0, hidden: 0}};
  const bad = [];
  for (const r of rows) {
    const truth = [...new Set([...r.segments.map(g => g.code), ...(r.copies || [])])], src = r.segments[0].code;
    const ok = c => truth.some(t => same(c, t, t));   // a copy of ANY part of the clip (joined clips have two or three)
    const d = V.decide(r.list, r.finder, {rules});
    const f = (r.finder || [])[0], fl = f && f.level in finder ? f.level : 'none';
    if (!r.hide) {
      if (d.level !== 'none') { const right = ok(d.top.code); T[d.level][right ? 'right' : 'wrong']++;
        if (right) { const g = r.segments.filter(s => s.code === d.top.code); if (g.length) { T[d.level].own = (T[d.level].own || 0) + 1; if (d.top.ts && g.some(s => Math.abs(d.top.ts.start - s.at) <= 0.5)) T[d.level].tsOk++; } }
        if (!right && d.level !== 'possible') bad.push(['present', r.name, d.level, d.top.code.slice(0, 50)]); }
      else T.none.right++;   // "none" on a present run: a miss (counted under none.right as "runs")
      if (f) finder[fl][ok(f.code) ? 'right' : 'wrong']++; else finder.none.right++;
    } else {
      if (d.level !== 'none' && !ok(d.top.code)) { T[d.level].hidden++; if (d.level !== 'possible') bad.push(['hidden', r.name, d.level, d.top.code.slice(0, 50), d.top.evidence.lm.inl]); }
      if (f && f.level && !ok(f.code)) finder[fl].hidden++;
    }
  }
  return {T, finder, bad};
}
const show = (name, res) => {
  const {T} = res; let cum = 0;
  console.log(`\n${name}`);
  console.log('  level        right  wrong(present)  wrong(hidden)  precision   start within 0.5 s (answers naming the clip\'s own recording; a copy\'s true times are unknown)');
  for (const l of LV.slice(0, 3)) { const t = T[l]; cum += t.right; const p = t.right / Math.max(1, t.right + t.wrong + t.hidden);
    console.log(`  ${l.padEnd(11)} ${String(t.right).padStart(6)} ${String(t.wrong).padStart(10)} ${String(t.hidden).padStart(14)} ${(100 * p).toFixed(1).padStart(10)} %   ${t.tsOk}/${t.own || 0}`); }
  console.log(`  no reliable match on ${T.none.right} of the present runs; right at "high" or better: ${T.confirmed.right + T.high.right}; at any level: ${cum}`);
};
for (const [name, same] of [['copies chained', sameChained], ['copies checked directly only', sameDirect]]) {
  const res = run(V.RULES, same); show(`ENGINE, rules ${JSON.stringify(V.RULES)}, ${name}`, res);
  if (name === 'copies chained') {
    const f = res.finder; console.log(`  the app's answer (finder field; from Step 14 on it includes the engine): high right ${f.high.right}, wrong ${f.high.wrong}, hidden ${f.high.hidden}; confirmed right ${f.confirmed.right}, wrong ${f.confirmed.wrong}, hidden ${f.confirmed.hidden}; possible right ${f.possible.right}, wrong ${f.possible.wrong}, hidden ${f.possible.hidden}; nothing ${f.none.right}`);
  }
  if (res.bad.length) console.log('  confirmed/high answers that are wrong:', JSON.stringify(res.bad.slice(0, 12)));
}
if (GRID) {
  console.log('\ngrid (copies checked directly only): confirmInl highInl possibleMel → confirmed right/false, high right/false, possible right/false');
  for (const ci of [5, 6, 7, 8]) for (const hi of [3, 4, 5]) for (const pm of [0.75, 0.8, 0.85]) {
    if (hi > ci) continue;
    const {T} = run({...V.RULES, confirmInl: ci, highInl: hi, possibleMel: pm}, sameDirect);
    console.log(`  ${ci} ${hi} ${pm}  →  ${T.confirmed.right}/${T.confirmed.wrong + T.confirmed.hidden}  ${T.high.right}/${T.high.wrong + T.high.hidden}  ${T.possible.right}/${T.possible.wrong + T.possible.hidden}`);
  }
}
