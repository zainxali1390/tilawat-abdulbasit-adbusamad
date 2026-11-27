"""Score the parts of run_exact.js output (Step 13).  python3 parts_score.py EXACT.jsonl[.gz] COPY_GROUPS.json

Every true segment of a clip (one for most edits; 2 or 3 for joined clips) counts as FOUND when a part at High or
Confirmed names its recording (or a copy), overlaps it by at least half, and, for the recording itself, starts within
0.5 s of the true place. A part at High or better that matches no segment is a FALSE part (a wrong recording, or a
segment reported twice). Hidden runs: every part at High or better names a wrong recording unless it is a copy.
Today's finder (its confirmed results, each with its clip span) is scored the same way."""
import json, sys, gzip
from collections import defaultdict
op = lambda f: gzip.open(f, 'rt') if f.endswith('.gz') else open(f)
R = [json.loads(l) for l in op(sys.argv[1])]
G = [set(g) for g in json.load(open(sys.argv[2]))['groups']]
same = lambda a, b: a == b or any(a in g and b in g for g in G)
GOOD = ('confirmed', 'high')
def score(parts, segs, truth_codes, hide):
    """parts: [(clipA, clipB, code, start)] -> (found segments, false parts)"""
    found = set(); false = 0
    for (a, b, code, start) in parts:
        hit = None
        for i, g in enumerate(segs):
            if not same(code, g['code']): continue
            ov = min(b, g['b']) - max(a, g['a'])
            if ov < 0.5 * (g['b'] - g['a']): continue
            if code == g['code'] and start is not None and abs(start - (g['at'] + (max(a, g['a']) - g['a']) * g['rate'])) > 0.5: continue
            hit = i; break
        if hit is None or hit in found:
            if hide and any(same(code, t) for t in truth_codes): continue   # a copy of a hidden part: not counted
            false += 1
        else: found.add(hit)
    return found, false
rows = defaultdict(lambda: defaultdict(int)); H = defaultdict(int)
for r in R:
    if r.get('error'): continue
    segs = r['segments']; truth = {g['code'] for g in segs} | set(r.get('copies') or [])
    eng = [(p['clipA'], p['clipB'], p['code'], p['start']) for p in r.get('parts', []) if p['level'] in GOOD and p['code']]
    fin = [(f.get('clipA') or 0, f.get('clipB') or r.get('dur', 0), f['code'], f.get('start')) for f in r.get('finder') or [] if f.get('level') == 'confirmed']
    if not r['hide']:
        v = rows[r['variant']]; v['n'] += 1; v['segs'] += len(segs)
        f, x = score(eng, segs, truth, False); v['found'] += len(f); v['false'] += x; v['all'] += len(f) == len(segs)
        f, x = score(fin, segs, truth, False); v['ffound'] += len(f); v['ffalse'] += x; v['fall'] += len(f) == len(segs)
        v['poss'] += sum(1 for p in r.get('parts', []) if p['level'] == 'possible')
    else:
        _, x = score(eng, [], truth, True); H['eng'] += x
        _, x = score(fin, [], truth, True); H['fin'] += x; H['runs'] += 1
print('%-15s %4s %5s | %-24s | %-24s' % ('edit', 'n', 'segs', 'engine: found/all/false', 'finder: found/all/false'))
T = defaultdict(int)
for k, v in sorted(rows.items()):
    for q in v: T[q] += v[q]
    print('%-15s %4d %5d | %6d %6d %6d       | %6d %6d %6d' % (k, v['n'], v['segs'], v['found'], v['all'], v['false'], v['ffound'], v['fall'], v['ffalse']))
print('TOTAL %d clips, %d segments: engine found %d segments (every part of the clip: %d clips), false parts %d; finder found %d (%d clips), false %d' % (
    T['n'], T['segs'], T['found'], T['all'], T['false'], T['ffound'], T['fall'], T['ffalse']))
J = {k: v for k, v in rows.items() if k.startswith('join')}
js = sum(v['segs'] for v in J.values())
print('JOINED clips (%d clips, %d segments): engine %d segments, every part %d clips; finder %d segments, every part %d clips' % (
    sum(v['n'] for v in J.values()), js, sum(v['found'] for v in J.values()), sum(v['all'] for v in J.values()), sum(v['ffound'] for v in J.values()), sum(v['fall'] for v in J.values())))
print('hidden runs (%d): parts at High or better naming a wrong recording: engine %d, finder (confirmed) %d' % (H['runs'], H['eng'], H['fin']))
