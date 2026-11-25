"""Recognition-engine test set (docs/RECOGNITION-ENGINE.md §4). Runs on GitHub Actions (archive.org audio is reachable there).

  python3 make_set.py sources.json OUTDIR            all variants of every source
  python3 make_set.py --local FILE OUTDIR            a small set from one local file (for development)

For every source recording:
  * its COPIES (the same audio in other files) are found by sound with the existing index (fp/), so a copy counts as right;
  * clips start where the voice starts (an onset found with the pitch tracker), so the true start is exact;
  * each variant is cut at a different random onset and altered with ffmpeg; the ground truth records, for every part of the
    clip, which recording, where in it, and how fast (original seconds per clip second).
A second list (formats.json) holds one clip per source in 13 audio/video formats, for the ingestion test.
"""
import json, os, random, subprocess, sys, urllib.parse
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'engine'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'fingerprint'))
sys.path.insert(0, HERE)
import proto_melody as PM

SR = 16000


def ff(args):
    r = subprocess.run(['ffmpeg', '-y', '-loglevel', 'error'] + args, capture_output=True)
    if r.returncode:
        raise RuntimeError(' '.join(args)[-200:] + ' :: ' + r.stderr.decode()[-300:])


def has_filter(name):
    return name in subprocess.run(['ffmpeg', '-hide_banner', '-filters'], capture_output=True, text=True).stdout


RUBBER = has_filter('rubberband')


def pitch(semis):
    r = 2 ** (semis / 12)
    if RUBBER:
        return 'rubberband=pitch=%.6f' % r
    return 'asetrate=%d,aresample=%d,atempo=%.6f' % (round(SR * r), SR, 1 / r)


def speed(k):          # pitch and tempo together (resampled), like a sped-up video
    return 'asetrate=%d,aresample=%d' % (round(SR * k), SR)


REVERB_S = 'aecho=0.8:0.8:23|37|53|71:0.5|0.4|0.3|0.2'
REVERB_L = 'aecho=0.8:0.9:60|110|170|240|330|450:0.6|0.5|0.42|0.34|0.26|0.18'
ECHO = 'aecho=0.8:0.7:60|120:0.4|0.25'
MUSIC = ("aevalsrc='0.10*sin(2*PI*t*(220+55*floor(mod(t*2,4))))+0.07*sin(2*PI*t*(330+55*floor(mod(t*2,4))))"
         "+0.05*sin(2*PI*t*110)*(0.5+0.5*sin(2*PI*t*4))':s=%d:d=%s" % (SR, '{d}'))

# name: (clip seconds, rate = original seconds per clip second, filter chain, output ext, extra)
V = {
    'clean20': (20, 1, None, 'mp3', {}),
    'aac32': (15, 1, None, 'm4a', {'codec': ['-c:a', 'aac', '-b:a', '32k']}),
    'video_mp4': (15, 1, None, 'mp4', {}),
    'video_mov': (15, 1, None, 'mov', {}),
    'phone': (15, 1, 'highpass=f=300,lowpass=f=3400,acompressor=threshold=0.1:ratio=4', 'm4a', {'codec': ['-c:a', 'aac', '-b:a', '24k']}),
    'len7': (7, 1, None, 'mp3', {}),
    'len10': (10, 1, None, 'mp3', {}),
    'len44': (44, 1, None, 'mp3', {}),
    'pitch+1': (20, 1, pitch(1), 'mp3', {}),
    'pitch-1': (20, 1, pitch(-1), 'mp3', {}),
    'pitch+2': (20, 1, pitch(2), 'mp3', {}),
    'pitch-2': (20, 1, pitch(-2), 'mp3', {}),
    'pitch+3': (20, 1, pitch(3), 'mp3', {}),
    'pitch-4': (20, 1, pitch(-4), 'mp3', {}),
    'tempo0.8': (20, 1, 'atempo=0.8', 'mp3', {}),
    'tempo0.9': (20, 1, 'atempo=0.9', 'mp3', {}),
    'tempo1.1': (20, 1, 'atempo=1.1', 'mp3', {}),
    'tempo1.25': (20, 1, 'atempo=1.25', 'mp3', {}),
    'speed0.9': (20, 1, speed(0.9), 'mp3', {}),
    'speed1.1': (20, 1, speed(1.1), 'mp3', {}),
    'speed1.25': (20, 1, speed(1.25), 'mp4', {}),
    'echo': (20, 1, ECHO, 'mp3', {}),
    'reverb_small': (20, 1, REVERB_S, 'mp3', {}),
    'reverb_large': (20, 1, REVERB_L, 'mp3', {}),
    'noise10': (20, 1, None, 'mp3', {'noise': 10}),
    'noise3': (20, 1, None, 'mp3', {'noise': 3}),
    'bass': (20, 1, 'bass=g=12', 'mp3', {}),
    'treble_cut': (20, 1, 'lowpass=f=2500,treble=g=-10', 'mp3', {}),
    'compress': (20, 1, 'acompressor=threshold=0.05:ratio=12:attack=5:release=50,alimiter=limit=0.5', 'mp3', {}),
    'distort': (20, 1, 'volume=8,asoftclip=type=hard,volume=0.3', 'mp3', {}),
    'intro_silence3': (20, 1, None, 'mp3', {'intro': 'silence'}),
    'intro_noise3': (20, 1, None, 'mp3', {'intro': 'noise'}),
    'intro_music3': (20, 1, None, 'mp4', {'intro': 'music'}),
    'music_bed': (20, 1, None, 'mp4', {'bed': True}),
    'combo1': (20, 1, pitch(2) + ',atempo=1.1,' + REVERB_S + ',bass=g=8', 'mp4', {}),
    'combo2': (20, 1, speed(0.9) + ',lowpass=f=2500,treble=g=-8,acompressor=threshold=0.05:ratio=8', 'mp3', {'noise': 10}),
    'combo3': (20, 1, pitch(-3) + ',atempo=0.9,' + ECHO + ',highpass=f=300,lowpass=f=3400', 'm4a', {'codec': ['-c:a', 'aac', '-b:a', '32k']}),
    'join2_same': (12, 1, None, 'mp4', {'join': 'same2'}),
    'join3_same': (8, 1, None, 'mp4', {'join': 'same3'}),
    'join2_diff': (12, 1, None, 'mp4', {'join': 'diff2'}),
}


def rate(chain):
    """original seconds per clip second implied by a filter chain (atempo k plays k times faster; asetrate k too)"""
    k = 1.0
    for part in (chain or '').split(','):
        if part.startswith('atempo='):
            k *= float(part.split('=')[1])
        elif part.startswith('asetrate=') and not part.startswith('asetrate=%d' % SR):
            # pitch() without rubberband: asetrate r then atempo 1/r -> net 1; speed(): asetrate k only
            k *= float(part.split('=')[1]) / SR
    return k


FORMATS = [('mp3', ['-c:a', 'libmp3lame', '-b:a', '96k']), ('m4a', ['-c:a', 'aac', '-b:a', '64k']), ('ogg', ['-c:a', 'libvorbis']),
           ('opus', ['-c:a', 'libopus', '-b:a', '32k']), ('webm', ['-c:a', 'libopus', '-b:a', '48k']), ('wav', ['-c:a', 'pcm_s16le']),
           ('flac', ['-c:a', 'flac']), ('mp4', 'video'), ('mov', 'video'), ('mkv', 'video'), ('avi', 'video_mp3'),
           ('3gp', ['-c:a', 'aac', '-ar', '22050', '-b:a', '32k']), ('wma', ['-c:a', 'wmav2', '-b:a', '64k'])]


def onsets(x):
    """times where the voice starts after at least 0.6 s without it and stays for most of the next 1.5 s"""
    m = PM.yin_f0(x)
    v = ~np.isnan(m)
    out = []
    for i in range(12, len(v) - 30):
        if v[i] and not v[i - 12:i].any() and v[i:i + 30].mean() > 0.7:
            out.append(i / 20.0)
    return out


def load16(path, ss=0, t=None):
    return PM.load(path, ss=ss, t=t)


def find_copies(idx, codes, code, path):
    """other files with the same audio: 15 s windows every 60 s, at a few speeds, confirmed at >= 2 windows"""
    from fpcore import load_audio
    x = load_audio(path)
    me = codes.index(code) if code in codes else None
    hits = {}
    n = len(x) // 8000
    for t in range(10, max(11, n - 20), 30):
        seg = x[t * 8000:(t + 15) * 8000]
        got = set()
        for f in (1, 1 / 1.03, 1 / 0.97, 1 / 1.06, 1 / 0.94):
            s = seg if f == 1 else np.interp(np.arange(int(len(seg) / f)) * f, np.arange(len(seg)), seg).astype(np.float32)
            for mo, secs, rec, off in idx.search(s, exclude=me)[:4]:
                if mo >= 6 and secs >= 3 and rec not in got:
                    got.add(rec); hits.setdefault(codes[rec], []).append(t)
    cand = sorted(hits)
    if not cand:
        return []
    import samefit
    res = samefit.fit_pairs([[code, c] for c in cand])
    return sorted(r['other'] for r in res if r['same'])


def write_variant(src, out, d, chain, ext, extra, tmp, rng, x16, starts, others):
    """build one clip; returns its ground truth segments"""
    segs = []
    k = rate(chain)
    pre = 0.0
    parts = []
    if extra.get('join'):
        n = {'same2': 2, 'same3': 3, 'diff2': 2}[extra['join']]
        picks = rng.sample(starts, n) if extra['join'] != 'diff2' else [rng.choice(starts)]
        if extra['join'] == 'same2':
            picks = sorted(picks, reverse=True)       # out of order
        for j, st in enumerate(picks):
            parts.append((src['path'], src['code'], st))
        if extra['join'] == 'diff2':
            o = rng.choice(others)
            parts.append((o['path'], o['code'], rng.choice(o['starts'])))
        files = []
        pos = 0.0
        for j, (path, code, st) in enumerate(parts):
            f = '%s.p%d.wav' % (tmp, j)
            ff(['-ss', '%.3f' % st, '-t', str(d), '-i', path, '-vn', '-ac', '1', '-ar', str(SR), f])
            files.append(f)
            segs.append(dict(a=round(pos, 3), b=round(pos + d, 3), code=code, at=st, rate=1.0))
            pos += d + 1.0
        # 1 s of quiet between parts
        gap = '%s.gap.wav' % tmp
        ff(['-f', 'lavfi', '-i', 'anullsrc=r=%d:cl=mono' % SR, '-t', '1', gap])
        lst = '%s.txt' % tmp
        with open(lst, 'w') as fh:
            for j, f in enumerate(files):
                fh.write("file '%s'\n" % os.path.abspath(f))
                if j < len(files) - 1:
                    fh.write("file '%s'\n" % os.path.abspath(gap))
        joined = '%s.joined.wav' % tmp
        ff(['-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', joined])
        base_in, base_ss, base_t = joined, None, None
    else:
        st = rng.choice(starts)
        base_in, base_ss, base_t = src['path'], st, d * k
        segs.append(dict(a=0.0, b=round(d, 3), code=src['code'], at=st, rate=k))
    # audio chain
    a = '%s.a.wav' % tmp
    args = []
    if base_ss is not None:
        args += ['-ss', '%.3f' % base_ss]
    if base_t is not None:
        args += ['-t', '%.3f' % base_t]
    args += ['-i', base_in, '-vn', '-ac', '1', '-ar', str(SR)]
    if chain:
        args += ['-af', chain]
    ff(args + [a])
    if extra.get('noise'):
        y = PM.load(a)
        p = np.mean(y ** 2)
        nz = np.random.default_rng(rng.randrange(1 << 30)).normal(0, 1, len(y))
        # pink-ish: one-pole low-pass of white noise
        pk = np.zeros_like(nz)
        acc = 0
        for i in range(len(nz)):
            acc = 0.98 * acc + 0.02 * nz[i] * 7
            pk[i] = acc + 0.3 * nz[i]
        pk *= np.sqrt(p / (np.mean(pk ** 2) * 10 ** (extra['noise'] / 10)))
        (y + pk).astype(np.float32).tofile(a + '.f32')
        ff(['-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', a + '.f32', a])
    if extra.get('intro'):
        intro = '%s.intro.wav' % tmp
        if extra['intro'] == 'silence':
            ff(['-f', 'lavfi', '-i', 'anullsrc=r=%d:cl=mono' % SR, '-t', '3', intro])
        elif extra['intro'] == 'noise':
            ff(['-f', 'lavfi', '-i', 'anoisesrc=c=pink:a=0.05:r=%d:d=3' % SR, intro])
        else:
            ff(['-f', 'lavfi', '-i', MUSIC.format(d=3), '-ac', '1', intro])
        lst = '%s.i.txt' % tmp
        open(lst, 'w').write("file '%s'\nfile '%s'\n" % (os.path.abspath(intro), os.path.abspath(a)))
        b2 = '%s.b.wav' % tmp
        ff(['-f', 'concat', '-safe', '0', '-i', lst, '-ar', str(SR), '-ac', '1', b2])
        a = b2
        pre = 3.0
        for s in segs:
            s['a'] += pre; s['b'] += pre
    if extra.get('bed'):
        b2 = '%s.bed.wav' % tmp
        ff(['-i', a, '-f', 'lavfi', '-i', MUSIC.format(d=d + 1), '-filter_complex', '[1:a]volume=0.5[m];[0:a][m]amix=inputs=2:duration=first:normalize=0', '-ac', '1', b2])
        a = b2
    # container
    codec = extra.get('codec')
    if ext in ('mp4', 'mov'):
        ff(['-f', 'lavfi', '-i', 'color=c=black:s=320x240:r=10', '-i', a, '-shortest', '-map', '0:v', '-map', '1:a', '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', out])
    elif ext == 'm4a':
        ff(['-i', a] + (codec or ['-c:a', 'aac', '-b:a', '96k']) + [out])
    else:
        ff(['-i', a, '-c:a', 'libmp3lame', '-b:a', '128k', out])
    for s in segs:
        if s['rate'] != 1.0:
            s['b'] = round(s['a'] + d, 3)
    return segs, pre


def main():
    rng = random.Random(2026)
    if sys.argv[1] == '--local':
        srcs = [dict(code='local', url=sys.argv[2], title='local')]
        out = sys.argv[3]
    else:
        srcs = json.load(open(sys.argv[1]))
        out = sys.argv[2]
    os.makedirs(os.path.join(out, 'clips'), exist_ok=True)
    os.makedirs(os.path.join(out, 'src'), exist_ok=True)
    idx = None
    if sys.argv[1] != '--local':
        from match import Index
        idx = Index(os.path.join(ROOT, 'fp'))
    for s in srcs:
        p = os.path.join(out, 'src', '%08x%s' % (hash(s['code']) & 0xffffffff, os.path.splitext(urllib.parse.unquote(s['url']))[1][:5] or '.mp3'))
        if not os.path.exists(p):
            if s['url'].startswith('http'):
                subprocess.run(['curl', '-sSL', '--retry', '4', '-o', p, s['url']], check=True)
            else:
                ff(['-i', s['url'], '-c', 'copy', p])
        s['path'] = p
        x = load16(p)
        s['dur'] = len(x) / SR
        s['starts'] = [t for t in onsets(x) if 20 < t < s['dur'] - 60]
        s['copies'] = find_copies(idx, idx.codes, s['code'], p) if idx else []
        print('source', s['title'][:40], round(s['dur']), 's,', len(s['starts']), 'onsets,', len(s['copies']), 'copies', flush=True)
    cases, fmts = [], []
    for i, s in enumerate(srcs):
        others = [o for o in srcs if o is not s and o['starts']] or [s]
        if len(s['starts']) < 5:
            print('too few onsets, skipped', s['title']); continue
        for vn, (d, _, chain, ext, extra) in V.items():
            name = 's%02d-%s' % (i, vn)
            f = os.path.join(out, 'clips', name + '.' + ext)
            try:
                segs, pre = write_variant(s, f, d, chain, ext, extra, os.path.join(out, 'clips', '.tmp'), rng, None, s['starts'], others)
            except Exception as e:
                print('variant failed', name, e); continue
            cases.append(dict(name=name, variant=vn, file=os.path.relpath(f, out), code=s['code'], title=s['title'], copies=s['copies'],
                              segments=segs, intro=pre, other_copies={o['code']: o['copies'] for o in srcs if any(g['code'] == o['code'] for g in segs)}))
        # formats (ingestion test): one 20 s clip in each format
        st = rng.choice(s['starts'])
        a = os.path.join(out, 'clips', '.tmp.fmt.wav')
        ff(['-ss', '%.3f' % st, '-t', '20', '-i', s['path'], '-vn', '-ac', '1', '-ar', '44100', a])
        for ext, codec in FORMATS:
            f = os.path.join(out, 'clips', 'f%02d.%s' % (i, ext))
            try:
                if codec in ('video', 'video_mp3'):
                    ff(['-f', 'lavfi', '-i', 'color=c=black:s=320x240:r=10', '-i', a, '-shortest', '-map', '0:v', '-map', '1:a', '-c:v', 'libx264',
                        '-pix_fmt', 'yuv420p'] + (['-c:a', 'libmp3lame'] if codec == 'video_mp3' else ['-c:a', 'aac']) + [f])
                else:
                    ff(['-i', a] + codec + [f])
            except Exception as e:
                print('format failed', ext, str(e)[-120:]); continue
            fmts.append(dict(file=os.path.relpath(f, out), ext=ext, dur=20.0, code=s['code'], at=st))
        for g in os.listdir(os.path.join(out, 'clips')):
            if g.startswith('.tmp'):
                os.remove(os.path.join(out, 'clips', g))
    json.dump(cases, open(os.path.join(out, 'cases.json'), 'w'), ensure_ascii=False, indent=0)
    json.dump(fmts, open(os.path.join(out, 'formats.json'), 'w'), ensure_ascii=False, indent=0)
    print(len(cases), 'clips,', len(fmts), 'format files; rubberband:', RUBBER)


if __name__ == '__main__':
    main()
