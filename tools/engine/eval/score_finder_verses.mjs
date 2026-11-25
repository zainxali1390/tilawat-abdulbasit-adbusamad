// Verses shown by the finder (run_finder.js output) against the content truth of step 4.
//   node score_finder_verses.mjs CASES.json OLD.jsonl NEW.jsonl --truth truth-*.json ...
// Compared on the clips that BOTH versions matched by sound (the verses of a matched clip are recognised after the edit
// found by the match is undone, in the new version), per kind of clip.
import fs from 'node:fs';
import {makeMatcher} from './content_eval.mjs';
const a = process.argv.slice(2), ti = a.indexOf('--truth');
const [CASES, OLD, NEW] = a.slice(0, ti), truthFiles = a.slice(ti + 1);
const M = makeMatcher(), S = M.ctx.SURAHS, first = []; { let n = 0; for (const s of S) { first.push(n); n += s[2]; } }
const lin = (su, ay) => first[su - 1] + ay - 1;
const T = {}; for (const f of truthFiles) for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(f)).texts)) (T[k] = T[k] || []).push(v);
const C = Object.fromEntries(JSON.parse(fs.readFileSync(CASES)).map(c => [c.name, c]));
const truthOf = (c) => { const s = c.segments[0]; const texts = T[`${s.code}|${s.at.toFixed(2)}|${((s.b - s.a) * s.rate).toFixed(2)}`] || []; const ts = M.titleSurahs(c.title);
  const ps = texts.map(t => M.place(t)).filter(p => p && p.level === 'confirmed' && (!ts.length || ts.includes(p.surah) || ts.includes(p.surah2)));
  return ps.length ? {lo: Math.min(...ps.map(p => lin(p.surah, p.ayah))), hi: Math.max(...ps.map(p => lin(p.surah2, p.ayah2)))} : null; };
const load = f => Object.fromEntries(fs.readFileSync(f, 'utf8').trim().split('\n').map(l => JSON.parse(l)).filter(r => !r.hide).map(r => [r.name, r]));
const O = load(OLD), N = load(NEW), rows = {};
for (const [name, n] of Object.entries(N)) {
  const o = O[name], c = C[name]; if (!o || !c || c.segments.length > 1) continue;
  const tr = truthOf(c); if (!tr) continue;
  const top = r => (r.list || []).find(x => x.level === 'confirmed' && (x.code === c.code || (c.copies || []).includes(x.code)));
  const to = top(o), tn = top(n); if (!to || !tn) continue;
  const judge = x => { const v = x.verse; if (!v || v.l !== 'confirmed') return 'none'; const lo = lin(v.s, v.a), hi = lin(v.s2 || v.s, v.a2 || v.a); return lo <= tr.hi + 2 && hi >= tr.lo - 2 ? 'right' : 'WRONG'; };
  const r = rows[c.variant] || (rows[c.variant] = {n: 0, o: {right: 0, WRONG: 0, none: 0}, w: {right: 0, WRONG: 0, none: 0}});
  r.n++; r.o[judge(to)]++; r.w[judge(tn)]++;
}
console.log('variant           n   before: right/WRONG/none   after: right/WRONG/none');
const tot = {n: 0, o: {right: 0, WRONG: 0, none: 0}, w: {right: 0, WRONG: 0, none: 0}};
for (const [v, r] of Object.entries(rows).sort()) { console.log(v.padEnd(16), String(r.n).padStart(2), '  ', `${r.o.right}/${r.o.WRONG}/${r.o.none}`.padStart(14), '           ', `${r.w.right}/${r.w.WRONG}/${r.w.none}`.padStart(10));
  tot.n += r.n; for (const k of ['right', 'WRONG', 'none']) { tot.o[k] += r.o[k]; tot.w[k] += r.w[k]; } }
console.log(`TOTAL ${tot.n} clips matched by both with truth: before ${JSON.stringify(tot.o)}, after ${JSON.stringify(tot.w)}`);
