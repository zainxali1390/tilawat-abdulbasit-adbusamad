"""Score melody_eval.mjs output.  python3 melody_score.py OUT.jsonl... [--derived finder-new-score.txt]

Per clip (first part of the clip):
  right    the best-scoring recording is the original or a copy, and its place is within 1 s of the truth
  margin   true score minus the best score of any recording that is NOT the original or a copy (the "hard negative")
Hidden view: the best non-original score of every clip is what the melody would report if the original were missing,
so thresholds are chosen from it (a melody "match" must beat every one of them)."""
import json, re, sys, statistics as st
from collections import defaultdict
files = [a for a in sys.argv[1:] if a.endswith('.jsonl')]
derived = defaultdict(set)
if '--derived' in sys.argv:
    for l in open(sys.argv[sys.argv.index('--derived') + 1]):
        m = re.match(r"\s+(e:\S.*?) -> \[(.*)\]", l)
        if m:
            for x in re.findall(r"'([^']+)'", m.group(2)):
                derived[m.group(1)].add(x)
R = [json.loads(l) for f in files for l in open(f)]
def is_ok(r, code):
    if code == r['code'] or code in r['copies']:
        return True
    return any(code.startswith(x) for k, v in derived.items() if r['code'].startswith(k) for x in v)
rows = defaultdict(lambda: defaultdict(list))
neg, pos = [], []
for r in R:
    v = r['variant']; s0 = r['segments'][0]; row = rows[v]
    top = r['top'][0] if r['top'] else None
    t_ok = r['truth'] and r['truth']['at'] is not None and abs(r['truth']['at'] - s0['at']) < 1.0
    best_ok = top and is_ok(r, top['code'])
    right = bool(best_ok and top['at'] is not None and (top['code'] != r['code'] or abs(top['at'] - s0['at']) < 1.0))
    row['right'].append(right)
    other = max([t['score'] for t in r['top'] if not is_ok(r, t['code'])] or [0])
    if r['truth']:
        row['margin'].append(r['truth']['score'] - other)
        if t_ok:
            row['terr'].append(abs(r['truth']['at'] - s0['at']))
            pos.append((r['truth']['score'], v))
    neg.append((other, v, r['name'], next((t['code'] for t in r['top'] if not is_ok(r, t['code'])), '')))
    row['ms'].append(r['ms'])
print('%-15s %4s %6s %8s %8s %6s' % ('variant', 'n', 'right', 'margin', 't_err', 'sec'))
tot = [0, 0]
for v, row in sorted(rows.items()):
    n = len(row['right']); k = sum(row['right']); tot[0] += n; tot[1] += k
    print('%-15s %4d %6d %8.3f %8s %6.1f' % (v, n, k, st.median(row['margin']) if row['margin'] else 0,
          '%.2f' % st.median(row['terr']) if row['terr'] else '-', st.median(row['ms']) / 1000))
print('TOTAL: best recording right (place within 1 s) for %d of %d clips' % (tot[1], tot[0]))
negs = sorted(x[0] for x in neg)
print('hard negatives (best score of a recording that is not the original or a copy): median %.3f, 95th %.3f, 99th %.3f, max %.3f' % (
    st.median(negs), negs[int(0.95 * len(negs))], negs[int(0.99 * len(negs))], negs[-1]))
for th in (0.6, 0.65, 0.7, 0.75, 0.8, 0.85):
    p = sum(1 for s, v in pos if s >= th)
    fp = sum(1 for s, *_ in neg if s >= th)
    print('  threshold %.2f: originals above it %d/%d, other recordings above it %d/%d' % (th, p, len(pos), fp, len(neg)))
print('highest hard negatives:')
for x in sorted(neg, reverse=True)[:8]:
    print('   %.3f %s %s -> %s' % x)
