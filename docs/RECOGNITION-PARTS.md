# Step 13: Multiple-section matching

Status: **done** (27 Nov 2026). Code: `MATCH.lines` and `MATCH.parts` in `js/engine/match.js`; `MATCH.agree` made
stricter. The parts pipeline is in the in-page test (`tools/engine/eval/run_exact.js`), scored by `parts_score.py`; tests
in `test_match.mjs`. Results: `tools/engine/eval/results/exact-20261127-0129-fe28b77` (`parts-score.txt`, final), earlier
runs `exact-20261127-0029-919fcc6`, `-0049-604edae`, `-0110-795410b` kept for comparison.

## 1. What it does

A clip may be joined from several places of one recording, or from different recordings. Each part is placed on its
own, with its own recording, time and confidence. An ordinary clip comes out as exactly one part.

1. **Several lines per recording** (`MATCH.lines`). For every shortlisted recording, all landmark hits from every
   search are taken in clip time. The best line is found (RANSAC, Step 10), its inliers are removed, and the search runs
   again, up to 3 lines.
   - A further line needs at least 4 inliers, and must mostly cover clip time no earlier line covers.
   - A line on the **same timeline** as an earlier one (tempo within 3 %, place within 0.5 s) is merged into it. A
     pitch-shifted clip scatters its hits, and one line could otherwise come back in fragments.
2. **Each line checked on its own stretch:**
   - the melody of that stretch aligned near the line's place;
   - agreement;
   - the verse check;
   - the timestamp, with the line's inlier range and the edge checks of Step 11.
3. **The parts** (`MATCH.parts`): lines of at least 2 s, strongest first (agreement, then inliers, then melody). A line is
   skipped if it overlaps a part already taken by more than a third. Parts come back in clip order.
4. **A level for each part.** `VERIFY.decide` (Step 12) runs on the lines covering that part.
   - A finder result lends its verdict only when it covers mostly the same stretch, both ways (not when the part is a
     fragment of it).
   - The part's time comes from its own line when the answer is its own recording.

## 2. Results: 640 clips (704 true segments), original present and hidden

A segment counts as **found** when a part at High or Confirmed names its recording (or a copy), covers at least half of
it, and, for the recording itself, starts within 0.5 s of the true place.

| | Engine | Today's finder |
|---|---|---|
| Segments found, all 640 clips | **637 / 704** | 511 |
| Clips with every part found | **578** | 475 |
| **Joined clips (48 clips, 112 segments):** segments found | **94** | 38 |
| Joined clips with every part found | **35** | 2 |
| False parts, original present (High or better, matching no segment) | **11** | 82 |
| Parts naming a wrong recording, original hidden | **1** | 0 (confirmed) |
| Time for the parts stage | median 0.6 s, 90th 0.9 s | — |

**By edit** (segments found by the engine):

| Edit | Found |
|---|---|
| 2 parts of one recording | 30/32 |
| 2 parts of different recordings | 28/32 |
| 3 parts of one recording | 36/48: the 8 s middle part is often missed |
| Intros | 48/48 (finder: 2, because its clip span includes the intro) |
| Pitch and speed edits | 12–16/16 |
| Combined edit 3 | 1/16 |

**The single answer (Step 12) is unchanged:** Confirmed 605 right, 0 wrong, 0 false in the hidden runs; High 9; Possible
6 right, 2 wrong.

**The 11 false parts** (`parts-false-previous-run.txt` lists those of run 3):
- 4 name another recording with strong evidence: three times the same recording, X2:210, with 17–24 points, and once
  C:0721 with 8 points agreeing at melody 0.86. These are most likely undiscovered copies; the passage check has not been
  run on them.
- The others are the right recording placed less than half over the segment, or a start 0.5–5 s off. These are mostly
  the short middle parts of three-part joins and combined edits.

The one hidden-run part (s13-tempo1.1 → X2:291, 8 points agreeing at 0.85) is also a likely copy, not yet checked.

## 3. Problems found and fixed (each measured on the 640 clips)

| Run | Change | Joined segments found | False parts present | Wrong parts hidden |
|---|---|---|---|---|
| 1 | Parts as described, agreement as in Step 10 | 94 | 24 | **35** |
| 2 | **Agreement needs melody ≥ 0.7** unless the landmark line has ≥ 10 points | 94 | 20 | **1** |
| 3 | **Lines on the same timeline merged**; a finder verdict lent only to a part covering the same stretch | 94 | 13 | 1 |
| 4 | **Each part's time from its own line** | 94 | **11** | 1 |

- **Run 1 → 2.** The wrong parts "agreed" with melody scores of 0.3–0.6. A melody aligned in a small window around the
  landmark place nearly always finds something. The right parts had a median melody score of 0.9. The threshold was
  measured on the parts first (wrong in hidden runs 35 → 1, right parts 655 → 653), then checked on the single answer:
  Confirmed unchanged (605, 0 false), 2 High answers became Possible.
- **Run 2 → 3.** On pitch-shifted clips (pitch −4, −2) one recording's line broke into fragments. Each fragment borrowed
  the finder's Confirmed for the whole clip.
- **Run 3 → 4.** Parts of three-part joins took their time from the finder's result for the same recording, which
  belonged to another part (start 35 s, 53 s, even 792 s off).

## 4. Functional tests (`test_match.mjs`, 26/26 pass; 4 new for Step 13, 2 for the stricter agreement)

- A clip joined from two places of one recording gives two lines at the right offsets.
- An ordinary clip gives one line.
- A scattered (pitch-shifted) line is merged back into one.
- Parts: the strongest non-overlapping lines in clip order; an overlapping weaker line and a 1 s stretch are left out.
- Agreement: a weak melody (0.5) with few points is not agreement; with a strong landmark line (12 points) it is.

## 5. Limitations

- Three-part joins: the short middle part is missed in a quarter of them, when it has fewer than 4 landmark inliers.
- Combined edit 3 remains the weakest edit throughout.
- The test set has at most 3 parts in about 25 s. Long videos with many sections are covered by the same code, which is
  not limited to 3 parts across recordings, but were not in this test set; Step 15 adds them.
