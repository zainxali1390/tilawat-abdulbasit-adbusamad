// End-to-end check of the SHIPPED voice stage (models/voice/campplus-q8.onnx + reference.json + js/engine/voice.js,
// onnxruntime-web) on the Step 7 voice set: how often it says "unlike" for Abdul Basit and for other reciters.
//   node voice_shipped.mjs VOICESET_DIR MANIFEST.jsonl voice_exclude.json [TESTSET_DIR]
// Note: the reference was built from ALL Abdul Basit samples of this set, so its Abdul Basit rate is optimistic; the
// held-out numbers are in voice-score.txt. This checks that the shipped files reproduce the measured behaviour.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import * as ort from 'onnxruntime-web';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
globalThis.window = undefined; await import(path.join(ROOT, 'js/engine/voice.js')); const V = globalThis.VOICE;
const [VSET, MAN, EXCL, TSET] = process.argv.slice(2);
ort.env.wasm.numThreads = 1;
const sess = await ort.InferenceSession.create(fs.readFileSync(path.join(ROOT, 'models/voice/campplus-q8.onnx')));
const ref = JSON.parse(fs.readFileSync(path.join(ROOT, 'models/voice/reference.json')));
const ex = new Set(JSON.parse(fs.readFileSync(EXCL)).items);
const tally = {}, add = (k, v) => { (tally[k] ||= {n: 0, unlike: 0, unknown: 0}).n++; if (v === 'unlike') tally[k].unlike++; if (v === 'unknown') tally[k].unknown++; };
const unlikeOther = [];
for (const l of fs.readFileSync(MAN, 'utf8').split('\n').filter(Boolean)) {
  const m = JSON.parse(l); if (ex.has(m.item)) continue;
  const p = path.join(VSET, m.id + '.f32'); if (!fs.existsSync(p)) continue;
  const b = fs.readFileSync(p), r = V.judge(await V.embed(ort, sess, new Float32Array(b.buffer, b.byteOffset, b.length >> 2), 5), ref);
  add(m.kind === 'ab' ? 'Abdul Basit (' + m.dec + ')' : 'other: ' + m.reciter, r.verdict); add(m.kind === 'ab' ? 'ALL Abdul Basit' : 'ALL other reciters', r.verdict);
  if (m.kind !== 'ab' && r.verdict === 'unlike' && unlikeOther.length < 3) unlikeOther.push(p);
}
if (TSET && fs.existsSync(path.join(TSET, 'cases.json'))) {
  for (const c of JSON.parse(fs.readFileSync(path.join(TSET, 'cases.json')))) {
    const d = spawnSync('ffmpeg', ['-loglevel', 'error', '-i', path.join(TSET, c.file), '-t', '20', '-vn', '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], {maxBuffer: 1 << 28});
    const r = V.judge(await V.embed(ort, sess, new Float32Array(d.stdout.buffer, d.stdout.byteOffset, d.stdout.length >> 2), 5), ref);
    add('edited clips (Abdul Basit)', r.verdict); if (r.verdict === 'unlike') add('edited clips judged unlike: ' + c.variant, r.verdict);
  }
}
for (const [k, v] of Object.entries(tally).sort()) console.log(`${k.padEnd(44)} unlike ${String(v.unlike).padStart(3)}/${v.n}` + (v.unknown ? `  (too little voice: ${v.unknown})` : ''));
fs.writeFileSync('unlike-samples.json', JSON.stringify(unlikeOther));
