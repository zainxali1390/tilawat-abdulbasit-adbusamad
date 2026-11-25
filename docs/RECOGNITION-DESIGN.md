# Recognition engine: detailed design (Step 2)

This builds on the assessment in `docs/RECOGNITION-ENGINE.md`.

**Decision:** the app stays **server-free**. Searches run on the phone, and heavy indexing runs on GitHub Actions. Tests also run on GitHub Actions, because archive.org's audio servers can't be reached from the development container.

Each section names the step that implements it. Formats are kept as small and simple as the existing `fp/` and `vm/` indexes.

---

## 1. Where the code lives

| Part | File | Runs in |
|---|---|---|
| Ingestion: decode, normalise, sections | `js/engine/ingest.js` (+ optional `vendor/ffmpeg/` loaded on demand) | Main thread (decoding needs WebAudio) → worker |
| Content: surah and ayah | `js/ayah.js` (existing, extended) | Its existing worker |
| Transformations, melody, voice features | `js/engine/features.js` | `js/engine/worker.js` (new worker) |
| Candidates, exact match, timestamps, verification | `js/engine/match.js` | The same worker |
| Landmark fingerprints | `js/fp.js` (existing; adds frequency-scaled queries) | The same worker |
| Orchestration, results UI | `js/finder.js` (existing; `finderRun` calls the engine) | Main thread |
| Offline indexers | `tools/engine/*.py`, `tools/verses/analyse.mjs` | GitHub Actions |
| Tests | `tools/engine/eval/` (test-set builder, browser runner, scorer) | GitHub Actions |

Scripts stay classic (no build step), like the rest of the app. The worker loads `fp.js`, `features.js` and `match.js` with `importScripts`.

## 2. The pipeline as function calls

Every stage returns plain data, so each one can be tested on its own and its result stored for inspection.

```
ingest(blob)            → {pcm: Float32Array@16k, dur, sections:[{a,b,kind:"recitation"|"silence"|"music"|"speech"}], format}
content(pcm, sections)  → {windows:[{a,b,su,ay,su2,ay2,level,text}], span:{su,ay,su2,ay2}|null}
transforms(pcm)         → {band:[lo,hi], snr, reverb:{rt60}, loud, clipping}      // absolute properties of the clip
melody(pcm)             → {f0: Uint8Array@20fps (mf format), phrases:[{a,b}]}
voice(pcm)              → {ab: 0..1, embedding}                                     // "is this Abdul Basit?"
candidates(feat)        → [{code, t, src:{lm,mel,verse}, score}]                    // ≤ 30, coarse
exact(feat, cand)       → {code, line:{k,b}, lm:{inliers,span}, mel:{score,shift,k}, verse:"agree"|"none"|"contradict"}
timestamp(feat, match)  → {at, end, err}                                            // seconds in the ORIGINAL file
verify(all)             → {level:"confirmed"|"high"|"possible"|"none", reasons:[…]}
```

**Tempo and pitch shift aren't absolute properties of a clip.** They can only be measured against a candidate, as the slope of the alignment line and the median pitch difference. So `exact()` reports them, and the result card shows them ("1.1× speed, +1 semitone").

## 3. Data formats

### 3.1 `mf/` melody frames (new; Step 6 pilot, Step 9 full archive)
- **Content:** per recording, the pitch every 50 ms (20 frames/s), **1 byte per frame**.
  - `0` means unvoiced.
  - `1..255` means `1 + round((midi − 36) × 4)`, i.e. quarter-semitone steps from C2 (65 Hz) to about B6.
- **Files:** `mf/XX.bin` for 256 shards by FNV-1a of the code (the same hash `vm/` uses). Each shard is a list of `[code length][code][frame count][frames]`. `mf/manifest.json` gives `{v, built, build, recs:{code:[shard, offset, frames]}}`. A search downloads only the shards of its candidates, about 25 KB per 20-minute recording.
- **Size:** measured on 20 recordings in the design check (§7).

### 3.2 `mh/` melody hashes (new; Step 9)
- **What's hashed:** a key-free and tempo-free summary.
  1. The contour is split into **notes**: stable stretches of at least 150 ms, or the voiced parts between pauses.
  2. Each note gives its pitch **relative to the previous note**, quantised to half-semitones, and its **duration relative to the previous note**, quantised to 4 levels on a log scale.
  3. A hash is formed from 4 consecutive (interval, duration ratio) pairs, 20 bits, plus the time of the first note.
- **Effect:** pitch shift cancels out in the intervals, and tempo cancels out in the ratios.
- **Layout:** the same layout as `fp/` (2-level shards, `[rec 14 bits][time 18 bits]` entries), so the existing shard fetching and voting code is reused.
- **Role:** this is the melody search that works **without** any help from landmarks. It's meant for clips whose landmarks are destroyed, such as heavy reverb combined with pitch shift.

### 3.3 `vi/` verse index (new; Step 4/9)
- **Built from:** a denser verse map, with overlapping 30 s windows every 15 s across the **whole** recording, replacing the current 30 s every 60 s. It is built with the existing `tools/verses/analyse.mjs` and the same model.
- **Format:** `vi/SSS.json` per surah, mapping `ayah → [[code, t, level]]`. It's small (about 10–20 MB), and a search downloads only the surahs it recognised.
- **Existing `vm/`:** it stays as it is (per recording → windows). The finder already uses it to check verses.

### 3.4 Voice reference (Step 7)
- **File:** `models/voice/` holds a speaker-embedding model in ONNX, run with onnxruntime-web, which already comes with transformers.js.
- **Reference:** `voice/centroid.json` holds the mean embedding of Abdul Basit over about 300 archive segments of varied eras and quality, plus the threshold found in tests.
- The model is chosen in Step 7 by measurement (candidates: ECAPA-TDNN and x-vector models exported to ONNX, a few MB each).

### 3.5 Building indexes and adding recordings
- **Incremental updates:** every index has a manifest keyed by recording ID. An indexer processes only the IDs that are new or changed, compared with the manifest, and rewrites only the shards they touch. This is the pattern `fp/` already uses.
- **Build IDs:** each manifest carries a build ID (an FNV hash of its recording list). Shards are fetched with `?b=<build>`, so a phone can never mix two builds (the cause of the Al-Anfāl/Al-Infiṭār mistake).
- **Workflow:** one combined workflow (`engine-index.yml`) runs after `fingerprint-index.yml`, using the same recording list.

## 4. Matching decisions in detail

### 4.1 Candidates (Step 8)
Three independent searches, each giving (recording, approximate time, score):
1. **Landmarks:** the existing vote, done three ways:
   - first as is;
   - then, if no confirmed line, with the clip's **spectrum scaled in frequency** by ±1…±4 semitones (pitch-shift correction; done on the spectrogram before peak picking, so it costs one extra fingerprint per step);
   - then with the existing speed and tempo retries.
2. **Melody:** a vote over `mh/` hashes (§3.2).
3. **Verses:** the recordings and times in `vi/` for the recognised ayat.

The three lists are fused by reciprocal-rank fusion (Σ 1/(60 + rank)), and the 30 best are kept. A recording found by two or three searches near the same time rises.

### 4.2 Exact match (Step 10)
For each candidate, its melody frames around the time and its landmark entries are fetched, and **two independent alignments** are made:
- **(A) Landmarks:** a RANSAC line, time in original = k × time in clip + b. Report the inliers and the time span covered. This is the method already used for copies, with 0 false confirmations in testing.
- **(B) Melody:** a subsequence alignment of the key-free contour, with a grid of tempi, a constant pitch shift and a robust cost (the method in §7). Report the score, tempo k, shift, and offset b.

They **agree** when their tempo and offset give the same line, within 3 % in tempo and 0.5 s in offset.

**Verse check:** the verse map at the matched time either agrees with the clip's recognised verses, contains no verses, or **contradicts** them.

### 4.3 Timestamp (Step 11)
- **Main estimate:** `at` = b (the intercept of the agreed line), in seconds of the original file.
- **Refinement:** the landmark line where it has at least 30 inliers, otherwise the melody alignment.
- **Section boundaries:** the existing earliest-clear-change logic (`finderCut`), applied to the agreed line, with silence/music detection from `ingest()` so an intro doesn't pull the start earlier.

### 4.4 Confidence levels (Step 12; the numbers below are starting points, set from tests)

| Level | Rule |
|---|---|
| **Confirmed** | (A) and (B) agree on one line; (A) ≥ 60 inliers over ≥ 50 % of the clip; the verses don't contradict; the margin over the best *other* recording (excluding copies) passes the threshold. |
| **High confidence** | (A) or (B) passes its strong threshold alone, the other doesn't contradict, and the verses agree. |
| **Possible** | One weak signal, or the right verses at a candidate with a similar melody. Shown as "may be". |
| **No reliable match** | Anything else. The screen says so, lists the recognised verses if confirmed, and lists recordings that contain those verses. |

Thresholds are set on the **hidden-original** and **hard-negative** tests, so that Confirmed has **0 false confirmations** and High confidence stays at or above 98 % precision.

### 4.5 Voice (Step 7)
- **Use:** it adds a reason when there's no match ("this does not sound like Abdul Basit"), and it **blocks** Confirmed when the voice is clearly someone else.
- **Not used for:** confirming a recording (§2 of the assessment: one voice sings all performances).

## 5. Sections and joined clips (Step 13)
- **How a clip is split:** first by `ingest()` (silence, music and speech between recitation), then by the existing per-section matching. A new section starts where the agreed line breaks (a jump in offset).
- **Matching:** each section is matched independently.
- **Output:** a list of (section → result). Sections that land on the same recording are shown together, in clip order, each with its own time. Sections from different recordings are shown as separate results, never merged.

## 6. Interface
- **Where:** the existing finder screen.
- **Result card:** the existing card, plus:
  - surah:ayah for each section;
  - the original duration;
  - the detected edits;
  - the new confidence label.
- **Unchanged:** "Play from here" (`startPlay(…, at)`), copies, the "not found" suggestions, the mic and shared clips.
- **Progress:** the progress line shows the stage names (Decoding → Verses → Melody → Searching → Checking).

## 7. Design check: melody on 20 recordings (closes Step 2)

**What was run:** `tools/engine/proto_melody.py` on GitHub Actions (`engine-prototype.yml`).
- **Recordings:** 20 real recordings, 12 of them **different performances of Al-Qamar / Ar-Raḥmān**.
- **Clips:** two clips each, 20 or 44 s, at random times.
- **Edits:** clean, pitch +2 and −3 semitones (tempo kept), tempo 1.15 and 0.85 (pitch kept), reverb, phone band and noise, and a combination (+1 semitone, 1.1× speed, echo, bass boost, treble cut).
- **Search:** each clip's melody was searched against all 20 recordings.

Results are in §7.1 (raw data: `tools/engine/proto-melody-results.json`).

**Local check, before the run** (the one recording stored in the repository, against a decoy of its own melody rearranged):
- **Pitch:** pitch shifts were measured exactly (+2 → −2.0, −3 → +3.0).
- **Tempo:** ±15 % was found (1.15, 0.85).
- **Timing:** time error 0–0.2 s.
- **Combined edit:** recovered as 1.09× speed, −0.99 semitones.
- **Cost:** the pitch tracker took about 1 s of CPU per 9 minutes of audio.

### 7.1 Results (GitHub Actions run, 25 Nov 2026)

**What was searched:** 40 clips × 8 versions = 320 searches, each against all 20 recordings (9.2 hours of audio).

Six of the 40 clips (all from old, noisy live recordings) gave too little tracked pitch to search at all; §7.3 covers why. Leaving those out:

| Version of the clip | Right recording first, time within 1 s | Median time error |
|---|---|---|
| Clean | **34/34** | 0.02 s |
| Pitch +2 semitones (tempo kept) | **32/34** | 0.02 s |
| Pitch −3 semitones (tempo kept) | **33/34** | 0.02 s |
| Tempo 1.15 (pitch kept) | **32/34** | 0.04 s |
| Tempo 0.85 (pitch kept) | **31/34** | 0.07 s |
| Phone band and noise | **31/34** | 0.02 s |
| Reverb | 26/34 | 0.02 s |
| Combined (+1 semitone, 1.1× speed, echo, bass boost, treble cut) | **16/34** | 0.2 s |

Two clips tied with another file at the same score in every version. That other file is almost certainly a copy of the same performance, and those ties are counted as right. The per-edit summary inside the results file counts them as wrong, and doesn't leave out the six clips.

**Telling performances apart**, the key question:
- **Clean clips from the 12 Al-Qamar/Ar-Raḥmān performances:**
  - the right performance scored a median **0.77**;
  - the best **other Al-Qamar/Ar-Raḥmān performance** scored **0.32**.
- **Pitch-shifted and tempo-changed clips:** the gap stayed about as wide.

The tune clearly separates different performances of the same verses.

| Measure | Value |
|---|---|
| Size | **72 KB per hour → 97 MB for the whole archive** (as estimated) |
| Pitch tracking | 2.6 s of CPU per hour of audio (about 1 hour for the whole archive on one runner) |
| Brute-force melody search | 0.12 s per archive hour on a runner, which would be about 160 s for the whole archive, and the phone would need all 97 MB first |

### 7.2 Pitch-shift correction for landmarks (local check, the repository recording, a 20 s clip)

**The problem:** a shift of even one semitone destroys the landmark match. Matching points at the true time fell from 160 (clean) to 1. The current finder would miss **every** pitch-shifted clip.

**The fix works.** Scaling the clip's spectrum by the right amount before peak picking restored:
- 59 matching points for +1 semitone;
- 40 matching points for +2 semitones;

in both cases at exactly the true time, with no other offset getting more than 1. The −3 case wasn't in the shift grid tried, so its correction wasn't tested.

### 7.3 What this means for the design

1. **Melody is confirmed as an independent, edit-proof signal.** It is robust to pitch and tempo changes, which are the edits that defeat landmarks. It separates performances of the same verses. Its timestamps are as accurate as the landmarks' (0.02 s). It stays in the design as signal (B).
2. **Brute force over the archive is too slow and too big for a phone.** So the melody needs its own hash index (`mh/`, §3.2), or else candidates from landmarks or verses first, then melody checks only on those (§4.1). Both are kept: candidates come from three searches, and the melody check runs on the short list only.
3. **Weak points to fix in Step 6:**
   - **(a) The pitch tracker on old, noisy tapes.** It found too little pitch in 6/40 clips. Plan: compare YIN with pYIN-style voicing and a harmonic-sum tracker; tune the voicing threshold on these recordings.
   - **(b) Reverb and the combined edit** (26/34 and 16/34). Echo smears the pitch. Plan: median filtering, then a note-level contour that ignores echo tails. In the full engine, these clips also have landmarks (after pitch correction) and verses as further signals, so melody doesn't need to carry them alone.
4. **The landmark pitch-shift correction (§4.1)** goes into Step 5 as planned. Its cost is one extra fingerprint per shift step, steered by the melody's measured shift.
5. **Confirmed must not rely on melody alone.** "Other performance" scores reach about 0.4–0.5, and near-ties occur under heavy edits, so melody can't be the only basis for a Confirmed result. This matches §4.4 (two agreeing alignments).
