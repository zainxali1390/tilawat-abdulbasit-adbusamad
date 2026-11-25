# Recognition engine: development checklist

**Rules:**
- One step at a time.
- A step is marked done only after its tests pass and the results are written here.
- If work stops partway, the "Where I stopped" line says exactly where.

Plan and assessment: `docs/RECOGNITION-ENGINE.md`.

| # | Step | Status | Tests and results |
|---|---|---|---|
| 1 | Inspect the application; technical assessment | **Done** (25 Nov 2026) | Code, data, indexes, tooling and measured accuracy reviewed. Gaps found: pitch shift (never tested), reverb/EQ/combined edits (never tested), heavy echo 10/15, 7 s clips 12/15, 3 s-intro offset, verse map covers half of each recording, no melody or voice features, test audio lost, search time never measured, no MOV fallback, 1 file not indexed |
| 2 | Detailed architecture design | **Done** (25 Nov 2026), awaiting your review | Design in `docs/RECOGNITION-DESIGN.md`. Melody check on 20 recordings (12 performances of the same surahs): clean 34/34, pitch ±2–3 32–33/34, tempo ±15 % 31–32/34, reverb 26/34, combined edit 16/34; same-verses other performances 0.32 vs 0.77; size 97 MB for the archive. Landmark pitch-shift correction checked: 1 → 40–59 matching points |
| 3 | Audio/video ingestion, test set, baseline | **Done** (25 Nov 2026) | `js/engine/ingest.js`: 208/208 files in 13 formats decoded (AVI and WMA by the ffmpeg.wasm fallback); recitation start within 0.3 s for 633/640 clips (48/48 with intros). Test set: 640 clips from 16 recordings, 40 variants. Baseline (`docs/RECOGNITION-BASELINE.md`): 420/640 right and confirmed; pitch shift 0/96, speed change 0/48, combined edits 0/48, joined clips 6/32 and 8/32, intros 3 s early; 1 wrong confirmation; 19 hidden-run confirmations (mostly probable speed-shifted copies) |
| 4 | Quran surah/ayah recognition | Not started | |
| 5 | Audio quality and transformation analysis | Not started | |
| 6 | Melody and tune analysis | Not started | |
| 7 | Vocal recognition | Not started | |
| 8 | Combined candidate narrowing | Not started | |
| 9 | Archive indexing and search | Not started | |
| 10 | Exact performance matching | Not started | |
| 11 | Precise timestamp alignment | Not started | |
| 12 | Verification and confidence | Not started | |
| 13 | Multiple-section matching | Not started | |
| 14 | Integration into the app | Not started | |
| 15 | Comprehensive tests and optimisation | Not started | |

**Decisions:** server-free (your answer, 25 Nov). Tests run on GitHub Actions (default). The melody stage is on by default (no model download); the voice stage's download is decided in Step 7.

**Where I stopped:** Step 3 is complete. Next: **Step 4**, Quran content (surah/ayah): build its ground truth from the verse map, measure the current speech model and matcher on the 640 clips, then improve.
