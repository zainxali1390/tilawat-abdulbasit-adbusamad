# Recognition engine: Step 4 (Quran content: surah and ayah)

The question: what does a clip recite? It narrows the search to the recordings that contain that passage, and it is a check on any match. It never identifies a recording on its own.

## How it was tested
- **Clips:** the 640 clips of the Step 3 test set, edited as they are: pitch, speed, reverb, noise, video and so on.
- **Ground truth**, for each part of each clip:
  - the same stretch of the **clean original** is transcribed by two models that the app does **not** use: Whisper large-v3-turbo (general) and deepdml/whisper-small-ar-quran-mix-norm (Quran);
  - each transcript is placed in the Quran;
  - a place is kept only when it is confirmed, consistent with the surahs in the recording's title, and the two models don't contradict each other.
- **Coverage of the truth:** 288 of the 640 clips. Many parts can't be placed even from the clean original, because a 20 s stretch of mujawwad often holds only a few words. Results are counted on those 288 clips.
- **Scoring:** "right" means the predicted range overlaps the true range in the same surah. The "start ±2" column means the clip's start is placed within 2 ayahs.
- **Files:** `tools/engine/eval/content_truth.py`, `content_eval.mjs`, `content_score.mjs`; workflow `engine-content.yml`. Results are in `tools/engine/eval/results/content-20261125-1801-c201bb5` and `tools/engine/eval/results/content-20261125-1854-c937226`.

## Results (288 clips)

| Speech model in the app | Right surah, confirmed | Confirmed but wrong | Possible, right / wrong | Nothing | Right surah and start ±2 ayahs | Size | Time per 20 s clip (runner) |
|---|---|---|---|---|---|---|---|
| whisper-tiny-ar-quran (before) | 104 | 0 | 46 / 5 | 133 | 150 | 63 MB | about 1.0 s |
| **whisper-base-ar-quran, 8-bit (now)** | **157** | **0** | 45 / 11 | 75 | 202 | **77 MB** | about 1.9 s |
| whisper-base-ar-quran, full-precision encoder | 158 | 0 | 51 / 6 | 73 | 209 | 136 MB | about 1.9 s |

**Checked against the large general model's truth only** (227 clips), in case the second truth model shares training data with the base model:

| Model | Right surah, confirmed |
|---|---|
| Base | **144** |
| Tiny | **101** |

The gain holds, +43 %. The one "wrong" confirmation in that table is the refrain "فبأي آلاء ربكما تكذبان": placed at 55:13 instead of 55:16–17, the right surah 3 ayahs away. **No clip had a wrong surah confirmed by either model.**

## Tried and rejected (measured, not guessed)

| Change | Result |
|---|---|
| Overlapping 12 s windows instead of one window | Right surah confirmed 96 vs 101 (tiny model), one wrong confirmation, 3× slower: **rejected** |
| A matcher that merges letters the speech model confuses (ط/ت, ض/د, ص/س, ق/ك, ح/ه, ع) | 107 vs 113 on the same transcripts, more ambiguity: **rejected** |
| Matching on 3-letter groups instead of 4 | More "possible" answers, more of them wrong (42): **rejected** |

**Conclusion:** the transcripts limit accuracy, not the matcher. A better Quran speech model is what helps.

## What changed in the app
- `js/ayah.js`: the verse recognition uses **whisper-base-ar-quran** (Tarteel, Apache 2.0, 8-bit) instead of whisper-tiny-ar-quran.
- The files are in `models/whisper-base-ar-quran/`: the 8-bit encoder (23 MB), the 8-bit decoder (53 MB) and the tokenizer.
- The download size shown to users went from 63 to 77 MB. App version `v27`.
- **Checked in the real app** (a browser running the finder): the base model loads (only the 8-bit files are fetched) and a clip is recognised as Al-Qamar 52–53, confirmed. All 33 functional tests pass.

## Still weak (and which later step addresses it)

| Weakness | Next step |
|---|---|
| **About a quarter of clips get no verses** (75 / 288), mostly heavily edited ones: pitch +3 / −4, 1.1–1.25× speed, large reverb, 3 dB noise. Correcting pitch and speed before recognition is part of Step 5 (the transformation estimate is reused). | Step 5 |
| **The clip's end ayah** isn't scored yet. The start is within 2 ayahs for 202 / 288. | Step 11 |
| **The library's verse map was built with the tiny model.** Rebuilding it with the base model is part of the archive index. | Step 9 |
| **Speed:** recognition takes about 2× as long per window as before, about 2 s per 20 s on a runner, slower on phones. | Measured again in Step 15 |
