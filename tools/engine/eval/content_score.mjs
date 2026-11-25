// Score the Quran-content test.   node content_score.mjs PRED.jsonl... --truth truth-*.json...
// Truth per clip part: the CLEAN original stretch's transcript (large model), placed with the app's matcher, used only when
// confirmed and consistent with the recording's title. Prediction per clip: the confirmed window with the highest
// confidence, else the best "possible" one (as the app shows it).
//   surah right: the predicted range and the true range share a surah, and overlap
//   ayah right:  the predicted start is within 2 ayahs of a true ayah (start of the clip within the true range ± 2)
import fs from 'node:fs';
import {makeMatcher} from './content_eval.mjs';
const files = [], truthFiles = [];
for (let i = 2, t = false; i < process.argv.length; i++) { if (process.argv[i] === '--truth') { t = true; continue; } (t ? truthFiles : files).push(process.argv[i]); }
const M = makeMatcher(), S = M.ctx.SURAHS, first = [];
{ let n = 0; for (const s of S) { first.push(n); n += s[2]; } }
const lin = (su, ay) => first[su - 1] + ay - 1;
const T = {}; let model = '';
for (const f of truthFiles) { const j = JSON.parse(fs.readFileSync(f)); Object.assign(T, j.texts); model = j.model; }
const truthOf = (seg, title) => {
  const text = T[`${seg.code}|${seg.at.toFixed(2)}|${((seg.b - seg.a) * seg.rate).toFixed(2)}`];
  if (text == null) return {st: 'missing'};
  const p = M.place(text);
  if (!p || p.level !== 'confirmed') return {st: 'unplaced'};
  const ts = M.titleSurahs(title);
  if (ts.length && !ts.includes(p.surah) && !ts.includes(p.surah2)) return {st: 'title'};
  return {st: 'ok', lo: lin(p.surah, p.ayah), hi: lin(p.surah2, p.ayah2), su: [p.surah, p.surah2], txt: `${p.surah}:${p.ayah}-${p.surah2}:${p.ayah2}`};
};
const cases = Object.fromEntries(JSON.parse(fs.readFileSync(process.argv.find(a => a.endsWith('cases.json')) || 'cases.json')).map(c => [c.name, c]));
const rows = {}, bad = [], tstat = {};
for (const f of files) for (const line of fs.readFileSync(f, 'utf8').trim().split('\n')) {
  const r = JSON.parse(line), c = cases[r.name]; if (!c) continue;
  const tr = c.segments.map(s => truthOf(s, c.title));
  for (const t of tr) tstat[t.st] = (tstat[t.st] || 0) + 1;
  const ok = tr.filter(t => t.st === 'ok');
  const key = r.mode + ' ' + r.variant, row = rows[key] || (rows[key] = {n: 0, cr: 0, cw: 0, pr: 0, pw: 0, none: 0, ayah: 0, notruth: 0, ms: []});
  if (!ok.length) { row.notruth++; continue; }
  row.n++; row.ms.push(r.ms);
  const ws = r.wins.filter(w => w.p);
  const conf = ws.filter(w => w.p[4] === 'confirmed').sort((a, b) => b.p[5] - a.p[5]);
  const best = conf[0] || ws.filter(w => w.p[4] === 'possible').sort((a, b) => b.p[5] - a.p[5])[0];
  if (!best) { row.none++; continue; }
  const [su, ay, su2, ay2, lvl] = best.p, plo = lin(su, ay), phi = lin(su2, ay2);
  const right = ok.some(t => plo <= t.hi + 2 && phi >= t.lo - 2 && (t.su.includes(su) || t.su.includes(su2)));
  const ayah = ok.some(t => plo >= t.lo - 2 && plo <= t.hi + 2);
  if (lvl === 'confirmed') right ? row.cr++ : row.cw++; else right ? row.pr++ : row.pw++;
  if (right && ayah) row.ayah++;
  if (!right && lvl === 'confirmed') bad.push([r.name, r.mode, `${su}:${ay}-${su2}:${ay2}`, ok.map(t => t.txt).join(' / ')]);
}
console.log('truth model', model, '| truth per clip part:', tstat);
console.log('%s', 'mode variant'.padEnd(22) + ' n  conf-right conf-WRONG poss-right poss-wrong none  ayah±2  sec');
const tot = {};
for (const [k, r] of Object.entries(rows).sort()) {
  const m = k.split(' ')[0]; const t = tot[m] || (tot[m] = {n: 0, cr: 0, cw: 0, pr: 0, pw: 0, none: 0, ayah: 0});
  for (const x of ['n', 'cr', 'cw', 'pr', 'pw', 'none', 'ayah']) t[x] += r[x];
  const med = r.ms.sort((a, b) => a - b)[r.ms.length >> 1] / 1000;
  console.log(k.padEnd(22), String(r.n).padStart(2), String(r.cr).padStart(10), String(r.cw).padStart(10), String(r.pr).padStart(10), String(r.pw).padStart(10), String(r.none).padStart(5), String(r.ayah).padStart(7), (med || 0).toFixed(1).padStart(5));
}
for (const [m, t] of Object.entries(tot)) console.log(`TOTAL ${m}: ${t.n} clips with truth; surah right & confirmed ${t.cr}, confirmed but WRONG ${t.cw}, possible right ${t.pr}, possible wrong ${t.pw}, nothing ${t.none}; right surah and start ayah ±2: ${t.ayah}`);
for (const b of bad) console.log('   x', b.join(' | '));
