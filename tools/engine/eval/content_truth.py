"""Ground truth for the Quran-content test: what is recited in each clip, from the CLEAN original audio.

For every part of every clip (cases.json), the same stretch of the ORIGINAL recording (unedited) is transcribed with a much
larger general Arabic speech model than the app's (faster-whisper large-v3-turbo, beam 5). The transcripts are placed in the
Quran text afterwards by content_eval.mjs (the app's matcher) and kept only when confirmed and consistent with the surahs
the recording's title names.
  python3 content_truth.py SETDIR sources.json OUT.json [--part K --of N]
"""
import json, os, subprocess, sys
import numpy as np

SET, SRC, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
K = int(sys.argv[sys.argv.index('--part') + 1]) if '--part' in sys.argv else 0
N = int(sys.argv[sys.argv.index('--of') + 1]) if '--of' in sys.argv else 1
cases = json.load(open(os.path.join(SET, 'cases.json')))
url = {s['code']: s['url'] for s in json.load(open(SRC))}
segs = []
for c in cases:
    for i, s in enumerate(c['segments']):
        segs.append((c['name'], i, s['code'], s['at'], (s['b'] - s['a']) * s['rate']))
uniq = sorted({(code, round(at, 2), round(d, 2)) for _, _, code, at, d in segs})
mine = [u for j, u in enumerate(uniq) if j % N == K]
from faster_whisper import WhisperModel
try:
    model = WhisperModel('large-v3-turbo', device='cpu', compute_type='int8')
    name = 'large-v3-turbo'
except Exception as e:
    print('turbo unavailable, using medium:', e)
    model = WhisperModel('medium', device='cpu', compute_type='int8'); name = 'medium'
os.makedirs('srcaudio', exist_ok=True)
out = {}
for code, at, d in mine:
    f = os.path.join('srcaudio', '%08x' % (hash(code) & 0xffffffff))
    if not os.path.exists(f):
        subprocess.run(['curl', '-sSL', '--retry', '5', '-o', f, url[code]], check=True)
    r = subprocess.run(['ffmpeg', '-loglevel', 'error', '-ss', str(at), '-t', str(d), '-i', f, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'],
                       capture_output=True)
    x = np.frombuffer(r.stdout, np.float32)
    segs_, _ = model.transcribe(x, language='ar', beam_size=5, vad_filter=False, condition_on_previous_text=False)
    text = ' '.join(s.text.strip() for s in segs_)
    out['%s|%.2f|%.2f' % (code, at, d)] = text
    print(code[:40], at, d, '|', text[:100], flush=True)
json.dump({'model': name, 'texts': out}, open(OUT, 'w'), ensure_ascii=False)
