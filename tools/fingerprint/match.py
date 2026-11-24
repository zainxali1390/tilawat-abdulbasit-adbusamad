"""Search the recording index (fp/) for a piece of audio — the same scoring as js/finder.js.

A recording scores by how many DIFFERENT moments of the piece agree on one time offset (±1 frame), and over how
many seconds of the piece they are spread. "confirmed": >= 6 moments over >= 3 s and >= 2.5 x the best other
recording; "possible": >= 4 moments over >= 2 s and >= 1.8 x.
"""
import os, json, collections
import numpy as np
from fpcore import QUERY_DENSITY, fingerprint, PARAMS

SEC = PARAMS['hop'] / PARAMS['sr']


class Index:
    def __init__(self, root):
        self.root = root
        self.man = json.load(open(os.path.join(root, 'manifest.json')))
        self.tunit = self.man.get('tunit', 1)
        self.codes = [r[0] for r in self.man['recs']]
        self._c = {}

    def postings(self, h):
        s = h >> 4
        if s not in self._c:
            b = open(os.path.join(self.root, 's', '%02x' % (s >> 8), '%02x.bin' % (s & 255)), 'rb').read()
            counts = np.frombuffer(b[:32], '<u2').astype(np.int64)
            self._c[s] = (np.frombuffer(b[32:], '<u4'), np.concatenate([[0], np.cumsum(counts)]))
        ent, st = self._c[s]
        lo = h & 15
        return ent[int(st[lo]):int(st[lo + 1])]

    def search(self, x, exclude=None, maxpost=600):
        """candidates [(moments, seconds, rec, offset_frames)], best first; exclude = a recording number to ignore"""
        cells = collections.defaultdict(set)
        for h, tq in fingerprint(x, QUERY_DENSITY):
            e = self.postings(h)
            if len(e) > maxpost:
                continue
            for v in e:
                r = int(v >> 18)
                if r == exclude:
                    continue
                k = int(v & 262143) * self.tunit - tq
                for d in (-1, 0, 1, 2) if self.tunit > 1 else (-1, 0, 1):
                    cells[(r, k + d)].add(tq)
        best = {}
        for (r, o), ts in cells.items():
            if len(ts) < 3:
                continue
            if r in best and best[r][0] >= len(ts):
                continue
            best[r] = (len(ts), len(set(t // 31 for t in ts)), r, o)
        return sorted(best.values(), reverse=True)

    def decide(self, x, exclude=None):
        c = self.search(x, exclude)
        if not c:
            return None
        s, sp, r, o = c[0]
        s2 = c[1][0] if len(c) > 1 else 0
        lvl = 'confirmed' if s >= 6 and sp >= 3 and s >= 2.5 * max(s2, 2) else (
            'possible' if s >= 4 and sp >= 2 and s >= 1.8 * max(s2, 2) else None)
        return dict(level=lvl, code=self.codes[r], rec=r, offset=round(o * SEC, 2), moments=s, seconds=sp, next=s2,
                    others=[(self.codes[x[2]], x[0], round(x[3] * SEC, 2)) for x in c[1:4]])
