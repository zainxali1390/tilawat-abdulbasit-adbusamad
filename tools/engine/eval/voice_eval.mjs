// Voice embeddings for the Step 7 test (one model per run): every sample of the voice set (voice_set.py) and the first
// 20 s of every clip of the 640-clip test set. Features by js/engine/voice.js (the code the app ships), model run by
// onnxruntime-node (the same graph runs in onnxruntime-web; checked locally for all models used here).
//   node voice_eval.mjs MODEL.onnx VOICESET_DIR TESTSET_DIR OUT.jsonl
// A sample is split into voiced pieces of <= 6 s (VOICE.segments); its embedding is the mean of the pieces' unit vectors.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import ort from 'onnxruntime-node';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
globalThis.window = undefined; await import(path.join(ROOT, 'js/engine/voice.js')); const V = globalThis.VOICE;
const [MODEL, VSET, TSET, OUT] = process.argv.slice(2);
const s = await ort.InferenceSession.create(MODEL, {intraOpNumThreads: 2});
const out = fs.createWriteStream(OUT);
let ms = 0, pieces = 0;
async function embed(x) {
  const segs = V.segments(x, 6); if (!segs.length) return null;
  let acc = null;
  for (const [a, b] of segs) {
    const f = V.fbank(x.subarray(a, b)), t0 = Date.now();
    const e = (await s.run({[s.inputNames[0]]: new ort.Tensor('float32', f.data, [1, f.T, 80])}))[s.outputNames[0]].data;
    ms += Date.now() - t0; pieces++;
    let n = 0; for (const v of e) n += v * v; n = Math.sqrt(n) || 1;
    if (!acc) acc = new Float64Array(e.length); for (let i = 0; i < e.length; i++) acc[i] += e[i] / n / segs.length;
  }
  return Array.from(acc, v => +v.toFixed(5));
}
const model = path.basename(path.dirname(MODEL)) + '/' + path.basename(MODEL);
for (const f of fs.readdirSync(VSET).filter(f => f.startsWith('manifest-'))) {
  for (const line of fs.readFileSync(path.join(VSET, f), 'utf8').split('\n').filter(Boolean)) {
    const m = JSON.parse(line), p = path.join(VSET, m.id + '.f32'); if (!fs.existsSync(p)) continue;
    const b = fs.readFileSync(p), e = await embed(new Float32Array(b.buffer, b.byteOffset, b.length >> 2));
    if (e) out.write(JSON.stringify({id: m.id, src: 'set', model, emb: e}) + '\n');
  }
}
if (TSET && fs.existsSync(path.join(TSET, 'cases.json'))) {
  for (const c of JSON.parse(fs.readFileSync(path.join(TSET, 'cases.json')))) {
    const d = spawnSync('ffmpeg', ['-loglevel', 'error', '-i', path.join(TSET, c.file), '-t', '20', '-vn', '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], {maxBuffer: 1 << 28});
    const x = new Float32Array(d.stdout.buffer, d.stdout.byteOffset, d.stdout.length >> 2), e = await embed(x);
    if (e) out.write(JSON.stringify({id: c.name, src: 'clip', variant: c.variant, code: c.code, model, emb: e}) + '\n');
  }
}
out.end();
console.log(model, 'pieces', pieces, 'model time per 6 s piece', (ms / Math.max(1, pieces)).toFixed(1), 'ms');
