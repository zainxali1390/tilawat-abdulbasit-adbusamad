# Recognition engine: development checklist

**Rules:**
- One step at a time.
- A step is marked done only after its tests pass and the results are written here.
- If work stops partway, the "Where I stopped" line says exactly where.

Plan and assessment: `docs/RECOGNITION-ENGINE.md`.

| # | Step | Status | Tests and results |
|---|---|---|---|
| 1 | Inspect the application; technical assessment | **Done** (25 Nov 2026) | Code, data, indexes, tooling and measured accuracy reviewed. Gaps found: pitch shift (never tested), reverb/EQ/combined edits (never tested), heavy echo 10/15, 7 s clips 12/15, 3 s-intro offset, verse map covers half of each recording, no melody or voice features, test audio lost, search time never measured, no MOV fallback, 1 file not indexed |
| 2 | Detailed architecture design | Waiting for your review of Step 1 | |
| 3 | Audio/video ingestion, test set, baseline | Not started | |
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

**Where I stopped:** Step 1 is complete. Waiting for your answers to the three decisions in `docs/RECOGNITION-ENGINE.md` §6
(server or not; test environment; download sizes) before starting Step 2.
