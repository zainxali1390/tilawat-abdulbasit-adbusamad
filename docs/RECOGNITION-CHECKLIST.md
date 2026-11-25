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
| 3 | Audio/video ingestion, test set, baseline | **In progress** | `js/engine/ingest.js` written. Local test (1 recording, 40 clips, 13 formats): 13/13 formats decode (11 by the browser, AVI and WMA by the ffmpeg.wasm fallback); recitation start within 0.3 s for 40/40. Full test set (16 recordings × 40 variants) and baseline running on GitHub Actions (`engine-eval.yml`) |
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

**Where I stopped:** Step 3. The run `engine-eval.yml` (first run 25 Nov, 15:16 UTC) builds the test set, tests ingestion on all 16 recordings and runs the baseline. Its results are committed to `tools/engine/eval/results/<date>-<commit>/`. Next: read the results, fix ingestion problems they show, then write up the baseline.
