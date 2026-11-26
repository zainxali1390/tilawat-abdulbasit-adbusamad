// Step 9 experiment: would a denser verse map, or one made with the better speech model, find the right recording more
// often? The 16 test-set source recordings are mapped again under each configuration (tools/verses/analyse.mjs --model
// --step); their windows replace the current ones (tiny model, a 30 s window every 60 s) and the verse source of the
// candidate list (CAND.verses) is measured on the 640 clips, with the clips' own verse places from Step 4 (shipped model).
//   node verse_exp.mjs NAME=PARTSDIR …
// Note: only the 16 source recordings change, so a recording's chance of making the list against the other 3,065
// (still mapped the old way) is measured slightly in its favour; the comparison between configurations is fair.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..', '..', '..');
globalThis.window = undefined; await import(path.join(ROOT, 'js/engine/candidates.js')); const C = globalThis.CAND;
const VM = {}; for (const f of fs.readdirSync(path.join(ROOT, 'vm')).filter(f => /^[0-9a-f]{2}\.json$/.test(f))) Object.assign(VM, JSON.parse(fs.readFileSync(path.join(ROOT, 'vm', f))));
const preds = {}; const PD = path.join(HERE, 'results/content-20261125-1854-c937226');
for (const f of fs.readdirSync(PD).filter(f => f.startsWith('pred-base-q8-'))) for (const l of fs.readFileSync(path.join(PD, f), 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(l); preds[r.name] = r; }
const cases = JSON.parse(fs.readFileSync(path.join(HERE, 'results/20261125-1651-75d7d52/cases.json')));
const groups = JSON.parse(fs.readFileSync(path.join(HERE, 'results/melody-local-20261125-2236/copy-groups.json'))).groups.map(g => new Set(g));
const same = (a, b) => a === b || groups.some(g => g.has(a) && g.has(b));
const F = Object.fromEntries(fs.readFileSync(path.join(HERE, 'results/20261125-2016-f9cdeef/finder-new.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter(r => !r.hide).map(r => [r.name, r]));
const notConfirmed = new Set(Object.values(F).filter(r => { const truth = [...r.segments.map(g => g.code), ...(r.copies || [])]; const t = r.list.find(x => x.level === 'confirmed'); return !(t && truth.some(y => same(t.code, y))); }).map(r => r.name));
function viFrom(vm) {   // the same turning-around as tools/engine/build_vi.mjs, in memory
  const by = new Map();
  for (const [code, ws] of Object.entries(vm)) for (const [t, su, ay, su2, ay2, , lv] of ws) {
    if (!su || !lv) continue;
    const parts = su === su2 ? [[su, ay, ay2]] : [[su, ay, ay + 3], [su2, Math.max(1, ay2 - 3), ay2]];
    for (const [s, a, b] of parts) { if (!by.has(s)) by.set(s, {recs: [], ri: new Map(), a: {}}); const S = by.get(s);
      if (!S.ri.has(code)) { S.ri.set(code, S.recs.length); S.recs.push(code); } for (let x = a; x <= b; x++) (S.a[x] ||= []).push([S.ri.get(code), t, lv]); }
  }
  return su => by.get(su) || null;
}
function measure(name, vm, timing) {
  const get = viFrom(vm); let withVerse = 0, inList = 0, top30 = 0, nc = 0, ncTop30 = 0, sure = 0, wins = 0;
  for (const c of cases) {
    const places = (preds[c.name]?.wins || []).filter(w => w.p).map(w => ({su: w.p[0], ay: w.p[1], su2: w.p[2], ay2: w.p[3], level: w.p[4]}));
    if (!places.length) continue; withVerse++;
    const truth = [...c.segments.map(g => g.code), ...(c.copies || [])];
    const L = C.verses(places, get, 2), i = L.findIndex(x => truth.some(y => same(x.code, y)));
    if (i >= 0) inList++; if (i >= 0 && i < 30) top30++;
    if (notConfirmed.has(c.name)) { nc++; if (i >= 0 && i < 30) ncTop30++; }
  }
  const srcs = [...new Set(cases.map(c => c.code))];
  for (const s of srcs) for (const w of vm[s] || []) { wins++; if (w[1] && w[6] === 2) sure++; }
  console.log(`${name.padEnd(22)} clips with a verse ${withVerse}: right recording listed ${inList}, in top 30 ${top30}; ` +
    `not-confirmed clips in top 30: ${ncTop30}/${nc}; source windows ${wins}, sure ${sure}` + (timing ? `; ${timing}` : ''));
}
measure('current (tiny, 60 s)', VM);
for (const a of process.argv.slice(2)) {
  const [name, dir] = a.split('='), alt = {...VM}; let secs = 0, n = 0;
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) for (const [code, r] of Object.entries(JSON.parse(fs.readFileSync(path.join(dir, f))))) {
    if (!r.wins) continue; alt[code] = r.wins.map(w => [w[0], w[2], w[3], w[4], w[5], w[6], w[7]]); secs += r.secs || 0; n += r.wins.length; }
  measure(name, alt, `${n} windows in ${Math.round(secs)} s (${(secs / Math.max(1, n)).toFixed(2)} s per window, download included)`);
}
