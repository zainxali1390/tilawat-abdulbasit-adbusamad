# Step 10: Exact performance matching

Status: **done** (26 Nov 2026). Code: `js/engine/match.js`. Tests: `tools/engine/eval/run_exact.js` (the whole
narrowing and exact-match pipeline in the real app page), `exact_score.py`, `test_match.mjs`; workflow `engine-exact.yml`;
copies settled with `melody_local.mjs`. Results: `tools/engine/eval/results/exact-20261126-1817-2a165d0`
(`exact-score.txt`, `exact-rules.txt`, `copy-groups-step10.json`) and `melody-local-20261126-1918`.

## 1. What it does

For every recording on the shortlist (Step 8, at most 30), two **independent** alignments of the clip:

| | Method | Reports |
|---|---|---|
| **(A) Landmarks** (`MATCH.lmPairs`, `lmLine`, `lmBest`) | The clip's landmark hits in that recording, taken from the finder's own searches: as is, pitch-corrected, speed and tempo retries. Each search's time scale is converted back to clip time. The hits are fitted to one straight line, time in recording = k · time in clip + b, by RANSAC: every pair at least 1 s apart proposes a line with 0.75 ≤ k ≤ 1.33, the line with the most distinct clip moments within 0.1 s wins, then least squares on its inliers. The pair sampling uses a fixed seed, so the answer is the same every run. | inliers, the clip time they span, k, b |
| **(B) Melody** (`MELODY.alignNear`) | The clip's pitch line aligned in that recording around the landmark start, or the shortlist's suggested time. It allows any key and a tempo from 0.78 to 1.28, refined in 0.5 % steps. | score, k, start, pitch shift |
| **Agreement** (`MATCH.agree`) | (A) and (B) give the same line: tempo within 3 %, start within 0.5 s. | yes / no |
| **Verse check** (`MATCH.verseCheck`) | The recording's verse map over the matched span, against the verses heard in the clip. | agree / contradict / none |

## 2. Results: 640 clips, in the real app page

| | Result |
|---|---|
| Right recording (or a known copy) on the shortlist | 631 / 640 |
| Its two alignments agree | 576 |
| Right recording first when ordered by the evidence (agreement, then inliers, then melody score) | **623** |
| Start error of the right recording | median **0.02 s**, 90th percentile 0.04 s, within 0.5 s for 595/597 |
| Right recording's evidence | landmark inliers median 22, melody score median 0.908 |

For comparison, today's finder confirms 569 of these clips.

**By edit** (right recording first): 14–16/16 for every edit except:
- heavy reverb 14;
- combined edit 2: 15;
- pitch −2 and reverb small: 15;
- **combined edit 3 (pitch +3, speed 0.8, reverb): 4/16.** That edit also loses half its clips before the shortlist
  (Step 8).

**Speed** (in the page, after the finder):

| Stage | Median | 90th percentile |
|---|---|---|
| Melody of the clip | 0.13 s | 0.17 s |
| Melody candidates (hash vote + 30 alignments) | 0.8 s | 1.2 s |
| Whole exact stage | **1.6 s** | 2.2 s |

## 3. Hidden runs: false agreements and copies

With the original and its known copies removed, 187 wrong recordings still agreed, in 104 of the 640 runs. Each was
checked with the passage check from Step 6. That check matches 20 s melody windows of the original, every 10 s, 2 minutes
around the clip, into the other recording, and asks whether one time line passes through the place the alignment named.
Controls (different performances): 0–1 windows on a line.

| Agreeing pair | Copy (line through the exact place) | Line elsewhere | Not a copy |
|---|---|---|---|
| 6 or more landmark inliers (39) | 29 | 10 | **0** |
| 3–5 landmark inliers (136) | 76 | 24 | 36 |

So many recordings in the archive hold copies of the same audio: 9 groups and 58 recordings now
(`copy-groups-step10.json`), many differing by tape speed of about 6 %. Nothing in the library was changed; the groups
feed the "also in" list and the hidden-run counts.

**Wrong recordings that pass, copies settled** (`exact-rules.txt`):

| Rule: both alignments agree, and | Right (of 640) | Hidden runs with a wrong one passing | Copies counted only when checked directly (no chaining) |
|---|---|---|---|
| ≥ 3 landmark inliers | 576 | 33 | 36 |
| ≥ 4 landmark inliers | 576 | 1 | 4 |
| ≥ 5 landmark inliers | 572 | 1 | 2 |
| **≥ 6 landmark inliers** | **563** | **0** | **0** |
| ≥ 10 landmark inliers | 533 | 0 | 0 |
| ≥ 4 inliers and the verse map agrees | 233 | 0 | — |

The verse check cuts too many right answers to be a requirement (233), because many clips have no recognised verse or
no sure map window. In Step 12 it is a supporting reason and a veto when it contradicts.

These figures are the material for Step 12. Two independent alignments agreeing on one line with at least 6 landmark
inliers gave **no** false match in 640 hidden runs, however copies are counted. Between 3 and 5 inliers there are a few,
so that band needs more evidence before it can be called High confidence.

## 4. Functional tests (`test_match.mjs`, 14/14 pass)

- **Line fit:**
  - a line through 40 true hits among 400 random ones is found (39 inliers, k 1.0997 against 1.1, b 300.001, 7 ms);
  - random hits give no line;
  - under 3 hits, no line;
  - tempo outside 0.75–1.33 is refused.
- **Agreement:** accepted for the same tempo and start; refused for 9 % tempo, 2 s start, or no melody.
- **Verse check:** agree, contradict (a sure other surah), none (unsure, no sure map window, no verse heard).

## 5. Problems found and fixed

- **The first line-fit sampler** was hard to follow. It was replaced by "all pairs when few, otherwise a fixed-seed draw",
  and a helper the rewrite dropped was restored before any run.
- **Agreeing recordings in hidden runs** looked like false matches at first (187). Most are copies of the same audio,
  settled by the passage check. The rest decide the Step 12 thresholds.
- **The passage check could not read recordings kept in the repository** (`audio/`). Fixed.

## 6. Limitations

- Combined edit 3: half its clips never reach the shortlist, and only 4/16 come out first.
- The melody alignment is searched around the landmark start, so for recordings with landmark hits the two alignments
  are not fully independent in where they look. Their tempo, offset and score are measured independently, and the
  hidden-run test above measures the result as a whole.
- Copy groups are built from measured pairs; joining them in chains could in principle join two different performances
  through a partial copy. The counts are therefore given both ways.
