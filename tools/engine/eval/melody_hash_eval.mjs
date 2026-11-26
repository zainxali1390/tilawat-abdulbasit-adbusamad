// Step 8: melody-hash search (MELODY.hashIndex / hashVote) of the 640 test clips against the Step 6 pilot store
// (89 recordings, 44 h: the 16 sources, 9 copies, 64 others, mostly other performances of the same surahs).
//   node melody_hash_eval.mjs SETDIR OUT.jsonl STORE.json...
//   node melody_hash_eval.mjs SETDIR OUT.jsonl --archive BASE_URL      the whole-archive index (mh/), read as the app reads it
// Writes one line per clip and per hidden run (the clip's recording and its copies left out of the index) with the
// ranked list [{code, score (votes), t, k}], and prints recall and place accuracy per edit.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..', '..', '..');
globalThis.window = undefined; await import(path.join(ROOT, 'js/engine/melody.js')); await import(path.join(ROOT, 'js/engine/archive.js')); const M = globalThis.MELODY, A = globalThis.ARCHIVE;
const [SET, OUT, ...rest] = process.argv.slice(2);
let codes, lookupFor;
if (rest[0] === '--archive') {
  A.base = rest[1].endsWith('/') ? rest[1] : rest[1] + '/';
  const man = await A.mhManifest(); codes = man.recs;
  console.log(`index: whole archive, ${codes.length} recordings, ${man.entries} hash entries, ${man.shards} shard files, ${(man.bytes / 1e6).toFixed(1)} MB`);
  lookupFor = async q => A.melodyLookup(M.hashes(q, {expand: true}).map(x => x[0]));
} else {
  const refs = {}; for (const f of rest) for (const [c, v] of Object.entries(JSON.parse(fs.readFileSync(f)))) refs[c] = M.unpack(new Uint8Array(Buffer.from(v.mf, 'base64')));
  codes = Object.keys(refs); const t0 = Date.now(), idx = M.hashIndex(codes.map(c => refs[c]));
  let entries = 0; for (const l of idx.values()) entries += l.length;
  console.log(`index: ${codes.length} recordings, ${entries} hash entries (${(entries / (Object.values(refs).reduce((s, m) => s + m.length, 0) / M.FPS)).toFixed(2)} per second of audio), ${idx.size} distinct hashes, built in ${Date.now() - t0} ms`);
  lookupFor = async () => h => idx.get(h);
}
const groups = JSON.parse(fs.readFileSync(path.join(HERE, 'results/melody-local-20261125-2236/copy-groups.json'))).groups.map(g => new Set(g));
const same = (a, b) => a === b || groups.some(g => g.has(a) && g.has(b));
const cases = JSON.parse(fs.readFileSync(path.join(SET, 'cases.json')));
const out = fs.createWriteStream(OUT), stat = {}, ms = [];
for (const c of cases) {
  const d = spawnSync('ffmpeg', ['-loglevel', 'error', '-i', path.join(SET, c.file), '-vn', '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], {maxBuffer: 1 << 28});
  const q = M.unpack(M.pack(M.f0(new Float32Array(d.stdout.buffer, d.stdout.byteOffset, d.stdout.length >> 2))));
  const t1 = Date.now(), look = await lookupFor(q), r = M.hashVote(q, look, {top: 60}); ms.push(Date.now() - t1);
  const list = r.list.map(x => ({code: codes[x.rec], score: x.votes, t: +x.t.toFixed(1), k: +x.k.toFixed(3)}));
  const truth = [...new Set([...c.segments.map(g => g.code), ...(c.copies || [])])];
  const starts = c.segments.map(g => [g.code, g.at - g.a * g.rate]);
  out.write(JSON.stringify({name: c.name, variant: c.variant, hide: false, hashes: r.hashes, list: list.slice(0, 30)}) + '\n');
  out.write(JSON.stringify({name: c.name, variant: c.variant, hide: true, list: list.filter(x => !truth.some(y => same(x.code, y))).slice(0, 30)}) + '\n');
  const i = list.findIndex(x => truth.some(y => same(x.code, y)));
  const placed = i >= 0 && starts.some(([cd, s]) => cd === list[i].code && Math.abs(list[i].t - s) < 2);
  (stat[c.variant] ||= []).push({i, placed, inPilot: truth.some(y => codes.includes(y))});
}
out.end();
let tot = {n: 0, t1: 0, t5: 0, t30: 0, pl: 0};
console.log('edit'.padEnd(16) + '   n top1 top5 top30 placed');
for (const [v, a] of Object.entries(stat).sort()) {
  const b = a.filter(x => x.inPilot), f = k => b.filter(x => x.i >= 0 && x.i < k).length, pl = b.filter(x => x.placed).length;
  tot.n += b.length; tot.t1 += f(1); tot.t5 += f(5); tot.t30 += f(30); tot.pl += pl;
  console.log(v.padEnd(16) + [b.length, f(1), f(5), f(30), pl].map(x => String(x).padStart(5)).join(''));
}
ms.sort((a, b) => a - b);
console.log(`TOTAL ${tot.n} clips: right recording first ${tot.t1}, in top 5 ${tot.t5}, in top 30 ${tot.t30}; first entry right AND placed within 2 s: ${tot.pl}`);
console.log(`lookup and vote time per clip: median ${ms[ms.length >> 1]} ms, max ${ms[ms.length - 1]} ms`);
