// Step 9 functional test: the archive indexes as the app reads them (js/engine/archive.js over HTTP) give exactly the
// same melody search as an index built in memory from the same melodies.
//   node test_archive.mjs BASE_URL [CLIP_AUDIO …]      BASE_URL serves mf/ mh/ vi/ (e.g. the app, or a test build)
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
globalThis.window = undefined;
await import(path.join(ROOT, 'js/engine/melody.js')); await import(path.join(ROOT, 'js/engine/archive.js'));
const M = globalThis.MELODY, A = globalThis.ARCHIVE;
const [BASE, ...clips] = process.argv.slice(2); A.base = BASE.endsWith('/') ? BASE : BASE + '/';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const mh = await A.mhManifest(), mf = await A.mfManifest();
ok(mh.build === mf.build && mh.recs.length === Object.keys(mf.recs).length, `manifests agree: build ${mh.build}, ${mh.recs.length} recordings, ${mh.entries} hash entries`);
/* every recording's melody can be fetched; the in-memory index from them equals the served one */
const contours = [];
for (const code of mh.recs.slice(0, 400)) contours.push(await A.melody(code));
ok(contours.every(c => c && c.length > 0), `melody frames fetched for ${contours.length} recordings`);
const idx = M.hashIndex(contours), sub = mh.recs.length <= 400;
const pcm = f => { const d = spawnSync('ffmpeg', ['-loglevel', 'error', '-i', f, '-t', '20', '-vn', '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], {maxBuffer: 1 << 28}); return new Float32Array(d.stdout.buffer, d.stdout.byteOffset, d.stdout.length >> 2); };
for (const f of clips) {
  const q = M.unpack(M.pack(M.f0(pcm(f)))), hs = M.hashes(q, {expand: true}).map(x => x[0]);
  const t0 = Date.now(), look = await A.melodyLookup(hs), ms = Date.now() - t0;
  const served = M.hashVote(q, look), local = M.hashVote(q, h => idx.get(h));
  const top = served.list[0];
  console.log(`     ${path.basename(f)}: ${hs.length} hashes, shards fetched in ${ms} ms; first: ${top ? (await A.mhCode(top.rec)) + ' votes ' + top.votes + ' at ' + top.t + ' s' : 'none'}`);
  if (sub) ok(JSON.stringify(served.list.slice(0, 5)) === JSON.stringify(local.list.slice(0, 5)), `${path.basename(f)}: served index gives the same top 5 as the in-memory index`);
}
const v = await A.verses(55);
ok(v && v.recs.length > 0 && v.a[13], 'verse index: Ar-Rahman loads');
ok((await A.verses(999)) === null, 'verse index: a missing surah gives null');
console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
