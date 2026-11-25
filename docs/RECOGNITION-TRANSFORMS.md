# Recognition engine: Step 5 (audio quality and edits)

**Results:** `tools/engine/eval/results/20261125-2016-f9cdeef/` (old and new finder on the same 640 clips; verses; clip-quality estimators).

## 1. Finding a clip through its edits (the main change)

Pitch shift and speed change only exist relative to an original, so they are found during the search: the finder tries corrected versions of the clip in turn, most common first.

**What the finder now tries:**
- **Pitch shift with the tempo kept** (new): the clip's spectrum is read back at the original frequencies before the fingerprint is made (`FPRINT.fingerprintShift` in `js/fp.js`), ±1 to ±4 semitones.
- **Speed change**, with pitch and tempo changed together: resampling, now up to 0.8× and 1.25× (it was ±6 %).
- **Tempo change with the pitch kept:** as before.
- **Pitch and tempo together** (new): ±1 / ±2 semitones × 0.9 / 1.1 tempo.
- **The result card** says what was found ("The clip's pitch seems to have been changed (+2 semitones)").

The two finders were run on the same 640 clips, each searched with the original present and again with it hidden. The old finder is the one before this step, kept in `tools/engine/eval/old-finder/`.

| Kind of clip | Before | **After** | Time error (median) |
|---|---|---|---|
| Pitch +1 / −1 / +2 / −2 / +3 / −4 semitones | 0 each | **14 / 15 / 16 / 13 / 15 / 13** of 16 | 0.01–0.02 s |
| Speed 0.9 / 1.1 / 1.25 | 0 each | **15 / 16 / 14** of 16 | 0.01 s |
| Combined edit 1 (pitch +2, tempo 1.1, reverb, bass) | 0 | **5** / 16 | 0.03 s |
| Combined edit 2 (speed 0.9, treble cut, compression, noise) | 0 | **13** / 16 | 0.01 s |
| Combined edit 3 (pitch −3, tempo 0.9, echo, phone band, AAC 32k) | 0 | 0 / 16 | — |
| Every other kind (clean, video, noise, reverb, tempo, intros, joined…) | as before | unchanged | unchanged |
| **All 640 clips: right recording, confirmed** | **420** | **569** (89 %) | |
| Wrong recording confirmed (original present) | 2 | 2 | |
| No answer | 203 | 54 | |
| Search time (median per clip, runner) | 4–8 s | 4–10 s | |

**Hidden original: 16 → 20 confirmations.** The 4 new ones:
- **s03 → N1 245 (India Al-Qamar, 97 → 460 s):** the old finder matched the same file at the same offset on a different version of the clip. That's a copy of the same performance, not a new error.
- **s05 → the "القصار المشهورة" compilation:** a pair already seen in the baseline, in the same region; probably a copy.
- **s05 → C 0736 and C 0870-2:** s05 is a much-copied Al-Qamar/Ar-Raḥmān recording, but these can't be proven from one clip each. They will be settled by the melody check (Step 6), which isn't affected by speed differences.

They are counted as false (the strict view).

**Correction:** the Step 3 baseline reported speed changes as 0/48, but those clips had been made wrongly. The test builder applied the speed filter before resampling, so the clips played at about 40 % speed. They were rebuilt for this step, and both finders were measured on the corrected clips (the "Before" column).

## 2. Undoing the edit before listening for the verses

When the sound match found an edit, the clip is played back at the rate that undoes it before the speech model listens (`ayahPcm` in `js/ayah.js`).
- **Speed:** both pitch and tempo are restored.
- **Pitch:** fixed at the cost of a tempo change, which the speech model tolerates.

Measured on the 72 edited clips with a ground truth that the new finder matched:

| | Right verses | Wrong | None |
|---|---|---|---|
| Not undone | 27 | 0 | 45 |
| Undone | **46** | 0 | 26 |

- **Speed 1.1:** 1/9 → 8/9.
- **Pitch −4:** 1/7 → 4/7.
- **Shifts of 1–2 semitones** gained nothing (20 vs 19), so they are left as they are. The rule now: undo speed changes, and pitch shifts of 3 semitones or more.

## 3. What a clip alone can say about its sound (`js/engine/features.js`)

**What is measured:** band, signal-to-noise, the decay after the voice stops, echo in the loudness envelope, and clipping.

Measured on the 640 clips against the edits actually applied:

| Label | Clips with that edit | Clips without it |
|---|---|---|
| "narrow band" | 46/64 detected | **223/480** wrongly labelled; **dropped** |
| "very noisy" (SNR < 8 dB) | 23/32 detected | 84/512 (16 %) wrongly labelled |
| "distorted" (clipping > 1 %) | 9/16 detected | 26/528 (5 %) wrongly labelled |
| Echo / reverb | | No measure separated echoed clips from the originals |

**Why:** many archive recordings are old radio and tape recordings that already have a narrow band, noise, room echo and compression. Without the original, an edit can't be told from the recording's own character.

**So these measures are kept as numbers for the later stages, and are not shown to users as labels.** Comparing the clip with the matched original (whose audio the app can fetch) is the reliable way to describe its edits. That belongs to verification (Steps 10–12).

## Still weak
- **Combined edits with a large pitch shift plus tempo and echo** (combined edit 3: 0/16; combined edit 1: 5/16). The landmarks don't survive that much change. This is what the melody (Step 6) is for: it isn't affected by key, tempo or EQ.
- **Search time:** a clip that matches nothing now tries about 40 versions. That's still well under the reference bot's ~3 minutes, but it should be cut by using the melody to estimate the shift first (Steps 6 and 8).
- **Four hidden-run confirmations to settle** with the melody check.
