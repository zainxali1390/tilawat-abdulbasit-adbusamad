// Step 8 test: is the right recording (or a copy of it) in the candidate short list, and how high?
//   node cand_eval.mjs FINDER_CAND.jsonl [PRED_GLOB_DIR] [MELODY_CANDS.jsonl]
// FINDER_CAND.jsonl: run_finder.js output with "cands" (every landmark search's vote candidates), original present and
// hidden. Verse places: the shipped speech model's predictions from Step 4 (results/content-…/pred-base-q8-*.jsonl).
// Copies: the clip's own copies, plus the copy groups measured in Step 6.
// Reports, for clips the landmark search did NOT confirm (the ones narrowing is for) and for all clips:
//   recall@K of each source alone and fused, the rank of the right recording, and in hidden runs how often the list's
//   first entry is a wrong recording (what the next stages must reject).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..', '..', '..');
globalThis.window = undefined; await import(path.join(ROOT, 'js/engine/candidates.js')); const C = globalThis.CAND;
const [FIN, PRED = path.join(HERE, 'results/content-20261125-1854-c937226'), MEL] = process.argv.slice(2);
const read = f => (f.endsWith('.gz') ? zlib.gunzipSync(fs.readFileSync(f)).toString() : fs.readFileSync(f, 'utf8')).split('\n').filter(Boolean).map(JSON.parse);
const rows = read(FIN);
const groups = JSON.parse(fs.readFileSync(path.join(HERE, 'results/melody-local-20261125-2236/copy-groups.json'))).groups.map(g => new Set(g));
const same = (a, b) => a === b || groups.some(g => g.has(a) && g.has(b));
const preds = {};
for (const f of fs.readdirSync(PRED).filter(f => f.startsWith('pred-base-q8-'))) for (const r of read(path.join(PRED, f))) preds[r.name] = r;
/* MELMIN / MELTOP: keep only melody candidates whose alignment score reaches MELMIN, at most MELTOP of them */
const MELMIN = +(process.env.MELMIN || 0), MELTOP = +(process.env.MELTOP || 30);   // (CAND.melody applies the shipped minimum on top)
const melc = MEL ? Object.fromEntries(read(MEL).map(r => [r.name + (r.hide ? '|h' : ''), r.list.filter(x => x.score >= MELMIN).slice(0, MELTOP)])) : {};
const vi = {}; const getSurah = su => vi[su] ??= (() => { const f = path.join(ROOT, 'vi', String(su).padStart(3, '0') + '.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : null; })();
const places = name => (preds[name]?.wins || []).filter(w => w.p).map(w => ({su: w.p[0], ay: w.p[1], su2: w.p[2], ay2: w.p[3], level: w.p[4]}));
const truthOf = r => [...new Set([...r.segments.map(g => g.code), ...(r.copies || [])])];
const confirmedRight = r => { const t = r.list.find(x => x.level === 'confirmed'); return t && truthOf(r).some(y => same(t.code, y)); };
const rankIn = (list, truth, hidden) => { const i = list.findIndex(x => truth.some(y => same(x.code, y)) && !(hidden && hidden.has(x.code))); return i; };
const configs = [
  ['landmarks only', l => l.lm.slice(0, 30)],
  ['verses only', l => l.verse.slice(0, 30)],
  ...(MEL ? [['melody only', l => l.mel.slice(0, 30)]] : []),
  ['fused (equal weights)', l => C.fuse(l, {K: 30})],
  ['fused, landmarks x2', l => C.fuse(l, {K: 30, w: {lm: 2, verse: 1, mel: 1}})],
  ['fused, no agreement bonus', l => C.fuse(l, {K: 30, bonus: 0})],
  ['fused, K=10', l => C.fuse(l, {K: 10})],
];
const stat = {}, add = (k, v) => { (stat[k] ||= []).push(v); };
const byVariant = {};
for (const r of rows) {
  if (!r.cands) continue;
  const truth = truthOf(r), hidden = r.hide ? new Set(truth) : null;
  const lists = {lm: C.landmarks(r.cands), verse: C.verses(places(r.name), getSurah, 2), mel: C.melody(melc[r.name + (r.hide ? '|h' : '')], process.env.MELMIN ? 0 : undefined)};
  if (hidden) for (const k of Object.keys(lists)) lists[k] = lists[k].filter(x => !truth.some(y => same(x.code, y)));
  const group = r.hide ? 'hidden' : (confirmedRight(r) ? 'confirmed' : 'not confirmed');
  for (const [name, f] of configs) {
    const L = f(lists);
    if (!r.hide) { const i = rankIn(L, truth); add(group + '|' + name, i); add('all|' + name, i);
      if (group === 'not confirmed' && name === 'fused (equal weights)') (byVariant[r.variant] ||= []).push(i); }
    else add('hidden|' + name, L.length);
  }
}
const pct = (a, f) => a.filter(f).length;
for (const group of ['not confirmed', 'all']) {
  const n = stat[group + '|landmarks only']?.length || 0;
  console.log(`\n${group === 'all' ? 'ALL clips' : 'Clips the landmark search did not confirm (right)'}: ${n}`);
  console.log('  ' + 'source'.padEnd(28) + 'top1  top5 top10 top30   median rank');
  for (const [name] of configs) { const a = stat[group + '|' + name] || []; const ok = a.filter(i => i >= 0).sort((x, y) => x - y);
    console.log('  ' + name.padEnd(28) + [1, 5, 10, 30].map(k => String(pct(a, i => i >= 0 && i < k)).padStart(5)).join(' ') + '   ' + (ok.length ? ok[ok.length >> 1] + 1 : '-')); }
}
console.log('\nnot confirmed, fused: right recording in the list, by edit: ' + Object.entries(byVariant).sort().map(([v, a]) => `${v} ${pct(a, i => i >= 0)}/${a.length}`).join(', '));
const h = stat['hidden|fused (equal weights)'] || [];
console.log(`\nhidden runs: ${h.length}; the fused list is never empty for ${pct(h, x => x > 0)} of them (every entry is a wrong recording there: what Steps 10-12 must reject)`);
