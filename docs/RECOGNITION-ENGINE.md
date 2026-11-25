# Recitation recognition engine: technical assessment and plan (Step 1)

Status: **Step 1 of 15 (investigation) complete.** Nothing has been implemented for the new engine yet. The checklist is in
`docs/RECOGNITION-CHECKLIST.md`.

We don't know how @YanbouMajlisbot works inside. This plan aims for the same **observable** behaviour, by our own methods:
- a short, possibly edited clip goes in;
- the original full recording comes out, with the time in it.

---

## 1. What exists today

### 1.1 The application
- **What it is:** a static web app (PWA) on GitHub Pages: plain JavaScript, no build step, no server.
- **Scripts:** all classic scripts sharing one global scope, loaded in this order:
  `i18n → quran-data → library-config → data/areas.js → data/aliases.js → icons → storage → utils → ui → recitations → library → player → mushaf → mushaf-book → navigation → pins → share → fp → ayah → finder → app → pwa`.
- **Offline:** `sw.js` (currently `v26`) caches the app shell and fetches data network-first. It also receives clips shared from other apps (`share_target` in `manifest.webmanifest`).
- **Heavy jobs** (building indexes, analysing the archive) run on **GitHub Actions**. The workflows are `fingerprint-index.yml`, `fingerprint-check.yml`, `verse-map.yml` and `location-research.yml`. Their results are committed to the repository and served as static files.

### 1.2 Recordings and metadata
- **`data/areas.js`:** the archive. It holds countries → sections → recordings, each recording as `[key, file, titleAr, titleEn, year, placeAr, placeEn]`.
  - A recording's ID is `e:KEY:file`. `EG_BASE` (in `js/library-config.js`) maps each key to an archive.org folder, or to `audio/` for files kept in the repository.
  - There are 2,739 library recordings. The search index covers **3,081** files (1,351 hours), counting studio recitations and the khatmas as well.
- **`js/library.js`:** builds the country → place view at run time.
- **Change history:** every data correction is logged and backed up (`tools/library/organise.py`, `data/backups/`).
- **Unknown places:** recordings with unknown places or incomplete titles are already in the index and searchable.

### 1.3 Player and timestamps
- **`js/player.js`:** one `<audio>` element.
  - `seekTo` / `paintSeek` / `shownTime` handle seeking.
  - Auto-play follows the list on screen (`libQueue`).
  - The finder opens a recording at a time with `startPlay(…, at)`, where `at` is in seconds of the **original file**.
- **Audio files:** they stream from archive.org and are never modified.

### 1.4 The current finder, with its measured behaviour
This is already a multi-stage pipeline (`js/finder.js`, `js/fp.js`, `js/ayah.js`):

| Stage | What it does now | Files |
|---|---|---|
| Input | Video (`accept="video/*"`), audio, the microphone, or a clip shared from another app. Audio is decoded with the browser's `decodeAudioData`, and only the sound is used. | `finder.js` `finderDecode`, `sw.js` |
| Fingerprint | 8 kHz mono audio, 32 ms frames, a whitened log spectrum, then the strongest peaks, then pairs of peaks (landmarks). Only 312–3,625 Hz is used. | `fp.js`, `tools/fingerprint/fpcore.py` (kept identical) |
| Index | 61.9 M landmarks in 65,536 static shards (`fp/`, 419 MB). A search downloads only the shards its own landmarks hash to. Each build has an ID, so parts of two builds can never be mixed. | `fp/`, `build_index.py`, `finderManifest` |
| Vote and sections | Votes on (recording, time offset). The clip is cut into sections, and each section is matched on its own. | `finderVote`, `finderSections` |
| Speed | Retries the search with the clip resampled (speed and pitch changed together) and time-stretched (tempo only). | `finderSearch` modes `r`/`t`, `fingerprintTempo` |
| Timestamps | The start comes from the median offset of the matching landmarks, with the earliest clear change (`finderCut`) as the boundary. | `finderRefine` |
| Copies | The same audio in other files is grouped, but only when it agrees with the clip all along. | `finderGroup` |
| Verses | A Quran-specific speech model (whisper-tiny-ar-quran, 66 MB, run in a worker with transformers.js) feeds a 4-gram skeleton matcher over the Quran text. Looping transcripts are removed. Only *confirmed* places name a surah. | `ayah.js`, `models/` |
| Verse map | Every recording was analysed in 30 s windows every 60 s (82,442 windows). A sound match is checked against what that recording recites at that point. If the original isn't found, the finder lists recordings that contain the recognised passage. | `vm/`, `tools/verses/analyse.mjs` |
| Confidence | Confirmed / possible / not found. | `finderRun` |

**Measured accuracy** (`docs/FINDER-ACCURACY.md`):
- **The test:** 150 clips from 15 recordings, each searched with the original in the library and again with it hidden.

| Clip | Right recording, confirmed |
|---|---|
| All 150 | 134 |
| MP3, 10 s mid-ayah, phone quality, video | ≥ 14/15 each |
| Tempo +5 % | 13/15 |
| 1.25× and 0.8× speed | 15/15 |
| Music underneath | 8/8 |
| Heavy echo | **10/15** |
| 7-second clips | **12/15** |

- **Wrong answers:** 0 wrong recordings confirmed, and 0 false matches when the original was hidden.
- **Timing:** within 0.04 s on clean clips. A 3-second intro made the start 3 s early.

### 1.5 What the existing system cannot do, or hasn't been tested on
1. **Pitch shift with the tempo kept.** Landmarks encode absolute frequency, and one semitone moves a peak by up to 13 bins, so these clips almost certainly fail. This has **never been tested**, and it's the commonest social-media edit after speed.
2. **Reverb, equaliser and bass boost, heavy compression, and several edits combined:** not tested. Heavy echo already loses a third of clips.
3. **No melody features.** No pitch contour or tune is stored or compared.
4. **No voice features.** Nothing checks that the reciter is Abdul Basit. A clip of another reciter reciting the same verses just gives "not found", with no reason.
5. **The verse map is coarse.** It covers only half of each recording (30 s every 60 s), and only 37 % of windows are placed with confidence. That isn't enough to list every performance of a given passage reliably.
6. **No usable test material in this container.** The evaluation audio (`eval-work/`, not committed) was lost when the container was restarted. Also, this container's network blocks archive.org's audio servers (only its metadata API is reachable).
7. **Search time** has never been measured as a number.
8. **Video formats:** MP4/AAC decodes in every current browser. MOV and other containers depend on the browser, and there's no fallback if decoding fails.
9. **Missing from the index:** one file failed to index (`failed: 1` in `fp/manifest.json`).

---

## 2. Constraints that shape the design

| Constraint | Consequence |
|---|---|
| **No server.** The app is static, and every search runs on the user's phone. | Everything heavy is precomputed on GitHub Actions. A search downloads only small, targeted parts of the indexes. Models must be small enough for phones; the current one is 66 MB and cached after the first use. |
| **GitHub Pages limits:** about 1 GB per site, 100 MB per file. | The current indexes use about 500 MB. New feature stores must stay within roughly 150–250 MB in total, and be split into small files. |
| **One reciter.** Almost every recording is Abdul Basit. | A voice model can say "this is (not) Abdul Basit", but it **cannot reliably tell his performances apart**: the same voice sings both. Telling performances apart has to come from melody, timing and exact audio alignment. |
| **The same passage recited many times** (e.g. Al-Qamar/Ar-Raḥmān more than 40 times) | Surah and ayah recognition narrows the search; it can never identify a recording on its own. |
| **Edits change sound, not structure.** | Pitch shift moves every note by the same amount. Speed scales time. Echo, EQ and compression change the spectrum. All of them keep the **shape of the melody** (relative pitch over relative time). That is the feature to build on. |

A server would make some of this easier: full-size models, FFmpeg for every format, and speed. But the app would then need hosting and running costs. The plan below **keeps the app server-free**. That is a decision for you (see §6).

---

## 3. Proposed architecture

```
clip (audio or video)
  │ 1. Ingest: decode (browser; ffmpeg.wasm fallback for formats it can't read) → 16 kHz mono, loudness-normalised
  │            silence/intro/music detection → speech-like regions (sections)
  ├─ 2. Content: Quran speech model → text → aligned to the Quran → surah:ayah ranges + where in the clip
  ├─ 3. Transformations: estimate tempo factor, pitch offset, echo/reverb, band-limit, noise, loudness
  ├─ 4. Melody: pitch contour (F0) → key-free (semitones relative to the median) and tempo-free
  │           (time-normalised) representation; phrase boundaries (pauses, elongations)
  ├─ 5. Voice: is this Abdul Basit? (speaker embedding vs a centroid of his voice); era/recording-chain hint
  │
  ├─ 6. Candidates (coarse): union of
  │      a) landmark votes (existing index; re-run with the estimated pitch/tempo correction)
  │      b) melody-shape search (new index: contour n-grams)
  │      c) verse index: every recording/time where these ayat are recited (denser verse map)
  │      → ranked short list of (recording, approximate time)
  ├─ 7. Exact match (fine): for each candidate, download only that recording's features around the time
  │      → landmark alignment (offset + speed line) AND contour alignment (DTW) AND verse agreement
  ├─ 8. Timestamp: offset from the aligned line (landmarks), refined by contour DTW, corrected
  │      for the estimated tempo; boundaries per section
  ├─ 9. Verification and confidence: independent checks must agree; margin over the runner-up;
  │      thresholds set from tests → Confirmed / High confidence / Possible / No reliable match
  └─ 10. Result: each section → recording, surah:ayah, original duration, timestamp, place/year as stored, confidence,
         "Play from here"
```

### 3.1 What each stage contributes, and what I expect from it

| Stage | Role | Method (to be validated in its step) | Limits to expect |
|---|---|---|---|
| Ingest | Get clean audio from any input | `decodeAudioData` first; **ffmpeg.wasm** (single-thread core, about 25–30 MB) only when that fails, e.g. some MOV/MKV files, downloaded only when needed. Detect silence, intro and music so sections start in the right place (fixes the "3 s early" error). | ffmpeg.wasm is large and slow on phones, so it's a fallback only. |
| Content | Narrow the search to recordings containing the passage; check the result | The existing model and matcher, evaluated on the new tests first. Options if it's weak: a bigger Quran-fine-tuned Whisper (e.g. *base*) for long clips, phoneme/skeleton alignment that tolerates elongation and repetition, and recognising several windows across the clip so the clip's start and end ayah are found. | Old, noisy live recordings are hard for any speech model; the content stage gives a prior, not proof. |
| Transformations | Undo edits before matching | **Tempo:** compare the clip's tempo with each candidate's during alignment (the slope of the landmark line or DTW). **Pitch:** search the landmark index with the clip's spectrum shifted in frequency (a grid of about ±4 semitones, steered by the pitch-contour offset). **Echo/reverb:** estimate the decay. **Band-limiting:** a spectral roll-off check. **Noise:** the noise floor. Each estimate is reported and used for matching. | Pitch offset can only be known *relative to a candidate*, so it is estimated jointly with matching. |
| Melody | Tell performances of the same verses apart, and survive pitch shift, EQ and reverb | **F0 tracking** (YIN/pYIN-style; tested against CREPE-tiny if needed) gives a semitone contour; a key-free, tempo-free shape is compared with **DTW** and searched with contour n-gram hashes. This "query by singing" style of matching is the standard approach in music cover-song identification. | Different performances in the same maqam can share phrases. Melody makes a candidate list; it is not proof alone. |
| Voice | Is it Abdul Basit? A weak era hint | A small speaker-embedding model (e.g. an ECAPA/x-vector ONNX, a few MB) compared with his voice centroid built from the archive. It could also give the recording-chain and era character, for a weak prior only. | **It cannot identify the performance** (same voice). It will be used to reject other reciters ("this sounds like another reciter"), never to confirm a match. If tests show it adds nothing, I'll say so and drop it. |
| Candidates | Thousands of segments become a short list | Fuse ranks from three independent searches (landmarks, melody, verses); calibrate the weights on tests. | — |
| Exact match | Same performance, or not? | **Two independent alignments must agree:** (1) landmark offsets on one straight time line (already the strongest test: 0 false confirmations so far); (2) the contour DTW path on the same line, with low cost. Plus the verses agreeing with the verse map. | Clips where landmarks fail completely (heavy pitch shift and reverb together) depend on the melody line plus verses; these may reach only "High confidence". |
| Timestamp | Time in the original | The intercept of the aligned line, refined by contour DTW, in original-file seconds with tempo already accounted for. Test target: within 0.25 s of the true time on edited clips; within 0.05 s on clean ones (as now). | — |
| Verification | Never show a wrong answer as confirmed | Confirmed only if the landmarks and melody agree on the same line, the verses don't contradict, and the margin over the runner-up passes a threshold. Thresholds are set from the **hidden-original** tests: the false-confirmation rate must stay 0. | — |

### 3.2 New precomputed indexes (built on GitHub Actions; incremental by recording ID, like `fp/` and `vm/`)

| Index | Content | Size estimate |
|---|---|---|
| `mf/` melody frames | Each recording's pitch contour at 20 frames/s, 1 byte per frame (semitone ×4, plus unvoiced), with phrase/pause marks; sharded by recording ID | 1,351 h × 72,000 B/h ≈ **97 MB** (about 25 KB per 20-minute recording; only candidates are downloaded) |
| `mh/` melody hashes | Key-free, tempo-free contour n-gram hashes → (recording, time), sharded like `fp/` | About 60–120 MB (to be measured) |
| `vi/` verse index | ayah → [(recording, time)], from a denser verse map (overlapping windows covering the whole recording) | About 10–20 MB |
| `fp/` (existing) | Landmarks: unchanged, reused | 419 MB |
| Voice centroid | One embedding plus a threshold | < 1 MB plus the model |

**Adding recordings:** a new recording only needs its own features computed and its shards updated; the manifests list a build ID (the existing pattern), so phones never mix builds. No recordings or metadata are duplicated; indexes refer to the existing `e:KEY:file` IDs.

### 3.3 Integration
- **Where:** everything stays inside the existing Find-a-recitation screen and its result cards.
- **Display:** the result card already shows the recording, place/year (as stored), the matched time and "Play from here". It will add surah:ayah per section, the original duration, the detected edits (e.g. "pitch +2 semitones, 1.1× speed, echo") and the new confidence levels.
- **Cost of the new work:** it runs in workers, downloads targeted parts only, and is cached by build ID.
- **What stays:** existing behaviour (copies, verse lists, "not found" suggestions, shared clips, the microphone) is kept.

---

## 4. Test plan (built in Step 3, extended at every step)

**Source material:**
- **Ground truth:** clips cut from archive recordings at known times.
- **Hard negatives:** other performances of the **same ayat** (found with the verse map) and the same verses at the same venue. For each, the system must *not* confirm the wrong one.
- **Hidden originals:** every clip is also searched with its original and copies hidden; any confirmation is then a false positive.

**Alterations**, generated with FFmpeg / SoX / rubberband, each alone and in combinations:

| Group | Alterations |
|---|---|
| Format and channel | MP3/AAC at low bitrates; MP4 and MOV video; phone band-limit |
| Space and noise | Echo; reverb (several room sizes); noise |
| Tone | Pitch ±1/±2/±3/±4 semitones with tempo kept |
| Speed | Tempo 0.8–1.25 with pitch kept; resample-speed 0.8–1.25 |
| Spectrum | EQ (bass boost, treble cut); heavy compression and limiting; distortion |
| Length and edits | Cropping; 3/5/7/10/20/44 s lengths; silence and intro added; music underneath |
| Multiple extracts | Two or three extracts joined, in and out of order; extracts from two different recordings |

**Measures**, per category:

| What | Measure |
|---|---|
| Content | Correct surah; correct ayah (start/end within ±1) |
| Reciter | Correct reciter verdict |
| Recording | Exact original found and confirmed; confidence-level calibration |
| Timing | Timestamp error (median and 95th percentile) |
| Wrong answers | False confirmations (hidden-original and hard-negative tests) |
| Speed | Processing time on a desktop and on a phone-class CPU |

**Where the tests run:** archive.org audio is blocked in this container, so the test set is built and the browser evaluation run **on GitHub Actions** (the same way the index is built), with results committed. If you allow archive.org audio hosts for this environment, I can also run tests here, which is faster to iterate.

**Baseline first:** before changing anything, the current finder is measured on the new categories (pitch shift, reverb, EQ, combinations), so every later step shows a before/after.

---

## 5. Implementation order (matches your checklist; each step is tested before the next)

| Step | Deliverable | Test that closes it |
|---|---|---|
| 1 | This assessment | — (done) |
| 2 | Detailed design: data formats, interfaces between stages, confidence rules, sizes | Review by you; prototype sizes checked on 20 recordings |
| 3 | Ingestion: decode all formats (with the ffmpeg.wasm fallback), normalise, detect sections and intro; **plus the test set and baseline** | Every test file decodes; section starts within 0.3 s; baseline report |
| 4 | Quran content: evaluate the current model on the test set; improve (multi-window, start/end ayah, better alignment, bigger model if needed) | Surah/ayah accuracy per category, before and after |
| 5 | Transformation analysis: tempo, pitch, echo, band, noise estimators; the pitch-shifted landmark search | Estimates within tolerance on generated edits; pitch-shift recall, before and after |
| 6 | Melody: F0 tracker, key/tempo-free contour, DTW; offline `mf/` for a pilot set | Same-performance vs other-performance separation on hard negatives |
| 7 | Voice: speaker embedding, Abdul Basit centroid, threshold | Abdul Basit vs other reciters accuracy; a measured statement of what it can and can't tell apart |
| 8 | Candidate fusion | Recall of the right recording in the top 10, per category |
| 9 | Full archive indexing (`mf/`, `mh/`, `vi/` for all 3,081 files; incremental updates) | Every file indexed; an incremental add tested; sizes within budget |
| 10 | Exact-match decision (two independent alignments plus verses) | 0 false confirmations; recall per category |
| 11 | Timestamp refinement | Error statistics against known positions, on edited clips |
| 12 | Verification and four confidence levels, thresholds from tests | Calibration table (precision per level) |
| 13 | Several sections per clip; different recordings in one clip | Joined-clip tests: each section mapped, none forced together |
| 14 | UI integration | Functional tests; existing features unchanged |
| 15 | Full test run, optimisation, report | Final accuracy/timing report (`docs/FINDER-ACCURACY.md`) |

---

## 6. Decisions for you before Step 2
1. **Server or not.** I recommend staying **server-free**: phones do the search, and GitHub Actions does the heavy indexing. A server would allow bigger models and any video format, but it costs hosting and upkeep.
2. **Test environment.** Allow archive.org's audio hosts for this environment so tests can run here, or accept that the tests run on GitHub Actions only (slower to iterate, but it works now).
3. **Download sizes on phones.** The first search with the full engine may download up to about 70 MB of models (the speech model already does), plus a few MB of index parts per search. Is that acceptable, or should the melody and voice stages be opt-in, like the current "verses" option?

**Next stage: Step 2, the detailed design.** It starts once you've reviewed this plan and answered the three decisions.
