# Find a recitation — accuracy test

Measures how often Find a recitation names the **right recording and time**, and how often it names a **wrong** one,
with clips cut from known Abdul Basit recordings and changed the way real clips are.

Each clip is searched twice:
1. **in the library**: the right recording (or a copy of it — the same audio in another file) should be found,
   at the right time;
2. **hidden**: the recording and all its copies are left out of the search (`FINDER.exclude`), which is what a clip
   from a recording the app doesn't have looks like. Anything confirmed then is a false identification.

Work folder (`EVAL_DIR`, default `eval-work/`, not committed): `fpaud/` with the source recordings and `list.json`
(`[{file, key, name, len, title}]`, key/name as in `data/areas.js`), and `asr/node_modules` with
`@huggingface/transformers@3.7.1` (for the verse recognition in the browser).

    python3 find_copies.py            # copies of each source recording, by sound at several speeds -> eval_copies.json
    python3 make_eval.py              # 120 clips: mp3, mid-ayah, noise, phone, video, tempo +5 %, 7 s, echo
    python3 make_social.py            # 30 more: 1.25x / 0.8x speed, music under the recitation, 3 s intro (videos)
    python3 -m http.server 8765       # in the repository folder
    VER=cur V=1 node eval.js          # V=1: verse recognition on; OUT=results.jsonl
    python3 score.py results.jsonl

Results and every wrong answer are listed in `docs/FINDER-ACCURACY.md`.
