"""Score run_finder.js output per variant.

In the library (original present):
  right_conf   the first result is the original or one of its copies, confirmed
  right_poss   … only "possible"
  wrong_conf   the first result is another recording, confirmed            (a false identification)
  none         no answer
  t_err        |start − true time| when the first result is the original itself (seconds)
  parts        joined clips: parts found (a result on that recording within 1.5 s of the part's true time) / parts
Hidden (original and its copies left out):
  false_conf   a confirmed result on any recording that is not legitimately in the clip
"""
import json, sys
from collections import defaultdict
import statistics as st

R = [json.loads(l) for f in sys.argv[1:] for l in open(f)]

# Copies at a different tape speed (3-6 % is common for old transfers) are missed by the index-only copy check: with the
# speed changed, the stored landmarks no longer line up. They are found here from the searches themselves: a candidate is a
# copy of a source when >= 3 clips taken at different points of the source (spread over >= 300 s) map onto it along ONE
# straight time line (time in candidate = k * time in source + b, 0.85 <= k <= 1.18, within 3 s). Two different
# performances cannot line up like that at many far-apart points; partial or re-ordered copies give a line per part.
pts = defaultdict(list)
for r in R:
    if len(r['segments']) != 1:
        continue
    s0 = r['segments'][0]
    for x in r['list']:
        if x.get('level') == 'confirmed' and x['code'] != s0['code'] and x.get('start') is not None:
            pts[(s0['code'], x['code'])].append((s0['at'], x['start'], r['name']))
derived = defaultdict(set)
import random
for (src, cand), P in pts.items():
    P = list({(round(a, 1), round(b, 1)): (a, b) for a, b, _ in P}.values())
    if len(P) < 3:
        continue
    best = []
    for i in range(len(P)):
        for j in range(len(P)):
            if abs(P[j][0] - P[i][0]) < 60:
                continue
            k = (P[j][1] - P[i][1]) / (P[j][0] - P[i][0])
            if not 0.85 <= k <= 1.18:
                continue
            b0 = P[i][1] - k * P[i][0]
            inl = [p for p in P if abs(p[1] - (k * p[0] + b0)) < 3]
            if len(inl) > len(best):
                best = inl
    if len(best) >= 3 and max(p[0] for p in best) - min(p[0] for p in best) >= 300:
        derived[src].add(cand)
if derived:
    print('copies found by the searches (one time line through >= 3 far-apart clips):')
    for k, v in derived.items():
        print('   %s -> %s' % (k[:45], [x[:45] for x in sorted(v)]))
for r in R:
    r['copies'] = sorted(set(r['copies']) | derived.get(r['code'], set()))
    oc = r.get('other_copies') or {}
    for c in list(oc):
        oc[c] = sorted(set(oc[c]) | derived.get(c, set()))


def okset(seg, r):
    s = {seg['code']} | set((r.get('other_copies') or {}).get(seg['code'], []))
    if seg['code'] == r['code']:
        s |= set(r['copies'])
    return s


rows = defaultdict(lambda: defaultdict(list))
bad = []
for r in R:
    v = r['variant']; L = [x for x in r['list'] if x.get('level')]
    row = rows[v]
    row['ms'].append(r['ms'])
    if not r['hide']:
        truth = okset(r['segments'][0], r)
        top = L[0] if L else None
        if not top:
            row['none'].append(1)
        else:
            allc = {top['code']} | set(top.get('copies') or [])
            right = bool(allc & truth) or any(allc & okset(s, r) for s in r['segments'])
            key = ('right_' if right else 'wrong_') + ('conf' if top['level'] == 'confirmed' else 'poss')
            row[key].append(1)
            if not right:
                bad.append((r['name'], top['code'][:50], top['level']))
            for s in r['segments']:
                if top['code'] == s['code'] and top.get('start') is not None and abs(top['start'] - s['at']) < 30:
                    row['t_err'].append(abs(top['start'] - s['at'])); break
        if len(r['segments']) > 1:
            found = 0
            for s in r['segments']:
                if any((x['code'] in okset(s, r)) and (x['code'] != s['code'] or x.get('start') is None or abs(x['start'] - s['at']) < 1.5) for x in L):
                    found += 1
            row['parts'].append((found, len(r['segments'])))
    else:
        legit = set()
        for s in r['segments'][1:] if r['segments'][0]['code'] == r['code'] else r['segments']:
            legit |= okset(s, r)
        hidden = {r['code']} | set(r['copies'])
        fc = [x for x in L if x['level'] == 'confirmed' and x['code'] not in legit and x['code'] not in hidden]
        row['hidden_n'].append(1)
        if fc:
            row['false_conf'].append(1); bad.append(('HIDDEN ' + r['name'], fc[0]['code'][:50], 'confirmed'))
tot = defaultdict(int)
print('%-15s %4s %6s %6s %6s %5s %8s %7s %6s %6s' % ('variant', 'n', 'right', 'poss', 'WRONG', 'none', 't_err', 'parts', 'FALSE', 'sec'))
for v, row in rows.items():
    n = len(row['right_conf']) + len(row['right_poss']) + len(row['wrong_conf']) + len(row['wrong_poss']) + len(row['none'])
    for k in ('right_conf', 'right_poss', 'wrong_conf', 'none', 'false_conf', 'hidden_n'):
        tot[k] += len(row[k])
    tot['n'] += n
    pf = sum(a for a, b in row['parts']); pt = sum(b for a, b in row['parts'])
    print('%-15s %4d %6d %6d %6d %5d %8s %7s %6s %6.0f' % (v, n, len(row['right_conf']), len(row['right_poss']), len(row['wrong_conf']), len(row['none']),
          '%.2f' % st.median(row['t_err']) if row['t_err'] else '-', '%d/%d' % (pf, pt) if pt else '-',
          '%d/%d' % (len(row['false_conf']), len(row['hidden_n'])), st.median(row['ms']) / 1000))
print('TOTAL: %d clips; right & confirmed %d; right, possible %d; WRONG confirmed %d; no answer %d; hidden runs %d, FALSE confirmed %d' % (
    tot['n'], tot['right_conf'], tot['right_poss'], tot['wrong_conf'], tot['none'], tot['hidden_n'], tot['false_conf']))
for b in bad:
    print('   x', b)
