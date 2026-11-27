"""Step 15 extras from run_exact.js output.  python3 fresh_extra.py EXACT.jsonl[.gz] COPY_GROUPS.json
- the speed shortcut: for clips where the melody candidate search was skipped, do the parts differ from the full engine?
- time per stage and downloads per search (bytes by index)."""
import json, sys, gzip, statistics as st
from collections import defaultdict
op = lambda f: gzip.open(f, 'rt') if f.endswith('.gz') else open(f)
R = [json.loads(l) for l in op(sys.argv[1]) if l.strip()]
G = [set(g) for g in json.load(open(sys.argv[2]))['groups']]
same = lambda a, b: a == b or any(a in g and b in g for g in G)
key = lambda ps: sorted((p['level'], p['code'], round(p['start'] or 0)) for p in ps if p['level'] in ('confirmed', 'high'))
sk = [r for r in R if not r.get('error') and r.get('skipped')]
diff = [r for r in sk if r.get('partsFull') is not None and key(r['parts']) != key(r['partsFull'])]
print('speed shortcut: melody search skipped for %d of %d runs; the answer at High or better differs from the full engine in %d' % (len(sk), len(R), len(diff)))
for r in diff[:10]:
    print('   ', r['name'], 'hidden' if r['hide'] else '', 'shortcut:', key(r['parts']), 'full:', key(r['partsFull']))
ms = defaultdict(list)
for r in R:
    m = r.get('ms') or {}
    if isinstance(m, dict):
        for k, v in m.items(): ms[k].append(v)
    ms['finder+engine (whole search)'].append(r.get('ms_total', 0))
med = lambda a: sorted(a)[len(a) // 2] if a else 0
p90 = lambda a: sorted(a)[int(0.9 * len(a))] if a else 0
print('time (ms): ' + '; '.join('%s median %d, 90th %d' % (k, med(v), p90(v)) for k, v in ms.items() if k in ('engine', 'engineFull') and v))
tot = [r['ms'] if isinstance(r.get('ms'), int) else 0 for r in R]
by = defaultdict(list)
for r in R:
    for k, v in (r.get('bytes') or {}).items(): by[k].append(v)
print('downloads per search (bytes, median / 90th; the browser cache is warm after the first clips): ' + '; '.join('%s %d / %d' % (k, med(v), p90(v)) for k, v in sorted(by.items())))
