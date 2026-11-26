// Step 10 functional tests: js/engine/match.js (pure functions, Node).   node test_match.mjs
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
globalThis.window = undefined; await import(path.join(ROOT, 'js/engine/match.js')); const X = globalThis.MATCH;
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
let s = 1; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
/* a line through 40 true hits among 400 random ones (time in recording = 1.1 x clip time + 300) */
const P = []; for (let i = 0; i < 40; i++) { const tc = r() * 20; P.push({tc, tr: 1.1 * tc + 300 + (r() - 0.5) * 0.06}); }
for (let i = 0; i < 400; i++) P.push({tc: r() * 20, tr: r() * 3000});
const t0 = Date.now(), L = X.lmLine(P), ms = Date.now() - t0;
ok(L.inliers >= 38 && Math.abs(L.k - 1.1) < 0.005 && Math.abs(L.b - 300) < 0.05, `lmLine: line found among noise (inliers ${L.inliers}, k ${L.k.toFixed(4)}, b ${L.b.toFixed(3)}, ${ms} ms)`);
ok(L.span > 15, 'lmLine: the inliers span the clip');
ok(X.lmLine(Array.from({length: 300}, () => ({tc: r() * 20, tr: r() * 3000}))).inliers <= 4, 'lmLine: random hits give no real line');
ok(X.lmLine([{tc: 1, tr: 5}, {tc: 2, tr: 6}]).k === null, 'lmLine: under 3 hits, no line');
const L2 = X.lmLine(Array.from({length: 30}, (_, i) => ({tc: i * 0.5, tr: 2 * i * 0.5 + 10})));
ok(L2.inliers === 0 || L2.k <= 1.33, 'lmLine: tempo outside 0.75-1.33 is not accepted');
/* agreement */
ok(X.agree(L, {score: 0.9, k: 1.09, at: 300.2}), 'agree: same tempo (1 %) and start (0.2 s)');
ok(!X.agree(L, {score: 0.9, k: 1.0, at: 300}), 'agree: tempo 9 % apart is not agreement');
ok(!X.agree(L, {score: 0.9, k: 1.1, at: 302}), 'agree: start 2 s apart is not agreement');
ok(!X.agree(L, {score: 0}), 'agree: no melody alignment, no agreement');
/* verse check */
const vm = [[300, 55, 13, 55, 14, 80, 2], [330, 55, 15, 55, 16, 70, 2], [360, 56, 1, 56, 2, 40, 1]];
ok(X.verseCheck(vm, 300, 322, [{su: 55, ay: 14, su2: 55, ay2: 14, level: 'confirmed'}]) === 'agree', 'verseCheck: same surah and ayah → agree');
ok(X.verseCheck(vm, 300, 322, [{su: 2, ay: 5, su2: 2, ay2: 5, level: 'confirmed'}]) === 'contradict', 'verseCheck: a sure other surah → contradict');
ok(X.verseCheck(vm, 300, 322, [{su: 2, ay: 5, su2: 2, ay2: 5, level: 'possible'}]) === 'none', 'verseCheck: an unsure other surah → none');
ok(X.verseCheck(vm, 360, 380, [{su: 2, ay: 5, su2: 2, ay2: 5, level: 'confirmed'}]) === 'none', 'verseCheck: only unsure map windows there → none');
ok(X.verseCheck(vm, 300, 322, []) === 'none', 'verseCheck: no verse heard → none');
console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
