// Matcher experiments on stored transcripts (no listening): truth coverage and app-model accuracy for matcher variants.
//   node match_lab.mjs RESULTSDIR CASES.json
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..', '..', '..');
const [D, CASES] = process.argv.slice(2);
const VARIANTS = {
  current: s => s,
  phon: s => s.replace('.replace(/[ءا]/g,"")', '.replace(/[ءا]/g,"").replace(/ط/g,"ت").replace(/ض/g,"د").replace(/ص/g,"س").replace(/[ظذ]/g,"ز").replace(/ث/g,"س").replace(/ق/g,"ك").replace(/ح/g,"ه").replace(/ع/g,"")'),
  phon3: s => VARIANTS.phon(s).replace('const N=4,B=12', 'const N=3,B=12'),
};
function make(variant) {
  const ctx = {console, isAr: () => false, numFmt: String}; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/quran-data.js'), 'utf8').replace(/^(const|let) /gm, 'var '), ctx);
  let src = fs.readFileSync(path.join(ROOT, 'js/ayah.js'), 'utf8');
  src = VARIANTS[variant](src); if (variant !== 'current' && src === fs.readFileSync(path.join(ROOT, 'js/ayah.js'), 'utf8')) throw new Error('patch failed ' + variant);
  vm.runInContext(src.replace(/^(const|let) /gm, 'var '), ctx);
  ctx.QMATCH.build(fs.readFileSync(path.join(ROOT, 'data/quran-uthmani.txt'), 'utf8').trim().split('\n'), ctx.SURAHS.map(x => x[2]));
  return ctx;
}
const C = Object.fromEntries(JSON.parse(fs.readFileSync(CASES)).map(c => [c.name, c]));
const T = {}; for (const f of fs.readdirSync(D).filter(f => f.startsWith('truth-'))) Object.assign(T, JSON.parse(fs.readFileSync(path.join(D, f))).texts);
const preds = fs.readdirSync(D).filter(f => f.startsWith('pred-app-')).flatMap(f => fs.readFileSync(path.join(D, f), 'utf8').trim().split('\n').map(l => JSON.parse(l)));
const base = make('current');
const S = base.SURAHS, first = []; { let n = 0; for (const s of S) { first.push(n); n += s[2]; } }
const lin = (su, ay) => first[su - 1] + ay - 1;
const titleSurahs = t => { const o = []; for (const part of (t || '').split(/\s*·\s*/)) { const q = part.replace(/^(Sūrah|Surah)\s+/i, ''); let best = 0, bl = 0;
  S.forEach((s, i) => { const n = s[1]; if (q.startsWith(n) && n.length > bl && !/[a-zāīūḥʿʾ]/i.test(q.charAt(n.length) || ' ')) { best = i + 1; bl = n.length; } }); if (best) o.push(best); } return o; };
// the truth is fixed (current matcher on the large model's transcripts), so variants are compared on the same clips
const truth = {};
for (const [k, txt] of Object.entries(T)) { const p = base.ayahPlace(txt); truth[k] = p && p.level === 'confirmed' ? p : null; }
for (const v of Object.keys(VARIANTS)) {
  const ctx = make(v);
  // 1. truth coverage with this matcher (and agreement with the title)
  let cov = 0, covTitle = 0;
  for (const [k, txt] of Object.entries(T)) { const p = ctx.ayahPlace(txt); if (p && p.level === 'confirmed') { cov++; const code = k.split('|')[0]; const c = Object.values(C).find(c => c.code === code); const ts = titleSurahs(c && c.title); if (!ts.length || ts.includes(p.surah) || ts.includes(p.surah2)) covTitle++; } }
  // 2. app-model transcripts vs the fixed truth
  let n = 0, cr = 0, cw = 0, pr = 0, pw = 0, none = 0;
  for (const r of preds) {
    const c = C[r.name]; const tr = c.segments.map(s => truth[`${s.code}|${s.at.toFixed(2)}|${((s.b - s.a) * s.rate).toFixed(2)}`]).filter(Boolean);
    if (!tr.length) continue; n++;
    const ws = r.wins.map(w => ({w, p: ctx.ayahPlace(w.text)})).filter(x => x.p);
    const best = ws.filter(x => x.p.level === 'confirmed').sort((a, b) => b.p.conf - a.p.conf)[0] || ws.sort((a, b) => b.p.conf - a.p.conf)[0];
    if (!best) { none++; continue; }
    const p = best.p, plo = lin(p.surah, p.ayah), phi = lin(p.surah2, p.ayah2);
    const right = tr.some(t => plo <= lin(t.surah2, t.ayah2) + 2 && phi >= lin(t.surah, t.ayah) - 2);
    if (p.level === 'confirmed') right ? cr++ : cw++; else right ? pr++ : pw++;
  }
  console.log(`${v.padEnd(8)} truth transcripts confirmed ${cov}/${Object.keys(T).length} (title-consistent ${covTitle}) | app model on ${n} clips: confirmed right ${cr}, confirmed WRONG ${cw}, possible right ${pr}, possible wrong ${pw}, nothing ${none}`);
}
