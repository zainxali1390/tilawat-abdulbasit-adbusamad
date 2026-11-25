"""Step 2 design check: can the MELODY tell performances apart, through edits, and how big is a melody index?

For each recording in proto-set.json (12 performances of Al-Qamar / Ar-Rahman + 8 others):
  1. pitch contour (F0) at 20 frames/s with a YIN tracker, stored as 1 byte per frame (the proposed mf/ format);
  2. clips cut at known times, then edited (pitch shift with tempo kept, tempo change with pitch kept, echo/reverb,
     a phone-like band limit with noise, and several edits together);
  3. each clip's contour searched against ALL 20 recordings: key-free (pitch shift cancels), over a grid of tempo factors,
     by FFT cross-correlation of the high-passed contour, best offsets re-scored with a robust pitch-difference cost.
Reports: bytes per hour, top-1 accuracy, margin over the best OTHER recording (in particular other Al-Qamar performances),
time error. This decides whether melody is a usable independent signal; it is not the final matcher.

  python3 proto_melody.py proto-set.json out.json         (needs ffmpeg; downloads the 20 recordings)
"""
import json, os, subprocess, sys, time, random
import numpy as np

SR = 16000
HOP = 800                  # 50 ms -> 20 frames/s
WIN = 1024
FMIN, FMAX = 75.0, 700.0   # Abdul Basit: roughly 100-600 Hz
TAU_MIN, TAU_MAX = int(SR / FMAX), int(SR / FMIN)


def load(path_or_url, ss=None, t=None, af=None):
    cmd = ['ffmpeg', '-loglevel', 'error', '-y']
    if ss is not None:
        cmd += ['-ss', str(ss)]
    if t is not None:
        cmd += ['-t', str(t)]
    cmd += ['-i', path_or_url, '-vn', '-ac', '1', '-ar', str(SR)]
    if af:
        cmd += ['-af', af]
    cmd += ['-f', 'f32le', '-']
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode:
        raise RuntimeError(r.stderr.decode()[-300:])
    return np.frombuffer(r.stdout, np.float32).copy()


def yin_f0(x):
    """YIN (de Cheveigné & Kawahara 2002) per 50 ms frame; returns midi pitch (nan = unvoiced)."""
    n = 1 + max(0, (len(x) - WIN) // HOP)
    out = np.full(n, np.nan, np.float32)
    if n <= 0:
        return out
    rms_all = np.sqrt(np.mean(x ** 2) + 1e-12)
    B = 2048
    for s in range(0, n, B):
        idx = np.arange(s, min(n, s + B))
        fr = np.stack([x[i * HOP:i * HOP + WIN] for i in idx]).astype(np.float64)
        fr -= fr.mean(1, keepdims=True)
        rms = np.sqrt((fr ** 2).mean(1))
        F = np.fft.rfft(fr, 2 * WIN)
        ac = np.fft.irfft(F * np.conj(F))[:, :TAU_MAX + 2]
        cs = np.cumsum(fr ** 2, 1)
        e0 = cs[:, -1]
        taus = np.arange(TAU_MAX + 2)
        # d(tau) = sum x_j^2 + sum x_{j+tau}^2 - 2 r(tau) over j < WIN - tau
        e1 = cs[:, WIN - 1 - taus[1:]]                      # energy of the first WIN - tau samples
        e2 = e0[:, None] - np.concatenate([np.zeros((len(idx), 1)), cs[:, taus[1:] - 1]], 1)[:, 1:]
        d = np.concatenate([np.zeros((len(idx), 1)), e1 + e2 - 2 * ac[:, 1:]], 1)
        cm = np.cumsum(d[:, 1:], 1) / np.arange(1, d.shape[1])
        dn = np.ones_like(d)
        dn[:, 1:] = d[:, 1:] / np.maximum(cm, 1e-12)
        seg = dn[:, TAU_MIN:TAU_MAX]
        below = seg < 0.15
        first = np.where(below.any(1), below.argmax(1), seg.argmin(1))
        # walk to the local minimum after the first dip
        for k in range(len(idx)):
            j = first[k]
            while j + 1 < seg.shape[1] and seg[k, j + 1] < seg[k, j]:
                j += 1
            first[k] = j
        val = seg[np.arange(len(idx)), first]
        tau = first + TAU_MIN
        # parabolic interpolation
        a = dn[np.arange(len(idx)), np.clip(tau - 1, 1, None)]
        b = dn[np.arange(len(idx)), tau]
        c = dn[np.arange(len(idx)), np.clip(tau + 1, None, dn.shape[1] - 1)]
        den = a - 2 * b + c
        shift = np.where(np.abs(den) > 1e-9, 0.5 * (a - c) / den, 0)
        f0 = SR / (tau + np.clip(shift, -1, 1))
        voiced = (val < 0.3) & (rms > 0.05 * rms_all)
        midi = 69 + 12 * np.log2(f0 / 440.0)
        out[idx] = np.where(voiced, midi, np.nan)
    # single-frame blips: a voiced frame far (> 2 semitones) from both voiced neighbours takes their mean
    m = out.copy()
    a, b, c = out[:-2], out[1:-1], out[2:]
    blip = ~np.isnan(a) & ~np.isnan(b) & ~np.isnan(c) & (np.abs(b - a) > 2) & (np.abs(b - c) > 2) & (np.abs(a - c) < 1)
    m[1:-1][blip] = ((a + c) / 2)[blip]
    return m


def pack(midi):
    """the proposed mf/ format: 0 = unvoiced, else 1 + quarter-semitones above midi 36 (C2)"""
    q = np.where(np.isnan(midi), 0, np.clip(np.round((midi - 36) * 4) + 1, 1, 255))
    return q.astype(np.uint8)


def unpack(b):
    return np.where(b == 0, np.nan, (b.astype(np.float32) - 1) / 4 + 36)


def highpass(m, secs=2.0):
    """key-free melody shape: pitch minus its local average (gaps filled), 0 where unvoiced"""
    v = ~np.isnan(m)
    if v.sum() < 5:
        return np.zeros_like(m), v
    xi = np.arange(len(m))
    f = np.interp(xi, xi[v], m[v])
    w = int(secs * 20) | 1
    k = np.ones(w) / w
    avg = np.convolve(np.pad(f, w // 2, mode='edge'), k, 'valid')
    h = np.where(v, f - avg, 0.0)
    return np.clip(h, -6, 6), v


def stretch(m, k):
    """contour of the clip as it would sound at tempo k (k > 1: original was slower than the clip... we test both ways)"""
    n = max(4, int(round(len(m) * k)))
    xi = np.linspace(0, len(m) - 1, n)
    v = ~np.isnan(m)
    lin = np.interp(xi, np.arange(len(m)), np.where(v, m, 0))
    vv = np.interp(xi, np.arange(len(m)), v.astype(float)) > 0.5
    return np.where(vv, lin, np.nan)


TEMPI = np.round(np.exp(np.linspace(np.log(0.78), np.log(1.28), 19)), 4)


def search(q, refs):
    """q: clip contour (midi, nan). refs: {code: contour}. Returns best (score, code, start_frame, tempo) per code."""
    res = {}
    for code, c in refs.items():
        hc, vc = highpass(c)
        best = (-1, 0, 1.0)
        for k in TEMPI:
            qs = stretch(q, k)
            hq, vq = highpass(qs)
            L = len(hq)
            if L >= len(hc) or vq.sum() < 0.25 * L:
                continue
            nfft = 1 << int(np.ceil(np.log2(len(hc) + L)))
            num = np.fft.irfft(np.fft.rfft(hc, nfft) * np.conj(np.fft.rfft(hq, nfft)), nfft)[:len(hc) - L + 1]
            # normalise by local energy of the reference window
            e = np.concatenate([[0], np.cumsum(hc ** 2)])
            le = np.sqrt(np.maximum(e[L:] - e[:-L], 1e-9))[:len(num)]
            sc = num / (le * np.sqrt((hq ** 2).sum()) + 1e-9)
            # re-score the 5 best offsets with the robust pitch-difference cost (key-free: one constant shift)
            for o in np.argsort(-sc)[:5]:
                seg = c[o:o + L]
                both = ~np.isnan(seg) & ~np.isnan(qs)
                if both.sum() < 0.3 * L:
                    continue
                dif = seg[both] - qs[both]
                sh = np.median(dif)
                err = np.mean(np.minimum(np.abs(dif - sh), 2.0))       # semitones, capped
                s2 = (1 - err / 2.0) * min(1, both.sum() / (0.5 * L))
                if s2 > best[0]:
                    best = (float(s2), int(o), float(k), float(sh))
        res[code] = best
    return res


EDITS = {
    'clean': None,
    'pitch+2': 'asetrate=%d,aresample=%d,atempo=%.6f' % (SR * 1.12246, SR, 1 / 1.12246),
    'pitch-3': 'asetrate=%d,aresample=%d,atempo=%.6f' % (SR * 0.84090, SR, 1 / 0.84090),
    'tempo1.15': 'atempo=1.15',
    'tempo0.85': 'atempo=0.85',
    'reverb': 'aecho=0.8:0.85:40|70|110|160:0.5|0.4|0.3|0.2',
    'phone+noise': 'highpass=f=300,lowpass=f=3400,acompressor=threshold=0.1:ratio=6',
    'combo': 'asetrate=%d,aresample=%d,atempo=%.6f,aecho=0.8:0.85:40|90:0.5|0.3,bass=g=8,treble=g=-6' % (SR * 1.0595, SR, 1.1 / 1.0595),
}


def main():
    lst = json.load(open(sys.argv[1]))
    out = {'tempi': TEMPI.tolist(), 'recs': {}, 'clips': []}
    work = 'proto-audio'
    os.makedirs(work, exist_ok=True)
    refs = {}
    t0 = time.time()
    for r in lst:
        wav = os.path.join(work, '%08x.f32' % (hash(r['code']) & 0xffffffff))
        try:
            if not os.path.exists(wav):
                x = load(r['url'])
                x.tofile(wav)
            x = np.fromfile(wav, np.float32)
        except Exception as e:
            print('download failed', r['code'], e); continue
        ts = time.time()
        m = yin_f0(x)
        b = pack(m)
        refs[r['code']] = unpack(b)          # search uses exactly what would be stored
        out['recs'][r['code']] = dict(group=r['group'], title=r['title'], secs=len(x) / SR, frames=len(b), bytes=int(b.nbytes),
                                      voiced=float((b > 0).mean()), f0_secs=round(time.time() - ts, 1))
        print('f0', r['title'][:40], round(len(x) / SR), 's', round(time.time() - ts, 1), 's cpu, voiced', round(float((b > 0).mean()), 2), flush=True)
    random.seed(3)
    for r in lst:
        if r['code'] not in refs:
            continue
        wav = os.path.join(work, '%08x.f32' % (hash(r['code']) & 0xffffffff))
        x = np.fromfile(wav, np.float32)
        dur = len(x) / SR
        for clipn in range(2):
            L = random.choice([20, 44])
            t = random.uniform(30, max(31, dur - L - 30))
            seg = x[int(t * SR):int((t + L) * SR)]
            raw = os.path.join(work, 'clip.f32')
            seg.tofile(raw)
            for name, af in EDITS.items():
                try:
                    y = load_raw(raw, af)
                except Exception as e:
                    print('edit failed', name, e); continue
                if name == 'phone+noise':
                    y = y + np.random.default_rng(1).normal(0, 0.02 * np.sqrt(np.mean(y ** 2)) * 10, len(y)).astype(np.float32)
                q = yin_f0(y)
                ts = time.time()
                res = search(q, refs)
                secs = time.time() - ts
                ranked = sorted(res.items(), key=lambda kv: -kv[1][0])
                best_code, best = ranked[0]
                true = res[r['code']]
                other = max((v[0] for c, v in res.items() if c != r['code']), default=0)
                other_same = max((v[0] for c, v in res.items() if c != r['code'] and out['recs'][c]['group'] == 'qamar'), default=0)
                terr = true[1] / 20.0 - t if true[0] > 0 else None
                out['clips'].append(dict(code=r['code'], group=r['group'], len=L, t=round(t, 2), edit=name, top1=best_code == r['code'],
                                         score_true=round(true[0], 3), score_other=round(other, 3), score_other_qamar=round(other_same, 3),
                                         tempo=true[2], shift=true[3] if len(true) > 3 else None,
                                         time_err=None if terr is None else round(terr, 2), search_secs=round(secs, 2)))
                print('%-6s %2ds %-12s top1=%s true=%.3f other=%.3f terr=%s tempo=%s' % (r['group'], L, name, best_code == r['code'], true[0], other,
                      None if terr is None else round(terr, 2), true[2]), flush=True)
    # summary
    S = {}
    for e in EDITS:
        cl = [c for c in out['clips'] if c['edit'] == e]
        if not cl:
            continue
        ok = [c for c in cl if c['top1'] and c['time_err'] is not None and abs(c['time_err']) < 1.0]
        S[e] = dict(n=len(cl), top1_and_time=len(ok), median_margin=round(float(np.median([c['score_true'] - c['score_other'] for c in cl])), 3),
                    median_abs_time_err=round(float(np.median([abs(c['time_err']) for c in ok])), 2) if ok else None)
    hours = sum(v['secs'] for v in out['recs'].values()) / 3600
    out['summary'] = dict(per_edit=S, bytes_per_hour=round(sum(v['bytes'] for v in out['recs'].values()) / hours),
                          f0_cpu_secs_per_hour=round(sum(v['f0_secs'] for v in out['recs'].values()) / hours, 1),
                          archive_estimate_mb=round(sum(v['bytes'] for v in out['recs'].values()) / hours * 1351 / 1e6, 1),
                          total_secs=round(time.time() - t0))
    print(json.dumps(out['summary'], indent=1))
    json.dump(out, open(sys.argv[2], 'w'), indent=0)


def load_raw(raw, af):
    cmd = ['ffmpeg', '-loglevel', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', raw]
    if af:
        cmd += ['-af', af]
    cmd += ['-ac', '1', '-ar', str(SR), '-f', 'f32le', '-']
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode:
        raise RuntimeError(r.stderr.decode()[-300:])
    return np.frombuffer(r.stdout, np.float32).copy()


if __name__ == '__main__':
    main()
