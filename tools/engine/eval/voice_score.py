"""Score the Step 7 voice test.  python3 voice_score.py VOICESET_DIR EMB.jsonl... > voice-score.txt

Abdul Basit samples are split into reference (60 %) and test (40 %) by (surahs, year), so copies and halves of one
performance never sit on both sides. The reference is the mean embedding (1 centroid), or k-means centroids (4, 8: his
voice and the recording chains changed over 35 years); a sample's score is its best cosine to a centroid.

Reported per model and reference:
  EER            where wrongly rejected Abdul Basit = wrongly accepted other reciters
  @99 % pass     threshold that 99 % of Abdul Basit test samples pass; the share of other reciters it rejects
  clips          share of the 640 edited test clips (all Abdul Basit) that pass that threshold, per edit
Then, for the best: per decade, per other reciter, and the closest other-reciter samples (to check the labels)."""
import json, sys, os, glob, hashlib, collections
import numpy as np

vset = sys.argv[1]
man = {}
for f in glob.glob(os.path.join(vset, 'manifest-*.jsonl')):
    for l in open(f):
        m = json.loads(l); man[m['id']] = m
E = collections.defaultdict(dict)   # model -> id -> (vec, rec)
for f in sys.argv[2:]:
    for l in open(f):
        r = json.loads(l)
        v = np.array(r['emb'], np.float64); v /= np.linalg.norm(v) + 1e-12
        E[r['model']][r['id']] = (v, r)


def split(m):
    return int(hashlib.md5(m['group'].encode()).hexdigest(), 16) % 10 < 6


def kmeans(X, k, it=50, seed=0):
    rng = np.random.default_rng(seed)
    C = X[rng.choice(len(X), k, replace=False)]
    for _ in range(it):
        a = np.argmax(X @ C.T, 1)
        C2 = np.array([X[a == j].mean(0) if (a == j).any() else C[j] for j in range(k)])
        C2 /= np.linalg.norm(C2, axis=1, keepdims=True)
        if np.allclose(C, C2):
            break
        C = C2
    return C


def eer(pos, neg):
    th = np.sort(np.concatenate([pos, neg]))
    best = (1, 0)
    for t in th:
        fr = (pos < t).mean(); fa = (neg >= t).mean()
        if abs(fr - fa) < best[0]:
            best = (abs(fr - fa), (fr + fa) / 2, t)
    return best[1], best[2]


rows = []
detail = {}
for model, D in sorted(E.items()):
    ids = [i for i in D if D[i][1]['src'] == 'set' and i in man]
    ref = [i for i in ids if man[i]['kind'] == 'ab' and split(man[i])]
    tst = [i for i in ids if man[i]['kind'] == 'ab' and not split(man[i])]
    oth = [i for i in ids if man[i]['kind'] == 'other']
    clips = [i for i in D if D[i][1]['src'] == 'clip']
    if not ref or not oth:
        continue
    R = np.array([D[i][0] for i in ref])
    for k in (1, 4, 8):
        if k > len(R):
            continue
        C = R.mean(0, keepdims=True) if k == 1 else kmeans(R, k)
        C = C / np.linalg.norm(C, axis=1, keepdims=True)
        sc = lambda ii: np.array([float(np.max(C @ D[i][0])) for i in ii])
        P, N, Q = sc(tst), sc(oth), sc(clips)
        e, te = eer(P, N)
        t99 = float(np.percentile(P, 1))
        rej = float((N < t99).mean())
        cp = float((Q >= t99).mean()) if len(Q) else float('nan')
        rows.append((e, model, k, t99, rej, cp, len(ref), len(tst), len(oth), len(clips)))
        detail[(model, k)] = dict(C=C, P=dict(zip(tst, P)), N=dict(zip(oth, N)), Q=dict(zip(clips, Q)), t99=t99)

print('%-62s %3s %6s %7s %9s %9s   ref/test/other/clips' % ('model', 'k', 'EER', 'thr99', 'others', 'clips'))
print('%-62s %3s %6s %7s %9s %9s' % ('', '', '', '', 'rejected', 'pass'))
for e, model, k, t, rej, cp, a, b, c, d in sorted(rows, key=lambda r: (r[1], r[2])):
    print('%-62s %3d %5.1f%% %7.3f %8.1f%% %8.1f%%   %d/%d/%d/%d' % (model[:62], k, 100 * e, t, 100 * rej, 100 * cp, a, b, c, d))
best = min(rows)
model, k = best[1], best[2]
d = detail[(model, k)]
print('\nlowest EER: %s, %d centroid(s), EER %.1f%%' % (model, k, 100 * best[0]))
print('Abdul Basit test samples passing the 99 % threshold, per decade (it is 99 % overall by construction):')
by = collections.defaultdict(list)
for i, s in d['P'].items():
    by[man[i]['dec']].append(s >= d['t99'])
for dec, v in sorted(by.items()):
    print('  %-8s %3d/%3d' % (dec, sum(v), len(v)))
print('other reciters rejected at that threshold:')
by = collections.defaultdict(list)
for i, s in d['N'].items():
    by[man[i]['reciter']].append(s < d['t99'])
for r, v in sorted(by.items()):
    print('  %-30s %3d/%3d' % (r, sum(v), len(v)))
print('edited clips passing, per edit:')
by = collections.defaultdict(list)
for i, s in d['Q'].items():
    by[E[model][i][1].get('variant')].append(s >= d['t99'])
print('  ' + ', '.join('%s %d/%d' % (v, sum(x), len(x)) for v, x in sorted(by.items())))
print('closest other-reciter samples (labels to check):')
for i, s in sorted(d['N'].items(), key=lambda x: -x[1])[:10]:
    m = man[i]; print('  %.3f %-28s %s / %s @%ds' % (s, m['reciter'], m['item'], m['file'][:50], m['t']))
print('lowest Abdul Basit samples:')
for i, s in sorted(d['P'].items(), key=lambda x: x[1])[:8]:
    m = man[i]; print('  %.3f %-8s %s @%ds' % (s, m['dec'], m['rec'][:60], m['t']))
dropped = [m for m in man.values() if m['kind'] == 'other' and m.get('fp_hit')]
print('\nother-reciter samples dropped because the recording index matched them to the archive: %d' % len(dropped))
for m in dropped[:20]:
    print('  %-28s %s / %s -> %s' % (m['reciter'], m['item'], m['file'][:40], m['fp_hit'][:50]))
