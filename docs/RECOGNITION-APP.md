# Step 14: Integration into the app

Status: **done** (27 Nov 2026). Code: `js/engine/pipeline.js` (`ENGINE.run`), the engine stage and result cards in
`js/finder.js`, the engine scripts in `index.html`, the service worker (`sw.js`, v28), styles (`css/components.css`).
Tests: `tools/engine/eval/test_app.js` (the real app screen), and the 640-clip in-page test now calling the app's own
`ENGINE.run` (`run_exact.js`, `engine-exact.yml`, which runs both). Results: `tools/engine/eval/results/exact-20261127-1512-373c5ef`
(`app-test.txt`, `parts-score.txt`, `verify-score.txt`).

## 1. What changed for the user

"Find a recitation" works as before up to the sound search and the verses. Then a new step, **"Checking the matches…"**,
runs the recognition engine on the same clip:

1. The clip's melody.
2. Candidates from melody, verses and the landmark searches already made.
3. Two independent alignments per recording.
4. The clip's parts.
5. A measured level for each part.

The result cards now show:

| | Before | Now |
|---|---|---|
| Label | Confirmed match / Possible match, with a confidence % | **Confirmed match / High confidence / Possible match**, set by the measured rules (Step 12) |
| Why | "N moments of your clip agree" | The reasons, e.g. "Sound and melody agree on one timeline (30 matching points over 17 s, melody 96%)", "The verses heard match the recording at this point", "Another recording also matches" |
| Place | Start, end | The engine's start and end (Step 11: intros left out; median error 0.02 s) |
| Edits | Speed or pitch only when a retry found them | "Your clip plays about 6% faster than the original", "…pitch differs by about 2 semitones", measured on the match |
| Joined clips | Often one card, or none | One card per part, each with its own place and level (Step 13) |
| Copies | "Also found in another copy" | The same, plus copies the engine found on the same line |
| No match | "No reliable match" | The same, plus "The voice does not resemble Abdul Basit's recordings; this may be another reciter" when the voice check says so (Step 7). Its model (8.6 MB) is downloaded only then, and never offline |

- All new texts exist in **English and Arabic** (15 new keys each, checked).
- Everything else is unchanged:
  - play from here, play the section, full recitation, read the surah, share, save;
  - verses and the verse map;
  - the microphone and shared clips.
- **Fallback:** if the engine fails, the sound search's answer is shown as before. That happens when offline, when an index
  can't be fetched, or on any error. It was tested with the melody and verse indexes blocked.
- **Cache:** old cached answers are not reused (result cache key `p6`).
- **Service worker v28:** the 8 engine scripts are in the app shell. The new indexes (`mf/`, `mh/`, `vi/`) go to the
  network like `fp/` and `vm/`.

## 2. Measured: 640 clips through the app

The in-page test now calls the app's own `ENGINE.run` for the parts, and records the app's final answer (`finderLast`).

| | The app's answer | The engine called on its own |
|---|---|---|
| Confirmed: right / wrong / false with the original hidden | **608 / 0 / 0** | 609 / 0 / 0 |
| High confidence | 5 / 0 / 0 | 5 / 0 / 0 |
| Possible | 7 / 0 / 8 | 6 / 0 / 2 |
| Parts found (704 true segments) | **654** | 656 |
| Clips with every part found | 593 | 597 |
| Joined clips: segments found (of 112), every part (of 48) | 96, 35 | 94, 35 |
| Parts at High or better naming a wrong recording, original hidden | **0** | 0 |

**Against the app before the engine** (Step 5 finder, same clips):
- confirmed 569 → **608**;
- segments found 511 → **654**;
- joined clips with every part 2 → **35**;
- clip start within 0.5 s 491 → 619 (Step 11).

**Time:** the engine stage takes a median of 2.6 s and 3.9 s at the 90th percentile, after the sound search.

## 3. Functional tests on the real app screen (`test_app.js`)

**On GitHub, with the real CDN** (`app-test.txt`): 9 kinds of clips from 3 recordings, 27 clips. **91 checks pass.** The one
check counted as failed placed a joined-clip part at exactly the right time (236.24 s against 236.25) but at **Possible**:
cautious, not wrong.
- Every other clip was found at Confirmed, with the start within 0.4 s. That covers clean, video, pitch −4, tempo 1.25,
  noise 10 dB, music intro, combined edit 2, and both kinds of 2-part join.
- Reasons are shown, Arabic works, the fallback works with the indexes blocked, and there are no page errors.

**Locally** (7 clips): all pass, including noise → "No reliable match". The short middle part of a three-part join is
reported as the known Step 13 limitation.

## 4. Problems found and fixed

- **Pitch −4 had no card at first.** The parts stage was weaker than the single answer, because it pools the hits of all
  searches and aligns the melody on short stretches. Each shortlisted recording's whole-clip evidence (best search,
  melody over the whole clip) is now also a candidate line. On the 640 clips, segments found went 637 → 656 (combined
  edit 1: 7 → 15, pitch −2: 12 → 15), with no false parts added in the hidden runs.
- **The test measured a copy of the code, not the app's.** `run_exact.js` had its own parts code. It now calls
  `ENGINE.run`, the same function the app calls.
- **`finder.js` constants are not on `window`,** so the frame length, the manifest and the verse-map reader are passed in.
- **The verification table broke on the new level** "high" in the app's answer. Fixed.
- **The noise check needed ffmpeg on GitHub.** The test now writes its own noise file.

## 5. Limitations and what Step 15 should look at

- **Possible in the app (8 false in 640 hidden runs, against 2 for the engine alone).** When the engine finds nothing, the
  sound search's own weak "possible" results stay. Before the engine they gave 3 false.
- **The engine adds about 2.6 s and some downloads:** melody hash shards and about 30 melodies of about 25 KB each.
- **Old browsers:** the engine needs `OfflineAudioContext` (already needed) and Web Workers for the voice check only.
