# Step 6: Melody and tune analysis

Status: **done** (25 Nov 2026). Code: `js/engine/melody.js`. Tests: `tools/engine/eval/melody_eval.mjs`, `melody_score.py`,
`melody_copies.mjs`, `melody_local.mjs`; workflows `engine-melody.yml`, `engine-melody-copies.yml`, `engine-melody-local.yml`.
Results: `tools/engine/eval/results/melody-20261125-2222-5370366`, `melody-copies-20261125-2150`, `melody-local-20261125-2236`.

## 1. What was built

The landmark index (`fp/`) matches the exact sound. It can't follow a clip whose sound was changed a lot: combined pitch,
speed and tempo edits, heavy reverb, or noise. The **melody** of a recitation, meaning the reciter's pitch line over time,
survives those changes. Two performances of the same verses rarely follow the same line in detail.

`MELODY` (browser and Node, no download, no model):

| Part | How it works |
|---|---|
| `f0(pcm16k)` | YIN pitch tracker at 50 ms frames (20 per second), after a 90–1100 Hz voice band-pass. A frame counts as voiced only when it continues a pitch line, which removes isolated noise detections. Octave jumps are repaired against the running line. |
| `pack` / `unpack` | 1 byte per frame: 0 = no voice, otherwise 1 + (MIDI note − 36) × 4, so quarter-semitone steps. 72 KB per hour of audio. |
| `shape` | The pitch line minus its 2-second moving average. This removes the key, so a pitch-shifted clip has the same shape, and keeps the tune's movement. |
| `match(q, ref)` | Fast cross-correlation (FFT) of the clip's shape against the whole recording at 19 tempi from 0.78 to 1.28. Each peak is re-scored with a robust median-shift fit, then refined at 0.5 % tempo steps and ±8 frames. Returns score (0–1), place, tempo k and pitch shift in semitones. A clip is matched both band-passed and plain, and the better result is kept. |

## 2. Tests and results

### 2.1 Local test: 1 recording, 37 single-part edits
All aligned. Mean place error 0.018 s, maximum 0.3 s. Included pitch −4, the three combined edits (for example pitch +2.96
with tempo 0.895), noise and heavy reverb. Pitch tracking takes 3.3 s per 554 s of audio.

### 2.2 Pilot: 640 test clips against 89 recordings (44 h)
The store held the 16 source recordings, 9 known copies and 64 other recordings. Most of those are other performances of
the same surahs, which are the hardest wrong answers. The store took 3.2 MB.

A clip counts as **right** when the best recording is the original (or a copy of it) and its place is within 1 s.

| Edit | Right /16 | | Edit | Right /16 |
|---|---|---|---|---|
| clean 20 s, 44 s, 7 s, 10 s | 16, 16, 16, 15 | | pitch −4, −2, −1, +1, +2, +3 | 15, 15, 15, 16, 15, 14 |
| speed 0.9, 1.1, 1.25 | 15, 16, 14 | | tempo 0.8, 0.9, 1.1, 1.25 | 14, 14, 14, 16 |
| combined edits 1, 2, 3 | 9, 15, 6 | | reverb small, large | 11, 11 |
| echo | 13 | | noise 10 dB, 3 dB | 13, 8 |
| music under the voice | 5 | | phone band | 14 |
| AAC 32 kbps, compressed, distorted | 15, 16, 16 | | bass, treble cut | 15, 16 |
| MP4, MOV | 16, 15 | | intro music / noise / silence | 15, 16, 15 |
| 2 joined parts (same / different recordings) | 14 / 9 | | 3 joined parts | 5 |

**Total: 531/640** with the first scoring. Counting the copies found in §2.4: **554/640**.

Scoring fix: the melody reports where the clip's *start* lies. At first, clips with a 3-second intro and the later parts of
joined clips were compared with where the recitation starts, so they were marked wrong. The scorer now compares like with
like (`melody_score.py`). Before the fix, intros scored 0–1/16. After it, 15–16/16.

Joined clips: the melody finds one part, the one that fills most of the clip. Matching each part separately is Step 13.

### 2.3 The copy check: whole recordings
`melody_copies.mjs`: 40 s windows of recording A, one every 60 s, are matched into recording B. The same performance puts
most windows on one straight time line (with any tape speed between 0.85 and 1.18). A different performance scatters them.

- 6 known copies (derived from searches): **6/6 the same**. Their speed ratios were 0.94–1.06, so these are tape-speed
  copies.
- 6 pairs of different performances of Al-Qamar/Ar-Rahman (controls): **6/6 not**, 0 windows on a line.
- 16 hidden-run confirmations from Step 5: 4 the same; 12 had 1–14 windows on one line. These are partial overlaps, which
  the whole-recording test can't decide.

### 2.4 The hidden-run confirmations, settled on the clip's passage
A hidden run searches each clip with its original removed. When the search still confirms another recording, either that
recording holds the same audio (a copy) or the search made a false confirmation. `melody_local.mjs` decides which. It
matches 20 s windows of the original, every 10 s, from 2 minutes before the clip to 2 minutes after it, into the other
recording. It then checks whether one time line passes through **the exact place the landmark search reported**. The two
methods are independent: one uses sound peaks, the other the tune.

- Controls (different performances): 0–1 windows on a line out of 20–24.
- Step 5's 20 hidden-run confirmations:
  - **15 agree**: 3–16 windows on one line, through the reported place to within 1 s.
  - 1 is a joined clip whose matched part was not the first. Its recording, A:784, is a copy by another clip (s08-bass).
  - **3 are probable**: E (a compilation of short surahs with the call to prayer) for s05. They have 6–7 windows on a line,
    but the line misses the reported place by 5–24 s. That fits a cut-and-joined compilation, but it isn't proven.
  - **1 is unsettled**: s05-intro_silence3 → C:0870. Landmark evidence is strong (22 points), but the melody shows only 3
    windows on a line, at another place.
- So of the 20 "false" confirmations from Step 5, **16 are copies**, 3 are probable copies, and 1 is unsettled. On 640 hidden
  runs, the landmark search's real false-confirmation count is **at most 4**, not 20.

Copy groups found (`results/melody-local-20261125-2236/copy-groups.json`). Many differ in tape speed by about 6 %:

| Group | Recordings |
|---|---|
| Yusuf 1–27 (1960s) | X2:181, C:1121, C:1171, A:784, I4 (6 % slower) |
| Al-Qamar/Ar-Rahman (Iraq) | X5:568, X5:567, A:770, A:287 |
| Al-Qamar/Ar-Rahman (Aleppo 1953) | X5:565, C:0736 |
| Al-Qamar/Ar-Rahman | A:284, C:0706, N1:245, X5:577 |
| Al-Qamar/Ar-Rahman (Cairo) | C:0729, X5:586, A:293 |
| Al-Aqsa | I1 (79), (80), (90), I6, X5:570, C:0628 |
| Az-Zumar | I53, X4:477 |
| Al-Waqi'a | B:2-2, C:0984 |
| — | A:279, I8:00035 |

These are recordings that hold the same audio as each other, found by measurement. Nothing in the library has been changed;
the groups will be used in Step 10 (exact match) and shown as "also in" results.

### 2.5 Can melody alone confirm a match? No.
The question is how far the best recording leads the best *different* performance (copies excluded). For wrong answers, the
original was hidden:

| Lead at least | Right clips kept /640 | Wrong recording on top, original hidden /640 |
|---|---|---|
| 0.10 | 452 | 25 |
| 0.15 | 400 | 14 |
| 0.20 | 336 | 10 |
| 0.30 | 164 | 6 |

The raw score separates even less. Wrong recordings scored up to 0.94; the median was 0.66. The worst cases are other
performances of the same verses by the same reciter, who often used the same tune. Two recurring cases (A:239 for Al-Aqsa
(79) clips, C:0723 for (90)) may be further partial copies with edits. They are counted as wrong here, to be conservative.

**Decision:** melody is **not** a confirmation signal on its own. In the engine it is used for three things:
1. **Ranking candidates** (Step 8). It covers the edits the landmark search can't follow. With a clear lead it found
   28 clips the landmark search missed: combined edits 11, heavy reverb, pitch, tempo, noise.
2. **Independent supporting evidence and alignment** (Steps 11–12). It agrees with the landmark place to within 1 s and
   gives the tempo and pitch shift.
3. **Copy detection**: §2.4, and the "also in" list.

A melody-only result is shown as **Possible** at most, and never as Confirmed.

## 3. Speed and size

- Pitch tracking: about 0.6 % of real time (3.3 s per 554 s of audio, in Node; browsers are similar).
- Matching: about 57 s per clip against 44 h, so about 1.3 s per hour of audio. Searching the whole archive (1,351 h) would
  take about 29 minutes in a browser, which is too slow. **So melody runs only on a shortlist.** The shortlist is the
  landmark search's candidates plus the recordings of the recognised surah (verse index, Step 4). That is typically 10–60
  recordings, so 10–60 s; Step 8 will measure and limit this.
- Store: 3.2 MB per 44 h, so **about 97 MB for the whole archive**. Each recording is loaded only when it is on a shortlist,
  so a search downloads only the recordings it checks (about 0.5–3 MB).

## 4. Problems found and fixed in this step

- **The Node output buffer was over its limit.** It was 1<<31; changed to 1<<30. The first pilot runs failed on it.
- **The scorer compared the clip's start with where the recitation starts**, which broke intros and joined parts. Fixed;
  intros went from 0–1/16 to 15–16/16.
- **The whole-recording copy check missed partial copies.** Added the check on the clip's passage (§2.4).

## 5. Limitations

- Music under the voice (5/16) and the third combined edit, at 0.8 speed with pitch +3 and reverb (6/16), remain weak.
- Joined clips: one part per search. Each part is matched in Step 13.
- The pilot keeps the top 5 recordings per clip. For three clips, all other entries in that list were copies, so no "lead"
  could be measured. Step 8 keeps more candidates.
- The probable and unsettled copies (§2.4) stay unproven. They are not used to change anything in the library.
