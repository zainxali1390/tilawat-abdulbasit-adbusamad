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
| 4 | Quran surah/ayah recognition | **Done** (25 Nov 2026) | `docs/RECOGNITION-CONTENT.md`. Truth from the clean original with two other models (288 clips). The app's speech model is now whisper-base-ar-quran, 8-bit, 77 MB: right surah confirmed 157 vs 104 before (+51 %), 0 wrong surahs confirmed, nothing found 75 vs 133. Against the independent large-model truth only: 144 vs 101. Rejected by measurement: overlapping windows, letter-merging matcher, 3-letter matching. Checked in the real app; 33/33 functional tests |
| 5 | Audio quality and transformation analysis | **Done** (25 Nov 2026) | `docs/RECOGNITION-TRANSFORMS.md`. Pitch-corrected landmark search (±1–4 semitones), speed 0.8–1.25, pitch with tempo. 640 clips: 420 → **569** right and confirmed; pitch shifts 0 → 13–16/16 each; speed 0 → 14–16/16; combined edits 0 → 5 and 13/16 (third: 0/16); wrong confirmed 2 → 2; hidden 16 → 20 (new ones likely copies, to settle in step 6). Undoing speed and ≥3-semitone pitch before verse recognition: 27 → 46 of 72 edited clips. Clip-only quality labels measured unreliable on this archive (old recordings) → kept internal. Step-3 speed clips were built wrongly; fixed and remeasured |
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

**Where I stopped:** Step 5 is complete. Next: **Step 6**, melody: a sturdier pitch tracker for old tapes, a key- and tempo-free contour and alignment, then a pilot melody store and checks on combined edits and hard negatives.
