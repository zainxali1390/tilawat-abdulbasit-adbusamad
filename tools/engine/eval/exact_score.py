"""Score run_exact.js (Step 10).  python3 exact_score.py EXACT.jsonl... > exact-score.txt

For every clip (original present):
  in list    the right recording (or a known copy) is on the shortlist
  agree      its two alignments (landmarks, melody) agree on one line
  first      the right recording comes first when the shortlist is ordered by the evidence
             (agree, then landmark inliers, then melody score)
  t_err      |start found - true start| for the right recording (the clip's start in the recording)
For every hidden run (original and known copies removed): which wrong recordings still agree, with their evidence;
these are either undiscovered copies (the same audio: many landmark points on one line) or false agreements, and are
listed for checking. Copies: the clip's own, plus the groups measured in Step 6."""
import json, sys, statistics as st
from collections import defaultdict
HERE = __file__.rsplit('/', 1)[0]
groups = [set(g) for g in json.load(open(HERE + '/results/melody-local-20261125-2236/copy-groups.json'))['groups']]
same = lambda a, b: a == b or any(a in g and b in g for g in groups)
R = [json.loads(l) for f in sys.argv[1:] for l in open(f)]
key = lambda x: (x['agree'], x['lm']['inl'], x['mel']['score'])
rows = defaultdict(lambda: defaultdict(list)); errs = []
hid_agree = []; truth_ev = []; wrong_ev = []
for r in R:
    if r.get('error'):
        errs.append((r['name'], r['hide'], r['error'][:80])); continue
    truth = list({g['code'] for g in r['segments']} | set(r.get('copies') or []))
    ok = lambda c: any(same(c, t) for t in truth)
    L = sorted(r['list'], key=key, reverse=True)
    if not r['hide']:
        row = rows[r['variant']]
        tr = next((x for x in L if ok(x['code'])), None)
        row['in'].append(tr is not None)
        row['agree'].append(bool(tr and tr['agree']))
        row['first'].append(bool(L and ok(L[0]['code'])))
        row['ms'].append(r.get('ms', {}).get('exact', 0) if isinstance(r.get('ms'), dict) else 0)
        if tr:
            truth_ev.append((tr['agree'], tr['lm']['inl'], tr['mel']['score'], r['variant']))
            starts = [g['at'] - g['a'] * g['rate'] for g in r['segments'] if same(g['code'], tr['code'])]
            b = tr['lm']['b'] if tr['lm']['inl'] >= 3 and tr['lm']['b'] is not None else tr['mel']['at']
            if b is not None and starts and tr['code'] in [g['code'] for g in r['segments']]:
                row['terr'].append(min(abs(b - s) for s in starts))
        for x in L:
            if not ok(x['code']): wrong_ev.append((x['agree'], x['lm']['inl'], x['mel']['score']))
    else:
        for x in L:
            if ok(x['code']): continue
            if x['agree']: hid_agree.append((x['lm']['inl'], x['mel']['score'], x['lm']['k'], r['name'], x['code'], x['lm']['b']))
print('%-15s %4s %6s %6s %6s %8s' % ('edit', 'n', 'inlist', 'agree', 'first', 't_err'))
T = defaultdict(int)
for v, row in sorted(rows.items()):
    n = len(row['in']); a, b, c = sum(row['in']), sum(row['agree']), sum(row['first'])
    T['n'] += n; T['in'] += a; T['agree'] += b; T['first'] += c
    print('%-15s %4d %6d %6d %6d %8s' % (v, n, a, b, c, '%.2f' % st.median(row['terr']) if row['terr'] else '-'))
print('TOTAL %d clips: right recording in the shortlist %d, its alignments agree %d, first by the evidence %d' % (T['n'], T['in'], T['agree'], T['first']))
te = [e for row in rows.values() for e in row['terr']]
if te:
    te.sort(); print('start error of the right recording: median %.2f s, 90th %.2f s, within 0.5 s: %d/%d' % (st.median(te), te[int(0.9 * len(te))], sum(1 for e in te if e <= 0.5), len(te)))
print('\nright recording, evidence: agree %d/%d; landmark inliers median %s; melody score median %.3f' % (
    sum(1 for e in truth_ev if e[0]), len(truth_ev), st.median([e[1] for e in truth_ev]) if truth_ev else '-', st.median([e[2] for e in truth_ev]) if truth_ev else 0))
print('wrong recordings on the shortlists (present runs): %d; agreeing %d' % (len(wrong_ev), sum(1 for e in wrong_ev if e[0])))
print('\nhidden runs (%d): wrong recordings that still AGREE: %d (in %d runs)' % (sum(1 for r in R if r['hide']), len(hid_agree), len({h[3] for h in hid_agree})))
for th in (3, 4, 6, 8, 10):
    print('  agreeing with >= %2d landmark inliers: %d' % (th, sum(1 for h in hid_agree if h[0] >= th)))
print('  listed (inliers, melody score, tempo, clip, recording, start):')
for h in sorted(hid_agree, reverse=True)[:40]:
    print('   %3d %.3f %s %-20s %s @%s' % (h[0], h[1], h[2], h[3], h[4][:60], h[5]))
if errs:
    print('\nerrors: %d' % len(errs), errs[:5])
