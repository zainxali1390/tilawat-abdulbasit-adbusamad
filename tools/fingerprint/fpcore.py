"""Audio fingerprints for Abdul Basit recordings (landmark / peak-pair hashing, as used by Shazam-style systems).

The same steps are implemented in js/fp.js for clips on the phone; keep the two in step (PARAMS below).
  1. mono 8 kHz audio
  2. spectrogram: 512-sample Hann frames every 256 samples (32 ms), log magnitude of bins 20..231 (310–3600 Hz)
  3. whitening: each bin minus its own average over ±1.5 s (removes volume, EQ and microphone colour)
  4. peaks: points that are the maximum of their neighbourhood (±5 bins, ±4 frames) and clearly above the
     local level; only the strongest few per second are kept (fewer for the index, more for a clip)
  5. landmarks: each peak paired with the next few peaks 2..48 frames later and within ±31 bins;
     hash = (f1-20)<<12 | (df+32)<<6 | dt   (20 bits), stored with the anchor's frame number
A clip matches a recording when many of its hashes are found in that recording at the same time offset;
that offset is the position of the clip in the recording.
"""
import numpy as np

PARAMS = dict(sr=8000, nfft=512, hop=256, fmin=20, fmax=232, white=47, pf=5, pt=4, thresh=0.6,
              block=31, dtmin=2, dtmax=48, dfmax=31)
INDEX_DENSITY = (6, 3)    # peaks kept per second, pairs per peak (index)
QUERY_DENSITY = (10, 4)   # (clip)


def hann(n):
    i = np.arange(n)
    return 0.5 - 0.5 * np.cos(2 * np.pi * i / (n - 1))


def spectrogram(x, p=PARAMS):
    n, h = p['nfft'], p['hop']
    if len(x) < n:
        return np.zeros((0, p['fmax'] - p['fmin']), np.float32)
    nf = (len(x) - n) // h + 1
    idx = np.arange(n)[None, :] + h * np.arange(nf)[:, None]
    fr = x[idx] * hann(n)[None, :]
    mag = np.abs(np.fft.rfft(fr, axis=1))[:, p['fmin']:p['fmax']]
    return np.log(mag + 1e-3).astype(np.float32)


def moving_mean_time(L, w):
    """mean over frames t-w..t+w (fewer at the edges), per bin"""
    c = np.cumsum(np.vstack([np.zeros((1, L.shape[1]), L.dtype), L]), axis=0, dtype=np.float64)
    T = L.shape[0]
    lo = np.clip(np.arange(T) - w, 0, T)
    hi = np.clip(np.arange(T) + w + 1, 0, T)
    return ((c[hi] - c[lo]) / (hi - lo)[:, None]).astype(np.float32)


def max_filter(E, pt, pf):
    """maximum over ±pt frames and ±pf bins (separable)"""
    T, F = E.shape
    a = np.full((T, F + 2 * pf), -np.inf, np.float32); a[:, pf:pf + F] = E
    m = a[:, 0:F].copy()
    for k in range(1, 2 * pf + 1):
        np.maximum(m, a[:, k:k + F], out=m)
    b = np.full((T + 2 * pt, F), -np.inf, np.float32); b[pt:pt + T] = m
    out = b[0:T].copy()
    for k in range(1, 2 * pt + 1):
        np.maximum(out, b[k:k + T], out=out)
    return out


def peaks(L, per_sec, p=PARAMS):
    """list of (frame, bin) peaks, the strongest per_sec in every ~1 s block, sorted by (frame, bin)"""
    if L.shape[0] == 0:
        return []
    E = L - moving_mean_time(L, p['white'])
    M = max_filter(E, p['pt'], p['pf'])
    cand = np.argwhere((E == M) & (E > p['thresh']))
    if len(cand) == 0:
        return []
    vals = E[cand[:, 0], cand[:, 1]]
    blk = cand[:, 0] // p['block']
    # strongest first within each block (ties: earlier frame, lower bin)
    order = np.lexsort((cand[:, 1], cand[:, 0], -vals, blk))
    cand, blk = cand[order], blk[order]
    keep = []
    start = 0
    for i in range(1, len(cand) + 1):
        if i == len(cand) or blk[i] != blk[start]:
            keep.extend(map(tuple, cand[start:start + per_sec]))
            start = i
    keep.sort()
    return keep


def landmarks(pk, fan, p=PARAMS):
    """(hash, anchor frame) pairs"""
    out = []
    n = len(pk)
    for i in range(n):
        t1, f1 = pk[i]
        got = 0
        j = i + 1
        while j < n and got < fan:
            t2, f2 = pk[j]
            dt = t2 - t1
            if dt > p['dtmax']:
                break
            df = f2 - f1
            if dt >= p['dtmin'] and -p['dfmax'] <= df <= p['dfmax']:
                out.append(((int(f1) << 12) | ((int(df) + 32) << 6) | int(dt), int(t1)))
                got += 1
            j += 1
    return out


def fingerprint(x, density, p=PARAMS):
    per_sec, fan = density
    return landmarks(peaks(spectrogram(x, p), per_sec, p), fan, p)


def load_audio(path, sr=8000, start=None, dur=None, extra=None):
    """decode any audio/video file to mono float32 at sr with ffmpeg"""
    import subprocess
    cmd = ['ffmpeg', '-v', 'error', '-nostdin']
    if start is not None:
        cmd += ['-ss', str(start)]
    if dur is not None:
        cmd += ['-t', str(dur)]
    cmd += ['-i', path, '-vn', '-ac', '1', '-ar', str(sr)]
    if extra:
        cmd += extra
    cmd += ['-f', 'f32le', '-']
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()
