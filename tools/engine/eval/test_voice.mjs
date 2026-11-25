// Step 7 functional tests for the shipped voice stage (models/voice/, js/engine/voice.js).
//   node test_voice.mjs AUDIO...            Node, onnxruntime-web: each Abdul Basit file must not be judged "unlike"
//   BROWSER=1 node test_voice.mjs AUDIO     also runs VOICE.check in the real app page (Chromium, worker, wasm)
// ORT_DIR: a local onnxruntime-web@1.20.1/dist folder to serve instead of the CDN (for machines without CDN access).
// APP_URL: the app served over http (default http://127.0.0.1:8765/).
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import * as ort from 'onnxruntime-web';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
globalThis.window = undefined; await import(path.join(ROOT, 'js/engine/voice.js')); const V = globalThis.VOICE;
let fails = 0; const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) fails++; };
const pcm = (f, ss, t) => { if (f.endsWith('.f32')) { const b = fs.readFileSync(f); return new Float32Array(b.buffer, b.byteOffset, b.length >> 2); }
  return pcm2(f, ss, t); };
const pcm2 = (f, ss, t) => { const d = spawnSync('ffmpeg', ['-loglevel', 'error', '-ss', String(ss), '-t', String(t), '-i', f, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], {maxBuffer: 1 << 28}); return new Float32Array(d.stdout.buffer, d.stdout.byteOffset, d.stdout.length >> 2); };
ort.env.wasm.numThreads = 1;
const sess = await ort.InferenceSession.create(fs.readFileSync(path.join(ROOT, 'models/voice/campplus-q8.onnx')));
const ref = JSON.parse(fs.readFileSync(path.join(ROOT, 'models/voice/reference.json')));
ok(ref.centroids.length === 4 && ref.centroids[0].length === 192 && ref.threshold > 0.3 && ref.threshold < 0.8, 'reference: 4 centroids of 192, threshold ' + ref.threshold);
/* no voice: silence, and a too-short clip → "unknown", never "unlike" */
ok(V.judge(await V.embed(ort, sess, new Float32Array(16000 * 10), 5), ref).verdict === 'unknown', 'silence → unknown');
const files = process.argv.slice(2);
if (files.length) ok(V.judge(await V.embed(ort, sess, pcm(files[0], 60, 3).slice(0, 48000), 5), ref).verdict === 'unknown', '3 s clip → unknown (too little voice)');
/* a steady tone is not a voice: it must not crash, and its verdict is printed */
const tone = new Float32Array(16000 * 10).map((_, i) => 0.3 * Math.sin(2 * Math.PI * 220 * i / 16000));
console.log('     tone →', JSON.stringify(V.judge(await V.embed(ort, sess, tone, 5), ref)));
for (const f of files.filter(f => !f.endsWith('.f32'))) for (const ss of [60, 300]) {
  const t0 = Date.now(), r = V.judge(await V.embed(ort, sess, pcm(f, ss, 20), 5), ref);
  ok(r.verdict !== 'unlike', `${path.basename(f)} @${ss}s → ${r.verdict} (score ${r.score}, ${r.secs} s of voice, ${Date.now() - t0} ms)`);
}
const unlike = process.env.UNLIKE ? JSON.parse(fs.readFileSync(process.env.UNLIKE)) : [];
for (const f of unlike) { const r = V.judge(await V.embed(ort, sess, pcm(f), 5), ref); ok(r.verdict === 'unlike', 'other reciter sample ' + path.basename(f) + ' → ' + r.verdict + ' (' + r.score + ')'); }
if (process.env.BROWSER && files.length) {
  const {chromium} = (await import('node:module')).createRequire(import.meta.url)('playwright');
  const b = await chromium.launch(), p = await b.newPage();
  if (process.env.ORT_DIR) await p.route(u => u.href.startsWith(V.ORT), r => r.fulfill({path: path.join(process.env.ORT_DIR, r.request().url().slice(V.ORT.length)),
    contentType: r.request().url().endsWith('.wasm') ? 'application/wasm' : 'text/javascript', headers: {'access-control-allow-origin': '*'}}));
  await p.goto(process.env.APP_URL || 'http://127.0.0.1:8765/');
  await p.addScriptTag({url: 'js/engine/voice.js'});
  const x = pcm(files[0], 60, 20);
  const r = await p.evaluate(async a => { const t0 = performance.now(); const r = await window.VOICE.check(new Float32Array(a)); r.ms = Math.round(performance.now() - t0); return r; }, Array.from(x));
  ok(r && r.verdict !== 'unlike' && r.score != null, 'browser: VOICE.check in the app page → ' + JSON.stringify(r));
  const node = V.judge(await V.embed(ort, sess, x, 5), ref);
  ok(Math.abs(node.score - r.score) < 0.002, `browser and Node give the same score (${r.score} vs ${node.score})`);
  for (const f of unlike.slice(0, 1)) {
    const r2 = await p.evaluate(async a => window.VOICE.check(new Float32Array(a)), Array.from(pcm(f)));
    ok(r2.verdict === 'unlike', 'browser: other reciter sample → ' + JSON.stringify(r2));
  }
  await b.close();
}
console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
