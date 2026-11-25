"""Voice test set (Step 7): samples of Abdul Basit from the archive, and of OTHER reciters from archive.org.

  python3 voice_set.py pos  voice_pos.json   OUT/ --part K --of N   Abdul Basit: 3 samples of 12 s per recording (20/50/80 %)
  python3 voice_set.py neg  voice_neg.json   OUT/ --part K --of N   other reciters: found by archive.org search, 2 samples per file

Every sample is written as 16 kHz mono float32 (OUT/<id>.f32) with a line in OUT/manifest-<kind>-<K>.jsonl.

Other reciters are found by name (voice_neg.json: [{"name": .., "q": [search terms]}]). Upload labels can be wrong, so:
  - items whose title, creator, description or file names mention Abdul Basit are skipped;
  - every sample is searched in the recording index (fp/); a sample that matches the archive (confirmed or possible) is
    Abdul Basit's audio, and is dropped (recorded as "fp_hit" in the manifest).
"""
import json, os, subprocess, sys, re, urllib.parse, urllib.request, hashlib, time
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'fingerprint'))

AB = re.compile(r'basit|baset|basset|bassat|basat|باسط', re.I)
UA = {'User-Agent': 'voice-test-set/1.0'}


def get_json(url, tries=4):
    for i in range(tries):
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60))
        except Exception as e:
            err = e; time.sleep(3 * (i + 1))
    raise err


def cut(url, start, dur, sr=16000):
    p = subprocess.run(['ffmpeg', '-loglevel', 'error', '-ss', str(start), '-t', str(dur), '-i', url, '-vn', '-ac', '1',
                        '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True, timeout=300)
    return np.frombuffer(p.stdout, np.float32)


def duration(url):
    p = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', url],
                       capture_output=True, text=True, timeout=120)
    try:
        return float(p.stdout.strip())
    except ValueError:
        return None


def secs(v):
    """archive.org file length: seconds, or 'mm:ss' / 'hh:mm:ss'"""
    try:
        p = [float(x) for x in str(v or 0).split(':')]
    except ValueError:
        return 0.0
    t = 0.0
    for x in p:
        t = t * 60 + x
    return t


def sid(*parts):
    return hashlib.sha1('|'.join(map(str, parts)).encode()).hexdigest()[:12]


def voiced(x):
    """share of 0.5 s blocks within 20 dB of the loud level (recitation, not silence)"""
    if len(x) < 16000:
        return 0
    b = x[:len(x) // 8000 * 8000].reshape(-1, 8000)
    e = 10 * np.log10((b ** 2).mean(1) + 1e-12)
    return float((e > np.percentile(e, 90) - 20).mean())


def pos(lst, out, k, n):
    man = open(os.path.join(out, 'manifest-pos-%d.jsonl' % k), 'w')
    for i, r in enumerate(lst):
        if i % n != k:
            continue
        L = duration(r['url'])
        if not L or L < 60:
            print('skip', r['code'], L, flush=True); continue
        for f in (0.2, 0.5, 0.8):
            t = int(L * f); x = cut(r['url'], t, 12)
            if len(x) < 16000 * 8 or voiced(x) < 0.5:
                continue
            i_ = sid(r['code'], t); x.tofile(os.path.join(out, i_ + '.f32'))
            man.write(json.dumps(dict(id=i_, kind='ab', rec=r['code'], t=t, dec=r['dec'], coll=r['coll'], year=r['year'],
                                      group=(r.get('surahs') or '') + '|' + (r.get('year') or '')), ensure_ascii=False) + '\n')
        man.flush(); print('ok', r['code'][:50], flush=True)


def neg(spec, out, k, n):
    from fpcore import load_audio
    from match import Index
    idx = Index(os.path.join(ROOT, 'fp'))
    man = open(os.path.join(out, 'manifest-neg-%d.jsonl' % k), 'w')
    for j, rc in enumerate(spec):
        if j % n != k:
            continue
        files, seen = [], set()
        for q in rc['q']:
            url = 'https://archive.org/advancedsearch.php?' + urllib.parse.urlencode(
                {'q': '(title:(%s) OR creator:(%s)) AND mediatype:(audio)' % (q, q), 'fl[]': ['identifier', 'title', 'creator'],
                 'rows': 25, 'sort[]': 'downloads desc', 'output': 'json'}, doseq=True)
            try:
                docs = get_json(url)['response']['docs']
            except Exception as e:
                print('search failed', q, e, flush=True); continue
            for d in docs:
                if d['identifier'] in seen:
                    continue
                seen.add(d['identifier'])
                if AB.search(json.dumps(d, ensure_ascii=False)):
                    continue
                try:
                    meta = get_json('https://archive.org/metadata/' + d['identifier'])
                except Exception:
                    continue
                m = meta.get('metadata', {})
                if AB.search(json.dumps({x: m.get(x) for x in ('title', 'creator', 'description', 'subject')}, ensure_ascii=False)):
                    continue
                mp3 = [f for f in meta.get('files', []) if f['name'].lower().endswith('.mp3') and not AB.search(f['name'])
                       and secs(f.get('length')) > 120]
                if len(mp3) < 2:
                    continue
                mp3 = mp3[::max(1, len(mp3) // 4)][:4]
                for f in mp3:
                    files.append((d['identifier'], f['name'], secs(f['length'])))
                if len({x[0] for x in files}) >= 4:
                    break
            if len({x[0] for x in files}) >= 4:
                break
        got = 0
        for item, name, L in files:
            u = 'https://archive.org/download/%s/%s' % (item, urllib.parse.quote(name))
            for f in (0.3, 0.7):
                t = int(L * f); x = cut(u, t, 12)
                if len(x) < 16000 * 8 or voiced(x) < 0.5:
                    continue
                try:
                    hit = idx.decide(load_audio(u, start=t, dur=12))
                except Exception:
                    hit = None
                lvl = hit and hit.get('level')
                i_ = sid(item, name, t)
                rec = dict(id=i_, kind='other', reciter=rc['name'], item=item, file=name, t=t,
                           fp_hit=(hit['code'] if lvl else None))
                if not lvl:
                    x.tofile(os.path.join(out, i_ + '.f32')); got += 1
                man.write(json.dumps(rec, ensure_ascii=False) + '\n'); man.flush()
        print(rc['name'], 'items', len({x[0] for x in files}), 'files', len(files), 'samples', got, flush=True)


if __name__ == '__main__':
    mode, lst, out = sys.argv[1:4]
    k = int(sys.argv[sys.argv.index('--part') + 1]) if '--part' in sys.argv else 0
    n = int(sys.argv[sys.argv.index('--of') + 1]) if '--of' in sys.argv else 1
    os.makedirs(out, exist_ok=True)
    (pos if mode == 'pos' else neg)(json.load(open(lst)), out, k, n)
