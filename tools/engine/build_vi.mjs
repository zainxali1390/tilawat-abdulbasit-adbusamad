// Verse index (vi/), design §3.3: the verse map (vm/, per recording: [t, su, ay, su2, ay2, score, level] every 60 s)
// turned around, so a search that recognised a surah downloads one small file listing every recording and time where
// each of its ayat was heard.
//   node tools/engine/build_vi.mjs            reads vm/, writes vi/SSS.json (1..114) and vi/manifest.json
// vi/SSS.json: {v, build, recs:[code…], a:{ayah:[[rec index, t seconds, level], …]}}  (level 2 = sure, 1 = possible)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const VM = path.join(ROOT, 'vm'), VI = path.join(ROOT, 'vi');
const man = JSON.parse(fs.readFileSync(path.join(VM, 'manifest.json')));
const bySu = new Map();
let windows = 0;
for (const f of fs.readdirSync(VM).filter(f => /^[0-9a-f]{2}\.json$/.test(f))) {
  for (const [code, ws] of Object.entries(JSON.parse(fs.readFileSync(path.join(VM, f))))) {
    for (const [t, su, ay, su2, ay2, , lv] of ws) {
      if (!su || !lv) continue;
      /* a window can run from one surah into the next: each part is listed under its own surah */
      const parts = su === su2 ? [[su, ay, ay2]] : [[su, ay, ay + 3], [su2, Math.max(1, ay2 - 3), ay2]];
      for (const [s, a, b] of parts) {
        if (!bySu.has(s)) bySu.set(s, {recs: [], ri: new Map(), a: {}});
        const S = bySu.get(s);
        if (!S.ri.has(code)) { S.ri.set(code, S.recs.length); S.recs.push(code); }
        for (let x = a; x <= b; x++) (S.a[x] ||= []).push([S.ri.get(code), t, lv]);
        windows++;
      }
    }
  }
}
fs.mkdirSync(VI, {recursive: true});
const build = man.built || '';
let bytes = 0;
const out = {v: 1, build, surahs: {}};
for (const [s, S] of [...bySu].sort((a, b) => a[0] - b[0])) {
  const txt = JSON.stringify({v: 1, build, recs: S.recs, a: S.a});
  fs.writeFileSync(path.join(VI, String(s).padStart(3, '0') + '.json'), txt);
  bytes += txt.length; out.surahs[s] = [S.recs.length, txt.length];
}
fs.writeFileSync(path.join(VI, 'manifest.json'), JSON.stringify(out));
console.log('surahs', bySu.size, 'windows', windows, 'bytes', bytes);
