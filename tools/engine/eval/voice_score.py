"""Score the Step 7 voice test.
  python3 voice_score.py MANIFEST(.jsonl file or VOICESET_DIR) EMB.jsonl... [--exclude voice_exclude.json] [--export OUT.json]

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

args = sys.argv[1:]
opt = {}
for key in ('--exclude', '--export', '--detail'):
    if key in args:
        i = args.index(key); opt[key] = args[i + 1]; del args[i:i + 2]
vset = args[0]
excl = set(json.load(open(opt['--exclude']))['items']) if '--exclude' in opt else set()
man = {}
for f in (glob.glob(os.path.join(vset, 'manifest-*.jsonl')) if os.path.isdir(vset) else [vset]):
    for l in open(f):
        m = json.loads(l)
        if m.get('item') in excl:
            continue
        man[m['id']] = m
E = collections.defaultdict(dict)   # model -> id -> (vec, rec)
for f in args[1:]:
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
ops = []
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
        # stricter points: the threshold below every Abdul Basit test sample, and below 99.5 % of the edited clips too
        tmin = min(float(P.min()), float(np.percentile(Q, 0.5)) if len(Q) else 1)
        ops.append((model, k, tmin, float((N < tmin).mean()), float((P < tmin).mean()), float((Q < tmin).mean()) if len(Q) else 0))
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

print('\nstrict threshold (no Abdul Basit test sample and at most 0.5 % of edited clips below it):')
print('%-62s %3s %7s %10s %10s' % ('model', 'k', 'thr', 'others rej', 'clips rej'))
for model, k, t, rej, pr, qr in sorted(ops):
    print('%-62s %3d %7.3f %9.1f%% %9.1f%%' % (model[:62], k, t, 100 * rej, 100 * qr))
if '--export' in opt:
    # reference for the app: k-means centroids over ALL Abdul Basit samples, with the thresholds measured above
    ex = {}
    for model, D in E.items():
        X = np.array([D[i][0] for i in D if D[i][1]['src'] == 'set' and i in man and man[i]['kind'] == 'ab'])
        for k in (4, 8):
            C = kmeans(X, k)
            t = [o for o in ops if o[0] == model and o[1] == k]
            ex['%s|%d' % (model, k)] = dict(centroids=[[round(float(v), 5) for v in c] for c in C], strict=t[0][2] if t else None,
                                            t99=detail[(model, k)]['t99'] if (model, k) in detail else None, n=len(X))
    json.dump(ex, open(opt['--export'], 'w'))
    print('exported references for', len(ex), 'model/k pairs')

for spec in (opt.get('--detail') or '').split(','):
    if not spec:
        continue
    model, k = spec.rsplit('|', 1); k = int(k)
    d = detail[(model, k)]; t = [o for o in ops if o[0] == model and o[1] == k][0][2]
    print('\n%s, %d centroids, strict threshold %.3f:' % (model, k, t))
    by = collections.defaultdict(list)
    for i, s_ in d['N'].items():
        by[man[i]['reciter']].append(s_ < t)
    print('  other reciters rejected: ' + ', '.join('%s %d/%d' % (r, sum(v), len(v)) for r, v in sorted(by.items())))
    by = collections.defaultdict(list)
    for i, s_ in d['Q'].items():
        by[E[model][i][1].get('variant')].append(s_ < t)
    print('  edited clips rejected (Abdul Basit, wrongly): ' + (', '.join('%s %d/%d' % (v, sum(x), len(x)) for v, x in sorted(by.items()) if sum(x)) or 'none'))
