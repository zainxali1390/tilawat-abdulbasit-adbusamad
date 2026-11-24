"""Duplicate check by sound, against the recording index.

  python check_audio.py part  --list candidates.json --part 3 --of 24 --out parts/
  python check_audio.py merge --list candidates.json --parts parts/ --out report.json

The list is [{"id": .., "url": .., "length": seconds, "self": recording number or null}, ...].
Three 25 s samples of each file (at about 15 %, 50 % and 82 %) are read straight from the web address (ffmpeg
seeks inside the file, so the whole file is not downloaded) and searched in fp/. "self" is left out of the search,
so a recording already in the library can be checked against all the others.
"""
import argparse, json, os, sys
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from fpcore import load_audio
from match import Index

ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))


def windows(L):
    if not L or L < 40:
        return [0]
    return sorted(set(max(5, min(int(L * f), int(L) - 30)) for f in (0.15, 0.5, 0.82)))


def check(idx, c):
    out = []
    for t in windows(c.get('length')):
        try:
            x = load_audio(c['url'], start=t, dur=25)
        except Exception as e:
            out.append(dict(t=t, err=str(e)[-160:])); continue
        if len(x) < 8000 * 8:
            out.append(dict(t=t, err='too little audio')); continue
        out.append(dict(t=t, res=idx.decide(x, exclude=c.get('self'))))
    return dict(id=c['id'], windows=out)


def part(lst, k, n, out, workers=6):
    idx = Index(os.path.join(ROOT, 'fp'))
    mine = [c for i, c in enumerate(lst) if i % n == k]
    os.makedirs(out, exist_ok=True)
    res = []
    with ThreadPoolExecutor(workers) as ex:
        for r in ex.map(lambda c: check(idx, c), mine):
            best = [w.get('res') or {} for w in r['windows']]
            print(r['id'], [(b.get('level'), (b.get('code') or '')[:40], b.get('offset')) for b in best], flush=True)
            res.append(r)
    json.dump(res, open(os.path.join(out, 'check-%03d.json' % k), 'w'), ensure_ascii=False)


def merge(lst, parts, out):
    res = []
    for f in sorted(os.listdir(parts)):
        if f.endswith('.json'):
            res += json.load(open(os.path.join(parts, f)))
    byid = {c['id']: c for c in lst}
    for r in res:
        r.update({k: v for k, v in byid[r['id']].items() if k not in ('id',)})
        conf = [w['res'] for w in r['windows'] if w.get('res') and w['res'].get('level') == 'confirmed']
        poss = [w['res'] for w in r['windows'] if w.get('res') and w['res'].get('level') == 'possible']
        errs = sum(1 for w in r['windows'] if w.get('err'))
        codes = {}
        for x in conf:
            codes[x['code']] = codes.get(x['code'], 0) + 1
        if conf:
            r['verdict'] = 'duplicate'
            r['same_as'] = sorted(codes, key=lambda k: -codes[k])
        elif poss:
            r['verdict'] = 'unclear'
        elif errs == len(r['windows']):
            r['verdict'] = 'unreadable'
        else:
            r['verdict'] = 'new'
    json.dump(res, open(out, 'w'), ensure_ascii=False)
    from collections import Counter
    print(Counter(r['verdict'] for r in res))


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['part', 'merge'])
    ap.add_argument('--list', required=True); ap.add_argument('--part', type=int, default=0); ap.add_argument('--of', type=int, default=1)
    ap.add_argument('--out', default='parts'); ap.add_argument('--parts', default='parts'); ap.add_argument('--workers', type=int, default=6)
    a = ap.parse_args()
    lst = json.load(open(a.list))
    if a.cmd == 'part':
        part(lst, a.part, a.of, a.out, a.workers)
    else:
        merge(lst, a.parts, a.out)
