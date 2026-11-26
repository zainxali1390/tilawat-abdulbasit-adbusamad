# Step 11: Precise timestamp alignment

Status: **done** (26 Nov 2026). Code: `MATCH.timestamp` in `js/engine/match.js` (and the inlier range and scatter now
reported by `MATCH.lmLine`). Tests: `tools/engine/eval/timestamp_score.py` on the in-page run (`run_exact.js`,
`engine-exact.yml`), `test_match.mjs`. Results: `tools/engine/eval/results/exact-20261126-2029-08dd57f/timestamp-score.txt`
(final), with the earlier runs `exact-20261126-1952-241f2d3` and `exact-20261126-2011-9217280` kept for comparison.

## 1. What the result states

For the matched recording:

| Field | Meaning |
|---|---|
| `start`, `end` | where the matched recitation begins and ends **in the original** (seconds) |
| `clipA`, `clipB` | the same two moments in the clip; an intro (music, noise, added silence) is left out |
| `k` | tempo: seconds of the original per second of the clip (1.1 = the clip is 10 % faster) |
| `origDur` | the matched length in the original |
| `err`, `errEnd` | the stated uncertainty of the start and of the end |
| `src` | which alignment the times come from: `landmarks` (≥ 6 inliers) or `melody` |

## 2. How

1. **The line.** Landmarks with at least 6 inliers give time in original = k · time in clip + b with a scatter of a few
   hundredths of a second. Otherwise the melody alignment gives it, precise to one 50 ms frame and 0.5 % in tempo.
2. **The span in the clip.** It starts as the range of the landmark inliers, or for a melody line, the recitation
   sections from `ENGINE.ingest`.
   - Recitation sections may extend it by at most 0.5 s.
   - A longer gap to a section edge is taken in one go only if the whole gap matches the recording (the clip's melody
     against the recording's melody through the line). That is how a clip's first words before its first landmark are
     kept, and how a span stops at the join between two parts.
3. **The edges, against the recording,** 0.25 s at a time:
   - **at the start**, only matching voice extends it, so a silent or musical intro is never counted;
   - **at the end**, matching voice or a pause shared with the recording;
   - the last 1.5 s of a clip with no music or noise section run on to its end.
4. **Clipping.** The span is cut so the original never starts before 0 or ends after its length.
5. **Error.** For landmarks: 2 × scatter / √inliers, at least one 32 ms frame. For melody: 0.1 s. The end adds the
   tempo uncertainty over the span.

## 3. Results: the right recording on 626 clips (the original present)

| | Engine | Today's finder (560 clips with a result) |
|---|---|---|
| Start in the original, median | **0.02 s** | 0.02 s |
| Start, 90th percentile | **0.06 s** | 2.98 s |
| Start within 0.1 s | 589 / 626 | — |
| Start within 0.5 s | **619 / 626** | 491 / 560 |
| Clip start right (intro left out), within 0.5 s | **623 / 626** | 493 / 560 |
| End, median (90th percentile) | **0.02 s** (0.29 s) | 0.02 s |
| Matched duration, median error | 0.02 s | — |

- **When the two alignments agree** (565 clips, the ones that can be confirmed in Step 12): the start is within 0.1 s for
  540, within 0.5 s for **564**, and the largest error is 0.52 s.
- **The stated error** (3 × err + 0.05 s) covers the true start for 545/565 of those, and 597/626 of all.

**By edit** (median start / end error): 0.01–0.03 s / 0.01–0.05 s for clean, formats, video, lengths 7–44 s, pitch ±1–4,
speed 0.9–1.25, tempo 0.8–1.25, bass, treble, compression, distortion, phone, and intros (music, noise, silence). The
exceptions:

| Edit | Start | End | Note |
|---|---|---|---|
| Joined parts (2 or 3) | 0.02–0.09 s (90th 0.32–0.48 s) | 0.02–0.07 s | Step 13 then gives each part separately |
| Heavy reverb | 0.02 s | 0.42 s | the reverb tail blurs the end |
| Music under the voice | 0.01 s | 0.81 s | |
| Combined edit 3 | | | only 6 clips get the right recording; 2 of them are off by more than 1 s |

**The 5 clips off by more than 1 s** all have weak evidence: the alignments disagree and the melody score is 0.25–0.56. Step
12 cannot confirm such a match, so a wrong time is never shown as certain.

## 4. Problems found and fixed (measured on the 640 clips each time)

| Version | Start within 0.5 s | End, median | Problem |
|---|---|---|---|
| Span from the recitation sections only | 598 | 0.03 s | **Joined clips:** a section can run across the join, so the span took in the other part (start 6–9 s off) |
| Sections limited to 2 s beyond the evidence | (local) | | Still crossed abutting joins (1.96 s) |
| Sections limited to 0.5 s, edges stepped against the recording | (local) | | **Music intro:** the first landmark 2.4 s after the recitation started, and the 0.25 s steps stopped at the first breath |
| Plus: a whole matching gap taken in one go | 619 | 0.16 s | End stopped at the last confident step |
| Plus: a clip's last 1.5 s run on (final) | **619** | **0.02 s** | — |

Also: at first the start edge was allowed over shared silence, which took in an added 3 s silent intro (the recording was
quiet there too). The start now extends over matching voice only.

## 5. Functional tests (`test_match.mjs`, 20/20 pass; 6 new)

- An intro is left out, and the start is right (303.35 against 303.30).
- An error is stated, and it is larger at the end.
- A melody line spans the recitation sections.
- The span is cut so the original stays between 0 and its length.
- No evidence gives no timestamp.
- A pause shared with the recording at the clip's end is kept.

## 6. Limitations

- A clip that begins in a natural pause of the recording is placed where its first words begin. That is the useful place
  to start playing, but it is up to the pause's length later than the cut.
- The end blurs under heavy reverb and a music bed (0.4–0.8 s).
- Joined clips: one part per match here. Every part is placed in Step 13.
