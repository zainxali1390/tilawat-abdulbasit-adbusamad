"""Same recording elsewhere in the library, for every recording whose place is not known.

Reads the whole recording index (fp/) once. Two files of the same recording share many landmarks at times that line up
(time in one = speed x time in the other + offset). Candidates come from landmark votes per time band; each candidate
is then confirmed by fitting that straight line (RANSAC) over the shared landmarks.

  python3 tools/library/same_audio_library.py   ->  tools/library/research/same-audio-library.json
"""
import json, os, sys
import numpy as np
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
FP = os.path.join(ROOT, 'fp')
man = json.load(open(os.path.join(FP, 'manifest.json')))
codes = [r[0] for r in man['recs']]; dur = [r[1] for r in man['recs']]; tunit = man.get('tunit', 1)
inv = json.load(open(os.path.join(ROOT, 'tools', 'library', 'research', 'investigation.json')))
ucode = [x['code'] for x in inv if x['code'] in codes]
uidx = {codes.index(c): i for i, c in enumerate(ucode)}
is_u = np.zeros(len(codes) + 1, bool); is_u[list(uidx)] = True
umap = np.full(len(codes) + 1, -1, np.int64)
for r, i in uidx.items(): umap[r] = i
SEC = 0.032 * tunit
keys = []; pairs_pts = {}
nf = 0
for d in sorted(os.listdir(os.path.join(FP, 's'))):
    for f in sorted(os.listdir(os.path.join(FP, 's', d))):
        b = open(os.path.join(FP, 's', d, f), 'rb').read()
        cnt = np.frombuffer(b[:32], '<u2').astype(np.int64); ent = np.frombuffer(b[32:], '<u4')
        st = np.concatenate([[0], np.cumsum(cnt)])
        for lo in range(16):
            g = ent[st[lo]:st[lo + 1]]
            if len(g) < 2 or len(g) > 400: continue
            rec = (g >> 18).astype(np.int64); t = (g & 262143).astype(np.int64) * tunit
            um = is_u[rec] & ((t // tunit) % 100 == 7)      # 1 in 100 of each unknown recording's landmarks (by time)
            if not um.any(): continue
            ui = np.nonzero(um)[0]
            for a in ui:
                o = np.arange(len(g)); o = o[(rec != rec[a])]
                if not len(o): continue
                off = ((t[o] - t[a]) * 0.032 / 4).astype(np.int64) + 8192     # 4-second bands
                keys.append((umap[rec[a]] << 30) | (rec[o] << 14) | np.clip(off, 0, 16383))
        nf += 1
    print(d, nf, 'index files', sum(len(x) for x in keys), 'votes', flush=True) if int(d, 16) % 32 == 0 else None
k = np.concatenate(keys); u, c = np.unique(k, return_counts=True)
pair = u >> 14; band = u & 16383
res = {}
# votes in the best run of 12 consecutive bands (48 s of drift allowed) per pair
order = np.lexsort((band, pair)); pair, band, c = pair[order], band[order], c[order]
starts = np.r_[0, np.nonzero(np.diff(pair))[0] + 1, len(pair)]
cand = []
for s, e in zip(starts[:-1], starts[1:]):
    if c[s:e].sum() < 25: continue
    bb, cc = band[s:e], c[s:e]
    best = 0
    for i in range(len(bb)):
        j = np.searchsorted(bb, bb[i] + 12)
        best = max(best, cc[i:j].sum())
    if best >= 25: cand.append((int(pair[s]), int(best), int(cc.sum())))
print(len(cand), 'candidate pairs')
json.dump([{'u': ucode[p >> 16], 'other': codes[p & 65535], 'band_votes': b, 'votes': v} for p, b, v in cand],
          open(os.path.join(ROOT, 'tools', 'library', 'research', 'same-audio-candidates.json'), 'w'), ensure_ascii=False)

# ---- confirm each candidate: all shared landmarks, one straight line over most of the shorter recording ----
need = sorted({codes.index(x['u']) for x in json.load(open(os.path.join(ROOT, 'tools', 'library', 'research', 'same-audio-candidates.json')))} |
              {codes.index(x['other']) for x in json.load(open(os.path.join(ROOT, 'tools', 'library', 'research', 'same-audio-candidates.json')))})
needset = np.zeros(len(codes) + 1, bool); needset[need] = True
H = {r: ([], []) for r in need}
for d in sorted(os.listdir(os.path.join(FP, 's'))):
    for f in sorted(os.listdir(os.path.join(FP, 's', d))):
        b = open(os.path.join(FP, 's', d, f), 'rb').read()
        cnt = np.frombuffer(b[:32], '<u2').astype(np.int64); ent = np.frombuffer(b[32:], '<u4')
        rec = (ent >> 18).astype(np.int64); sel = needset[rec]
        if not sel.any(): continue
        lo = np.searchsorted(np.cumsum(cnt), np.nonzero(sel)[0], side='right')
        base = (int(d, 16) << 8 | int(f[:2], 16)) << 4
        for r, h, t in zip(rec[sel], base + lo, (ent[sel] & 262143).astype(np.int64) * tunit):
            H[int(r)][0].append(int(h)); H[int(r)][1].append(int(t))
for r in H: H[r] = (np.array(H[r][0], np.int64), np.array(H[r][1], np.float64) * 0.032)
rng = np.random.default_rng(1)
def fit(a, b):
    ha, ta = H[a]; hb, tb = H[b]
    ua, ia, ca = np.unique(ha, return_index=True, return_counts=True); ub, ib, cb = np.unique(hb, return_index=True, return_counts=True)
    ua, ia = ua[ca == 1], ia[ca == 1]; ub, ib = ub[cb == 1], ib[cb == 1]
    com, xa, xb = np.intersect1d(ua, ub, return_indices=True)
    if len(com) < 20: return None
    P = np.c_[ta[ia[xa]], tb[ib[xb]]]
    best = (0, None)
    for _ in range(2500):
        i, j = rng.choice(len(P), 2, replace=False)
        if abs(P[j, 0] - P[i, 0]) < 15: continue
        k = (P[j, 1] - P[i, 1]) / (P[j, 0] - P[i, 0])
        if not 0.85 < k < 1.18: continue
        c = P[i, 1] - k * P[i, 0]; inl = np.abs(P[:, 1] - (k * P[:, 0] + c)) < 0.3
        if inl.sum() > best[0]: best = (int(inl.sum()), (float(k), float(c), float(P[inl, 0].min()), float(P[inl, 0].max())))
    return len(P), best
out = []
for x in json.load(open(os.path.join(ROOT, 'tools', 'library', 'research', 'same-audio-candidates.json'))):
    a, b = codes.index(x['u']), codes.index(x['other'])
    r = fit(a, b)
    if not r or not r[1][1]: continue
    n, (inl, (k, c, t0, t1)) = r
    span = t1 - t0
    out.append(dict(u=x['u'], other=x['other'], shared=n, inliers=inl, speed=round(k, 4), offset=round(c, 1), from_s=round(t0), to_s=round(t1),
                    span_s=round(span), u_len=round(dur[a]), other_len=round(dur[b]),
                    same=bool(inl >= 60 and span >= min(120, 0.5 * min(dur[a], dur[b])))))
json.dump(out, open(os.path.join(ROOT, 'tools', 'library', 'research', 'same-audio-library.json'), 'w'), ensure_ascii=False, indent=0)
print(len(out), 'checked;', sum(o['same'] for o in out), 'confirmed same audio')
