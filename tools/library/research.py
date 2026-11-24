"""Research the places of recordings whose location is not known (tools/library/research/investigation.json).

Runs on GitHub Actions (workflow "Location research"), which can reach archive.org and Hugging Face:

  python3 research.py meta     --out meta.json                       archive.org metadata of every file and upload involved
  python3 research.py search   --out candidates.json                 other Abdul Basit uploads on archive.org whose labels name a place
  python3 research.py check    --cands candidates.json --part K --of N --out parts/   those uploads matched BY SOUND against the index
  python3 research.py announce --part K --of N --out parts/          spoken announcements: the first 60 s and last 45 s of each
                                                                       recording, transcribed by a general Arabic speech model
  python3 research.py merge    --parts parts/                        results into tools/library/research/

Nothing here changes the library: the results are evidence, reviewed before any place is changed.
"""
import argparse, json, os, re, subprocess, sys, time, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
RES = os.path.join(HERE, 'research')
sys.path.insert(0, os.path.join(ROOT, 'tools', 'fingerprint'))

UA = {'User-Agent': 'abdulbasit-app-research'}
PLACE = re.compile(r'(مسجد|جامع|الجامع|المسجد|ا?لإ?ذاعة|اذاعة|إذاعة|تلفزيون|التلفزيون|تليفزيون|سرادق|ميدان|قصر|الحرم|الاقصى|الأقصى|الأموي|الاموي|'
                   r'عزاء|مأتم|حفل|احتفال|افتتاح|مولد|سهرة|ليلة|مدينة|بمدينة|محافظة|'
                   r'mosque|masjid|jami|radio|\btv\b|television|broadcast|live|concert)', re.I)
AUDIO = re.compile(r'\.(mp3|m4a|ogg|opus|wav|flac|aac|wma)$', re.I)


def get(url, tries=5):
    for k in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return r.read()
        except Exception as e:
            if k == tries - 1:
                raise
            time.sleep(3 * (k + 1))


def investigation():
    return json.load(open(os.path.join(RES, 'investigation.json')))


def eg_base():
    cfg = open(os.path.join(ROOT, 'js', 'library-config.js'), encoding='utf-8').read()
    i = cfg.index('const EG_BASE=')
    return dict(re.findall(r'(\w+):"([^"]+)"', cfg[i:cfg.index('\n', i)]))


def ia_id(url):
    m = re.match(r'https?://archive\.org/download/([^/]+)/', url)
    return m.group(1) if m else None


def item_meta(ident):
    j = json.loads(get('https://archive.org/metadata/%s' % urllib.parse.quote(ident)))
    md = j.get('metadata') or {}
    keep = ('title', 'description', 'subject', 'date', 'notes', 'creator', 'collection')
    files = {}
    for f in j.get('files') or []:
        if not AUDIO.search(f.get('name', '')):
            continue
        files[f['name']] = {k: f[k] for k in ('title', 'album', 'artist', 'comment', 'track', 'creator', 'length', 'source', 'original', 'genre') if k in f}
    return {'meta': {k: md[k] for k in keep if k in md}, 'files': files}


def cmd_meta(a):
    base = eg_base()
    items = sorted({ia_id(base[k]) for k in base if ia_id(base[k])})
    out = {}
    with ThreadPoolExecutor(8) as ex:
        def safe(i):
            try:
                return item_meta(i)
            except Exception as e:
                return {'error': str(e)[-160:], 'meta': {}, 'files': {}}
        for ident, r in zip(items, ex.map(safe, items)):
            out[ident] = r
            print(ident, len(r['files']), 'audio files', flush=True)
    json.dump(out, open(a.out, 'w'), ensure_ascii=False)


SEARCH = ['عبد الباسط عبد الصمد', 'عبدالباسط عبدالصمد', 'عبد الباسط', 'abdul basit', 'abdulbasit', 'abdelbasset', 'abdel basset', 'abd el basset',
          'abdel baset', 'abdelbaset', 'abd elbasit', 'abdul baset', 'abdel basit', 'abdulbaset']


def cmd_search(a):
    base = eg_base()
    ours = {ia_id(v) for v in base.values()}
    done = set()
    for f in ('archive-other-collections.json', 'own-collections-unimported.json'):   # already checked by sound earlier
        p = os.path.join(ROOT, 'tools', 'fingerprint', 'reports', f)
        if os.path.exists(p):
            for r in json.load(open(p)):
                done.add(r.get('url'))
    ids = set()
    for q in SEARCH:
        page = 1
        while True:
            u = 'https://archive.org/advancedsearch.php?' + urllib.parse.urlencode(
                {'q': '(%s) AND mediatype:(audio OR movies)' % q, 'fl[]': 'identifier', 'rows': 1000, 'page': page, 'output': 'json'})
            try:
                docs = json.loads(get(u))['response']['docs']
            except Exception as e:
                print('search failed', q, e); break
            ids.update(d['identifier'] for d in docs)
            if len(docs) < 1000:
                break
            page += 1
        print(q, len(ids), flush=True)
    ids -= ours
    cands = []

    def scan(ident):
        try:
            r = item_meta(ident)
        except Exception:
            return []
        title = str(r['meta'].get('title', ''))
        if not re.search(r'باسط|basit|basset|baset', title + json.dumps(r['meta'].get('description', ''), ensure_ascii=False) + ' '.join(r['files']), re.I):
            return []
        got = []
        for name, f in r['files'].items():
            if f.get('source') == 'derivative' and f.get('original') and AUDIO.search(f['original']):
                continue
            lab = ' '.join(str(f.get(k, '')) for k in ('title', 'album', 'comment')) + ' ' + name
            if not PLACE.search(lab):
                continue
            url = 'https://archive.org/download/%s/%s' % (ident, urllib.parse.quote(name))
            if url in done:
                continue
            try:
                ln = float(f.get('length') or 0) if ':' not in str(f.get('length', '')) else sum(float(x) * 60 ** i for i, x in enumerate(reversed(str(f['length']).split(':'))))
            except ValueError:
                ln = 0
            got.append({'id': '%s/%s' % (ident, name), 'url': url, 'length': ln, 'self': None, 'item': ident, 'itemtitle': title,
                        'file': name, 'label': lab.strip()[:300]})
        return got
    with ThreadPoolExecutor(8) as ex:
        for g in ex.map(scan, sorted(ids)):
            cands += g
    print(len(ids), 'uploads searched,', len(cands), 'labelled audio files to check')
    json.dump(cands, open(a.out, 'w'), ensure_ascii=False)


def cmd_check(a):
    from check_audio import check
    from match import Index
    idx = Index(os.path.join(ROOT, 'fp'))
    lst = json.load(open(a.cands))
    mine = [c for i, c in enumerate(lst) if i % a.of == a.part]
    os.makedirs(a.out, exist_ok=True)
    res = []
    with ThreadPoolExecutor(6) as ex:
        for c, r in zip(mine, ex.map(lambda c: check(idx, c), mine)):
            r.update({k: c[k] for k in ('url', 'item', 'itemtitle', 'file', 'label', 'length')})
            res.append(r)
            if len(res) % 50 == 0:
                json.dump(res, open(os.path.join(a.out, 'check-%03d.json' % a.part), 'w'), ensure_ascii=False)
    json.dump(res, open(os.path.join(a.out, 'check-%03d.json' % a.part), 'w'), ensure_ascii=False)


def cmd_announce(a):
    from faster_whisper import WhisperModel
    model = WhisperModel('small', device='cpu', compute_type='int8')
    lst = investigation()
    mine = [x for x in lst if (x['n'] - 1) % a.of == a.part]
    os.makedirs(a.out, exist_ok=True)
    out = {}
    import numpy as np
    for x in mine:
        url = x['url'] if x['url'].startswith('http') else os.path.join(ROOT, urllib.parse.unquote(x['url']))
        segs = {}
        for name, args in (('start', ['-ss', '0', '-t', '60']), ('end', ['-sseof', '-45'])):
            r = subprocess.run(['ffmpeg', '-loglevel', 'error', '-y'] + args + ['-i', url, '-vn', '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True)
            if r.returncode != 0 or len(r.stdout) < 16000 * 4:
                segs[name] = {'err': r.stderr.decode()[-160:] or 'no audio'}; continue
            try:
                s, info = model.transcribe(np.frombuffer(r.stdout, np.float32), language='ar', beam_size=1, vad_filter=True, condition_on_previous_text=False)
                segs[name] = [[round(z.start, 1), z.text.strip()] for z in s]
            except Exception as e:
                segs[name] = {'err': str(e)[-160:]}
        out[x['code']] = segs
        print(x['n'], x['code'][:50], ' | '.join(t for k in ('start', 'end') if isinstance(segs.get(k), list) for _, t in segs[k][:2])[:160], flush=True)
        if len(out) % 10 == 0:
            json.dump(out, open(os.path.join(a.out, 'announce-%03d.json' % a.part), 'w'), ensure_ascii=False)
    json.dump(out, open(os.path.join(a.out, 'announce-%03d.json' % a.part), 'w'), ensure_ascii=False)


def cmd_merge(a):
    os.makedirs(RES, exist_ok=True)
    ann, chk = {}, []
    for f in sorted(os.listdir(a.parts)):
        p = os.path.join(a.parts, f)
        if f.startswith('announce-'):
            ann.update(json.load(open(p)))
        elif f.startswith('check-'):
            chk += json.load(open(p))
    if ann:
        old = json.load(open(os.path.join(RES, 'announcements.json'))) if os.path.exists(os.path.join(RES, 'announcements.json')) else {}
        old.update(ann)
        json.dump(old, open(os.path.join(RES, 'announcements.json'), 'w'), ensure_ascii=False, indent=0)
    if chk:
        json.dump(chk, open(os.path.join(RES, 'labelled-uploads-check.json'), 'w'), ensure_ascii=False)
    for f in ('meta.json', 'candidates.json'):
        if os.path.exists(os.path.join(a.parts, f)):
            os.replace(os.path.join(a.parts, f), os.path.join(RES, f))
    print('announcements', len(ann), '| uploads checked', len(chk))


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['meta', 'search', 'check', 'announce', 'merge'])
    ap.add_argument('--out', default='parts'); ap.add_argument('--cands'); ap.add_argument('--parts', default='parts')
    ap.add_argument('--part', type=int, default=0); ap.add_argument('--of', type=int, default=1)
    a = ap.parse_args()
    {'meta': cmd_meta, 'search': cmd_search, 'check': cmd_check, 'announce': cmd_announce, 'merge': cmd_merge}[a.cmd](a)
