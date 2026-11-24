"""Builds the recording index used by "Find a recitation" (js/finder.js).

  python build_index.py list  --out recs.json                 every recording in the app, with its audio address
  python build_index.py part  --recs recs.json --part 3 --of 20 --out parts/
                                                              download + fingerprint one share of the recordings
  python build_index.py merge --recs recs.json --parts parts/ --out fp/
                                                              write fp/manifest.json and fp/s/XX/YY.bin

Index file format (read by js/finder.js):
  a landmark hash has 20 bits; the file is chosen by its top 16 bits: fp/s/<hex of bits 19..12>/<hex of bits 11..4>.bin
  file = 16 little-endian uint16 counts (one per value of the low 4 bits), then the entries for low bits 0, 1, … 15,
  each a little-endian uint32 = recording number << 18 | time in steps of TUNIT frames (64 ms, up to 4 h 39 min)
manifest.json lists the recordings in recording-number order as [code, seconds]; code is the app's share code
("e:<collection>:<file>" or "s:<set>:<surah>").
"""
import argparse, json, os, re, sys, time, subprocess, tempfile, datetime
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import quote, unquote
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
from fpcore import PARAMS, INDEX_DENSITY, QUERY_DENSITY, fingerprint, load_audio

MAX_RECS = 1 << 12        # 4096 recording numbers (12 bits)
MAX_FRAMES = 1 << 18
TUNIT = 2                 # stored time step, in 32 ms frames


def enc(s):  # same as JavaScript encodeURIComponent
    return quote(s, safe="-_.!~*'()")


def list_recs():
    cfg = open(os.path.join(ROOT, 'js', 'library-config.js'), encoding='utf-8').read()
    base = dict(re.findall(r'(\w+):"([^"]+)"', cfg[cfg.index('const EG_BASE='):cfg.index('\n', cfg.index('const EG_BASE='))]))
    recs = []
    for rid, b in re.findall(r'\{id:"(\w+)".*?surahs:surahSet\("([^"]+)"\)', cfg):
        for n in range(1, 115):
            recs.append(dict(code='s:%s:%d' % (rid, n), url=b + '%03d.mp3' % n))
    areas = open(os.path.join(ROOT, 'data', 'areas.js'), encoding='utf-8').read()
    i = areas.index('const AREAS=') + len('const AREAS=')
    A = json.loads(areas[i:areas.index(';\n', i)])
    seen = set()
    for a in A:
        for sc in a['secs']:
            for it in sc['items']:
                code = 'e:%s:%s' % (it[0], it[1])
                if code in seen or it[0] not in base:
                    continue
                seen.add(code)
                recs.append(dict(code=code, url=base[it[0]] + enc(it[1])))
    assert len(recs) <= MAX_RECS, len(recs)
    return recs


def one(rec_id, rec, tmpdir, local):
    t0 = time.time()
    path = local.get(rec['code']) if local else None
    tmp = None
    try:
        if not path and not rec['url'].startswith('http'):   # audio kept in this repository (EG_BASE L:"audio/")
            path = os.path.join(ROOT, unquote(rec['url']))
        if not path:
            tmp = os.path.join(tmpdir, 'a%d' % rec_id)
            r = subprocess.run(['curl', '-sS', '-L', '--fail', '--retry', '6', '--retry-delay', '10', '--retry-all-errors',
                                '--connect-timeout', '30', '-m', '2400', '-A', 'abdulbasit-app-indexer', '-o', tmp, rec['url']],
                               capture_output=True, text=True)
            if r.returncode != 0:
                return rec_id, None, 'download failed: ' + (r.stderr.strip()[-200:] or str(r.returncode))
            path = tmp
        x = load_audio(path)
        dur = len(x) / PARAMS['sr']
        if dur < 3:
            return rec_id, None, 'no audio'
        lm = fingerprint(x, INDEX_DENSITY)
        h = np.fromiter((a for a, _ in lm), np.uint32, len(lm))
        t = np.fromiter((b for _, b in lm), np.uint32, len(lm))
        if len(t) and t.max() // TUNIT >= MAX_FRAMES:
            return rec_id, None, 'too long to index'
        t = t // TUNIT
        return rec_id, (h, t, dur), 'ok %.0fs audio in %.0fs' % (dur, time.time() - t0)
    except Exception as e:
        return rec_id, None, 'error: %s' % str(e)[-200:]
    finally:
        if tmp and os.path.exists(tmp):
            os.remove(tmp)


def part(recs, k, n, out, local=None, workers=4):
    os.makedirs(out, exist_ok=True)
    mine = [(i, r) for i, r in enumerate(recs) if i % n == k]
    H, R, T, status = [], [], [], {}
    with tempfile.TemporaryDirectory() as td, ThreadPoolExecutor(workers) as ex:
        for rid, res, msg in ex.map(lambda ir: one(ir[0], ir[1], td, local), mine):
            print('[%d] %s %s' % (rid, recs[rid]['code'][:70], msg), flush=True)
            if res:
                h, t, dur = res
                H.append(h); T.append(t); R.append(np.full(len(h), rid, np.uint16))
                status[rid] = dict(ok=True, dur=round(dur, 1))
            else:
                status[rid] = dict(ok=False, err=msg)
    cat = lambda L, d: np.concatenate(L) if L else np.zeros(0, d)
    np.savez_compressed(os.path.join(out, 'part-%03d.npz' % k), h=cat(H, np.uint32), r=cat(R, np.uint16), t=cat(T, np.uint32))
    json.dump(status, open(os.path.join(out, 'part-%03d.json' % k), 'w'))
    print('part %d/%d: %d ok, %d failed' % (k, n, sum(s['ok'] for s in status.values()), sum(not s['ok'] for s in status.values())))


def merge(recs, parts, out):
    H, R, T, status = [], [], [], {}
    for f in sorted(os.listdir(parts)):
        p = os.path.join(parts, f)
        if f.endswith('.npz'):
            z = np.load(p); H.append(z['h']); R.append(z['r']); T.append(z['t'])
        elif f.endswith('.json'):
            status.update({int(k): v for k, v in json.load(open(p)).items()})
    h = np.concatenate(H); r = np.concatenate(R).astype(np.uint32); t = np.concatenate(T)
    order = np.lexsort((t, r, h))
    h, r, t = h[order], r[order], t[order]
    entry = (r << 18) | t
    shard = h >> 4
    low = h & 15
    bounds = np.searchsorted(shard, np.arange((1 << 16) + 1))
    sdir = os.path.join(out, 's')
    os.makedirs(sdir, exist_ok=True)
    for s in range(1 << 16):
        a, b = bounds[s], bounds[s + 1]
        counts = np.bincount(low[a:b], minlength=16).astype('<u2')
        d = os.path.join(sdir, '%02x' % (s >> 8))
        if s & 255 == 0:
            os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, '%02x.bin' % (s & 255)), 'wb') as fh:
            fh.write(counts.tobytes()); fh.write(entry[a:b].astype('<u4').tobytes())
    ok = [i for i in range(len(recs)) if status.get(i, {}).get('ok')]
    man = dict(v=2, tunit=TUNIT, built=datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d'), params=PARAMS,
               index_density=INDEX_DENSITY, query_density=QUERY_DENSITY, shards=1 << 16, low_bits=4,
               hashes=int(len(h)), hours=round(sum(status[i]['dur'] for i in ok) / 3600, 1),
               recs=[[recs[i]['code'], status.get(i, {}).get('dur', 0) if status.get(i, {}).get('ok') else 0] for i in range(len(recs))],
               failed=[recs[i]['code'] for i in range(len(recs)) if not status.get(i, {}).get('ok')])
    json.dump(man, open(os.path.join(out, 'manifest.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    print('index: %d recordings (%d failed), %.0f hours, %d landmarks, %.0f MB' % (
        len(ok), len(man['failed']), man['hours'], len(h), len(h) * 4 / 1e6))


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['list', 'part', 'merge'])
    ap.add_argument('--recs', default='recs.json'); ap.add_argument('--out', default='.')
    ap.add_argument('--part', type=int, default=0); ap.add_argument('--of', type=int, default=1)
    ap.add_argument('--parts', default='parts'); ap.add_argument('--local', default=None)
    ap.add_argument('--workers', type=int, default=4)
    a = ap.parse_args()
    if a.cmd == 'list':
        recs = list_recs()
        json.dump(recs, open(a.out if a.out.endswith('.json') else os.path.join(a.out, 'recs.json'), 'w'), ensure_ascii=False)
        print(len(recs), 'recordings')
    elif a.cmd == 'part':
        part(json.load(open(a.recs)), a.part, a.of, a.out, json.load(open(a.local)) if a.local else None, a.workers)
    else:
        merge(json.load(open(a.recs)), a.parts, a.out)
