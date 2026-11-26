# Step 8: Combined candidate narrowing

Status: **done** (26 Nov 2026). Code: `js/engine/candidates.js`, melody hashes in `js/engine/melody.js`
(`turns`, `hashes`, `hashIndex`, `hashVote`), verse index builder `tools/engine/build_vi.mjs` → `vi/`. Tests:
`tools/engine/eval/cand_eval.mjs`, `melody_hash_eval.mjs`, `test_candidates.mjs`; capture of every landmark search's vote
candidates in `run_finder.js`; workflow `engine-cand.yml`. Results: `tools/engine/eval/results/cand-20261126-0758-94974e5`.

## 1. The job

When the landmark search confirms nothing, the slower checks (melody alignment, verses, Steps 10–12) cannot run against
all 3,081 recordings. Melody alignment alone takes about 29 minutes for the whole archive (Step 6). Narrowing gives them a
short list of at most 30 recordings, each with the time where the clip probably starts. It must contain the right
recording as often as possible. It is allowed to contain many wrong ones, because the next steps reject them.

## 2. The three sources

| Source | What it lists | Cost |
|---|---|---|
| **Landmarks** (`CAND.landmarks`) | The vote candidates of every landmark search the finder already ran: as is, pitch-corrected, speed and tempo retries. Best vote per recording, with the recording time of the clip's start. Before this step, everything below the confirm/possible bars was thrown away. | None: already computed |
| **Verses** (`CAND.verses`) | Recordings where the recognised ayat were heard: the ayah exactly, or up to 2 away, sure windows first. From `vi/`, the verse map turned around, one file per surah. | One file of at most 71 KB (1.1 MB in all) |
| **Melody hashes** (`MELODY.hashVote`) | Recordings whose tune has the same turning points (below). Gives recording, time and tempo. | About 3 ms per clip once the index parts are loaded. Index about 43 MB for the archive (Step 9), fetched by hash like `fp/` |

**Fusion** (`CAND.fuse`): reciprocal-rank fusion, Σ w/(60 + rank). A recording that two sources place within 120 s of
each other gets an extra 1/60. The 30 best are kept, and the landmark time is preferred.

### Melody hashes
The landmark index cannot follow a clip whose sound was changed a lot. The melody survives, but aligning the melody
against every recording is too slow. Hashes make it an index lookup:
- **Turning points:** peaks and dips of the lightly smoothed pitch line that move at least 0.6 semitone (a zig-zag).
- **One hash per run of four turning points:**
  - three pitch steps in whole semitones (the key cancels out);
  - two ratios of the gaps between them, in half log2 steps (the tempo cancels out).
- **Skip combinations:** the same is done leaving out one of the next turning points, so one missed or extra turning point
  doesn't break every hash around it.
- **Query expansion:** a step close to a bin edge is also looked up in the neighbouring bin. This applies to the query
  only, so the index doesn't grow.
- **Vote:** every hit suggests a (tempo, offset) pair for its recording, over the 19-tempo grid (0.78–1.28). The cell with
  the most distinct clip moments wins.

Locally (1 recording plus 4 others, 40 edited clips): 26/40 clips got the right recording and place with plain
consecutive hashes, and **35/40** with skip combinations and expansion.

## 3. Results: 640 clips, original present and hidden

**Clips the landmark search did not confirm (68):** these are the ones narrowing is for.

| Source | Right recording first | In top 5 | In top 30 |
|---|---|---|---|
| Landmark candidates | 50 | 50 | 51 |
| Verses | 1 | 7 | 23 |
| Melody hashes (89-recording pilot) | 28 | 32 | 52 |
| **Fused, landmarks + verses** | 48 | 51 | **57** |
| **Fused, + melody hashes** | 48 | 57 | **60** |
| Fused, landmarks weighted ×2 | 48 | 53 | 54 |
| Fused, top 10 only | 48 | 57 | 59 |

- **For 50 of the 68, the landmark search's own first candidate was already right.** Its votes were simply under the
  confirm bar. Step 10's second, independent alignment (melody) is what can confirm them.
- **Verses and melody add the rest:** 51 → 60 of 68. The melody figure is lower than it will be in practice, because its
  pilot index holds only 89 recordings.
- **Weighting the landmarks ×2 is worse** (54): their long tail of weak votes pushes good verse and melody candidates out.
  So the weights stay equal.
- **The agreement bonus** doesn't change what reaches the list (60 either way). It moves agreeing recordings up, which
  matters only for the order in which Step 10 checks them, so it is kept.
- **Still missing (8 of 68):** 8 of the 16 combined-edit-3 clips (pitch +3, speed 0.8, reverb). That edit destroys
  landmarks and blurs the turning points.

**All 640 clips:** the right recording is in the fused list for **632** (629 without melody hashes).

**Melody hashes alone** (all 640 clips, pilot store):

| | Count |
|---|---|
| Right recording first | 421 |
| In top 5 | 468 |
| In top 30 | 557 |
| First entry right and placed within 2 s | 433 |

- **Strong** (14–16/16): clean, formats, video, intros, joins, tempo 1.1, treble cut.
- **Weak:** strong noise 8/16 in top 30; reverb 11–13/16; 7-second clips 11/16.
- For comparison, the full melody alignment from Step 6 got 554/640 first, but at about 57 s per clip against 44 h.
- Vote time: median 3 ms, maximum 35 ms per clip.

**Hidden runs (640):** the fused list is never empty. With the original hidden, every entry is a wrong recording, and
Steps 10–12 must reject them all. That is by design: narrowing only finds candidates, it never decides.

**The finder itself** is unchanged: 569 right and confirmed, the same as Step 5. Recording the candidates altered nothing.

## 4. Functional tests (`test_candidates.mjs`, all pass)

- **Landmarks:** best vote per recording across searches; both input forms (runner record, `finderSearch` result).
- **Verses:** on the real `vi/` index, Ar-Rahman 55:13 lists 55 recordings, ordered by distance and certainty, never more
  than 2 ayat away. An unknown surah gives nothing.
- **Fusion:**
  - two agreeing sources come first, with the landmark time;
  - one entry per recording;
  - at most K entries;
  - no bonus when the sources are far apart in time.
- **Hashes:**
  - +3 semitones keeps them all;
  - 1.2× slower keeps most (19/22);
  - a different tune shares few.
- **Vote:** a clip cut from a recording and slowed 1.1× is found in the right recording at the right place, with tempo
  0.895 against the true 0.909: within the grid step, and refined in Step 10. No voice gives no candidates.

## 5. Decision

- Shortlist: **at most 30 recordings**, equal weights, agreement bonus on.
- Sources: landmark candidates (always), verses (when a verse is recognised), melody hashes (index built in Step 9).
- Narrowing runs only when the first landmark search has not confirmed a match.

## 6. Problems found and fixed

- **Weak landmark votes were discarded.** The finder kept only confirmed or possible results, so the right recording,
  often first among the weak votes, was lost. The runner now records them, and `CAND.landmarks` uses them.
- **The first melody hashes were too brittle:** one missed turning point broke four hashes, and a step near a bin edge
  broke one. Skip combinations and query expansion took the local test from 26/40 to 35/40.
- **A wrong unit test:** periodic synthetic melodies repeat, so the vote rightly found the tune at several places. The test
  now uses non-repeating melodies.

## 7. Limitations

- The melody numbers come from an 89-recording index. Against the whole archive there will be more competitors, which
  Step 9 measures.
- The verse source depends on the verse map, which samples each recording every 60 s. A denser map is planned in Step 9.
- The heaviest combined edit (pitch, speed and reverb together) still loses half its clips before the shortlist.
