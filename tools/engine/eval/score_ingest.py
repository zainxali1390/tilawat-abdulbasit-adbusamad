"""Score the ingestion test (test_ingest.js output): formats decoded, duration right, recitation start within 0.3 s."""
import json, sys
from collections import defaultdict
R = [json.loads(l) for l in open(sys.argv[1])]
F = [r for r in R if r['kind'] == 'format']
C = [r for r in R if r['kind'] == 'case']
byext = defaultdict(lambda: [0, 0, 0, 0])
for r in F:
    e = byext[r['ext']]; e[0] += 1; e[1] += r['ok']; e[2] += r.get('browser', False); e[3] += r['ok'] and abs(r['dur'] - r['expect']) < 0.15
print('formats (files, decoded, by the browser itself, duration within 0.15 s):')
for k, v in byext.items():
    print('  %-5s %s' % (k, v))
by = defaultdict(list)
bad = []
for r in C:
    if not r['ok']:
        by[r['variant']].append(None); bad.append((r['name'], 'decode failed')); continue
    err = r['start'] - r['intro']
    by[r['variant']].append(err)
    if abs(err) > 0.3:
        bad.append((r['name'], 'start %.2f, true %.2f' % (r['start'], r['intro'])))
tot = sum(1 for v in by.values() for e in v if e is not None and abs(e) <= 0.3)
print('recitation start within 0.3 s: %d/%d' % (tot, len(C)))
for k, v in by.items():
    ok = sum(1 for e in v if e is not None and abs(e) <= 0.3)
    print('  %-15s %d/%d  errors %s' % (k, ok, len(v), [None if e is None else round(e, 2) for e in v][:8]))
for b in bad:
    print('   x', b)
