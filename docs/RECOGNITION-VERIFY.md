# Step 12: Verification and confidence

Status: **done** (26 Nov 2026). Code: `js/engine/verify.js` (`VERIFY.decide`, `VERIFY.describe`). Tests:
`tools/engine/eval/verify_eval.mjs` (the levels measured on the in-page run of Steps 10–11), `test_verify.mjs`. Results:
`tools/engine/eval/results/exact-20261126-2029-08dd57f/verify-score.txt`.

## 1. The four answers

| Level | When (measured thresholds) | Meaning for the user |
|---|---|---|
| **Confirmed** | The two independent alignments (landmarks and melody) agree on one line with **≥ 6 landmark points**, or the sound search confirms it with today's rules, and the verses heard do not contradict the recording. | This is the recording, at this time. |
| **High confidence** | The alignments agree with 4–5 points, or with 3 points when the verses heard also match the recording there. No contradiction. | Almost certainly this recording. |
| **Possible** | The sound search's own "possible", or a strong melody match (≥ 80 %) with landmark support (≥ 3 points). A strong match that the verses contradict is also lowered to here. | It may be this recording; check by listening. |
| **No reliable match** | Anything less. With the voice note (Step 7) when the voice does not resemble Abdul Basit's recordings. | Not found in the archive. |

- **Copies:** other recordings on the shortlist whose alignments agree on the same line with ≥ 6 points are the same audio.
  They are listed as "also in", never as rivals.
- **Rivals:** if a *different* recording also fully matches, the answer is lowered to High.
- **The time:** the engine's timestamp (Step 11) when its alignments agree. Otherwise the sound search's own refined place
  for that recording.
- **Reasons:** every answer carries its reasons as codes with values (`agree`, `points`, `melody`, `finderConfirmed`,
  `verseAgree`, `verseContradict`, `rival`, `noEvidence`, `voiceUnlike`). `VERIFY.describe` gives the English, and the app
  translates by the same codes (Step 14).

## 2. Measured: 640 clips with the original present, 640 runs with it hidden

A wrong answer in a hidden run means a recording that is not the original or a copy of any part of the clip. Copies are
the Step 6 and Step 10 groups, and the pairs the passage check proved. Both ways of counting copies (chained groups, or
directly proven pairs only) give the same Confirmed and High figures.

| Level | Right | Wrong, original present | Wrong, original hidden | Precision | Start within 0.5 s* |
|---|---|---|---|---|---|
| **Confirmed** | **605** | **0** | **0** | **100 %** | 572 / 578 |
| **High confidence** | 11 | 0 | 0 | 100 % | 9 / 9 |
| Possible | 5 | 0 | 2–3 | 62–71 % | 5 / 5 |
| No reliable match | 19 clips | | | | |

\* For answers that name the clip's own recording. When the answer is a copy, its true times are not known.

- **616 of 640 clips are found at High or better, 605 of them Confirmed.** Today's finder confirms 569, and says
  "possible" for 17, with 3 false in the hidden runs.
- **Thresholds** were checked on a grid (`verify-score.txt`):
  - Confirmed at 5, 6, 7 or 8 points: always 0 false (605, 605, 600, 595 right). 6 is kept for margin, because with the
    alignments alone, 5 points gave 1–2 false agreements in Step 10.
  - High at 4 points: 0 false. At 3 points: 24 false.

## 3. How the rules were found (each step measured)

1. **Copies were first counted only as pairs proven directly.** That showed 20 hidden-run Confirmed answers as wrong, all
   with 6–21 landmark points on one line. Looked up one by one:
   - 145 are copies known since Step 6;
   - 19 have a melody line through the exact place;
   - the last 2 are copies of the *other* part of a joined clip.

   **None is an unrelated recording.** Counting copies of any part of the clip fixed the count.
2. **High through "the verses agree" allowed 2 landmark points.** One false answer came from it, so it now needs 3 points.
3. **Possible through "the alignments agree on 3 points" gave 1 right and 26 wrong** in the hidden runs. It was removed, and
   Possible went from 15 % to 71 % precision, keeping the finder's own "possible" (3 right, 0 wrong) and the strong-melody
   route.
4. **Confirmed answers without an agreeing engine time** (confirmed by the sound search alone) now take the search's own
   refined place. Start within 0.5 s rose from 575/605 to 572/578 of answers naming the clip's own recording.

## 4. Functional tests (`test_verify.mjs`, 12/12 pass)

Each level and route, the verse veto, the finder's confirmed result winning with its time, a copy listed as "also in",
the voice note added only when the voice is unlike, and the reason texts.

## 5. Limitations

- The hidden runs use the same 16 recordings as the test clips. The Confirmed bar has a margin (5 points were also clean
  here), but very different recordings could behave differently. Step 15 adds fresh clips.
- Possible is right about two thirds of the time. It is meant as "listen and check", and is labelled so.
- 19 clips get no answer. Most are combined edit 3, which loses half its clips before the shortlist.
