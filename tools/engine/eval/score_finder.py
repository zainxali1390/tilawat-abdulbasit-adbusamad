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
