"""Score the timestamps of run_exact.js output (Step 11).  python3 timestamp_score.py EXACT.jsonl[.gz]...

For every clip (original present) whose right recording (not a copy: the true times are known only for the original)
is on the shortlist with a timestamp:
  start   |start found - true start of the matched segment| in the original (s)
  clipA   |clip time where the match starts - the segment's start in the clip| (an intro must be left out)
  end     |end found - true end of the segment| (s)
  dur     |original duration found - true| (s)
The segment compared is the one the found line passes closest to (joined clips: the part found). The app's current
finder (its first result for the right recording) is scored the same way."""
import json, sys, gzip, statistics as st
from collections import defaultdict
op = lambda f: gzip.open(f, 'rt') if f.endswith('.gz') else open(f)
R = [json.loads(l) for f in sys.argv[1:] for l in op(f)]
rows = defaultdict(lambda: defaultdict(list)); fin = defaultdict(list); srcs = defaultdict(int); cover = []
for r in R:
    if r['hide'] or r.get('error'): continue
    segs = r['segments']; codes = {g['code'] for g in segs}
    x = next((x for x in sorted(r['list'], key=lambda x: (x['agree'], x['lm']['inl'], x['mel']['score']), reverse=True) if x['code'] in codes and x.get('ts')), None)
    if not x: continue
    t = x['ts']; mine = [g for g in segs if g['code'] == x['code']]
    g = min(mine, key=lambda g: abs((t['k'] * g['a'] + (t['start'] - t['k'] * t['clipA'])) - g['at']))
    tend = g['at'] + (g['b'] - g['a']) * g['rate']
    row = rows[r['variant']]
    row['start'].append(abs(t['start'] - g['at'])); row['clipA'].append(abs(t['clipA'] - g['a']))
    row['end'].append(abs(t['end'] - tend)); row['dur'].append(abs((t['end'] - t['start']) - (tend - g['at'])))
    row['within'].append(abs(t['start'] - g['at']) <= max(t['err'] * 3, 0.1))
    srcs[t['src']] += 1; cover.append(abs(t['start'] - g['at']) <= 3 * t['err'] + 0.05)
    f = next((f for f in (r.get('finder') or []) if f['code'] == x['code'] and f.get('start') is not None), None)
    if f:
        gf = min(mine, key=lambda g: abs(f['start'] - g['at']))
        fin['start'].append(abs(f['start'] - gf['at'])); fin['clipA'].append(abs((f.get('clipA') or 0) - gf['a']))
        if f.get('end') is not None: fin['end'].append(abs(f['end'] - (gf['at'] + (gf['b'] - gf['a']) * gf['rate'])))
med = lambda a: '%.2f' % st.median(a) if a else '-'
p90 = lambda a: '%.2f' % sorted(a)[int(0.9 * len(a))] if a else '-'
print('%-15s %4s %7s %7s %7s %7s %7s' % ('edit', 'n', 'start', 'start90', 'clipA', 'end', 'dur'))
A = defaultdict(list)
for v, row in sorted(rows.items()):
    for k in row: A[k] += row[k]
    print('%-15s %4d %7s %7s %7s %7s %7s' % (v, len(row['start']), med(row['start']), p90(row['start']), med(row['clipA']), med(row['end']), med(row['dur'])))
n = len(A['start'])
print('ALL %d clips: start median %s s, 90th %s, max %.2f; within 0.1 s %d, within 0.5 s %d, within 1 s %d' % (
    n, med(A['start']), p90(A['start']), max(A['start']), sum(e <= 0.1 for e in A['start']), sum(e <= 0.5 for e in A['start']), sum(e <= 1 for e in A['start'])))
print('  clip start (intro left out): median %s, within 0.5 s %d/%d; end: median %s, 90th %s; duration: median %s' % (
    med(A['clipA']), sum(e <= 0.5 for e in A['clipA']), n, med(A['end']), p90(A['end']), med(A['dur'])))
print('  line used: %s; the stated error (3 x err + 0.05 s) covers the true start for %d/%d' % (dict(srcs), sum(cover), len(cover)))
m = len(fin['start'])
if m:
    print('\nthe current finder on the same clips (%d with a result for the right recording): start median %s, 90th %s, within 0.5 s %d; clip start within 0.5 s %d; end median %s' % (
        m, med(fin['start']), p90(fin['start']), sum(e <= 0.5 for e in fin['start']), sum(e <= 0.5 for e in fin['clipA']), med(fin['end'])))
