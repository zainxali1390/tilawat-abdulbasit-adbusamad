# Recognition engine: Step 3 results (ingestion) and the baseline of today's finder

Run: `engine-eval.yml`, 25 Nov 2026. Results are in `tools/engine/eval/results/20261125-1651-75d7d52/`.

## The test set
- **Sources:** 16 archive recordings, 8 of them different performances of Al-Qamar / Ar-Raḥmān and 8 others (`tools/engine/eval/sources.json`).
- **Clips:** each recording gives 40 versions = **640 clips** (`tools/engine/eval/make_set.py`).
  - Every clip starts where the voice starts, so the true time is exact.
  - The ground truth gives, for each part of a clip, which recording it comes from, the time in that recording, and the speed.
- **Formats:** one 20 s clip per recording in 13 formats = **208 files**: mp3, m4a, ogg, opus, webm, wav, flac, mp4, mov, mkv, avi, 3gp, wma.
- **Copies:** the same audio in another file counts as right. Copies are found in two ways:
  1. a full-length landmark alignment (`samefit.py`);
  2. copies at a different tape speed, which landmarks can't align, recognised when at least 3 clips from points of the source spread over at least 5 minutes map onto the file along **one straight time line**. Six such copies were found, e.g. the Al-Aqsa "(79)" / "(80)" files: the same performance, 3 % apart in speed.

## Ingestion (`js/engine/ingest.js`, tested in Google Chrome)

| | Result |
|---|---|
| Files decoded (208) | **208 / 208** (duration within 0.15 s for all) |
| … by the browser itself | 176: every format except AVI and WMA |
| … by the ffmpeg.wasm fallback | 32: AVI and WMA |
| Recitation start within 0.3 s of the truth (640 clips) | **633 / 640** |
| … clips with 3 s of silence, noise or music before the recitation | **48 / 48** (errors ≤ 0.04 s) |
| Misses | 3 clips at 3 dB signal-to-noise (one placed at 18 s), 1 at 0.8× tempo, 1 at 0.9× speed, 1 at 1.1× speed, 1 with echo: off by 0.5–1.2 s |

## Baseline: today's "Find a recitation" (unchanged), on the same 640 clips

**Measures:**
- "Right" means the first answer is the original or a copy of it, and **confirmed**.
- "FALSE" counts confirmations when the original and its known copies were hidden.

| Kind of clip | Right, confirmed | Time error (median) |
|---|---|---|
| Clean, AAC 32k, video MP4/MOV, phone, compression, distortion, treble cut, bass boost | 15–16 / 16 each | 0.01–0.02 s |
| Tempo 0.9 / 1.1 / 1.25 / 0.8 (pitch kept) | 16 / 16 / 15 / 13 | 0.01–0.09 s |
| Short: 10 s / 7 s; long: 44 s | 15 / 14; 15 | 0.02 s |
| Noise (10 dB / 3 dB SNR) | 13 / 14 | 0.01–0.02 s |
| Echo; small reverb; large reverb | 12; 16; 11 | 0.01–0.02 s |
| Music under the recitation | 14 | 0.01 s |
| 3 s intro (silence, noise or music) | 48 / 48 found, **but every start 3.0 s early** | 3.0 s |
| **Pitch shift** ±1, ±2, +3, −4 semitones (tempo kept) | **0 / 96** | — |
| **Speed change** 0.9 / 1.1 / 1.25 (pitch and tempo together) | **0 / 48** | — |
| **Several edits together** (3 combinations) | **0 / 48** | — |
| Joined clips, parts found: 2 parts out of order / 3 parts / parts from 2 recordings | **6 / 32**, 40 / 48, **8 / 32** | — |

**Totals:**

| | Clips |
|---|---|
| Right, confirmed | **420 / 640** (66 %) |
| Right, only "possible" | 15 |
| Wrong recording confirmed | **1** |
| No answer | 197 |
| Search time (one search, on a GitHub runner) | median 3–7 s |

**Hidden-original runs: 19 / 640 confirmations.** They involve 9 recordings, and many are probably not real errors:
- **Yūsuf (s08):** three different files are each confirmed at the same speed ratio (0.944), probably copies 6 % apart in speed. There are only 2 clips per file, below the 3 needed to count them.
- **Iraq 1956 Al-Qamar (s06):** two files with the same title show partial lines, probably edited copies.
- **The rest:** single clips that can't be decided.

They are counted as false here (the strict view). The melody check (Step 6), which isn't affected by speed differences, will settle them.

**Not measured yet:** surah and ayah accuracy. That needs its own ground truth from the verse map and is the subject of Step 4.

## What the baseline shows (the targets for the next steps)
1. **Pitch shift (0 %), speed changes over 6 % (0 %) and combined edits (0 %) defeat the current finder completely.** These are exactly the edits the Step 2 checks addressed:
   - the pitch-corrected landmark search (1 → 40–59 matching points);
   - the melody (pitch-shift- and speed-proof).
2. **Joined clips:** usually only one part is found (6/32 and 8/32).
3. **Intros:** the timestamp is always 3 s early. Ingestion now finds the true start to within 0.04 s; it isn't used by the finder yet (Step 11).
4. **Echo, large reverb and heavy noise:** 11–14 / 16.
5. **The test's copy check** needs a speed-proof method for copies (melody), so that hidden-run results can be judged exactly.
