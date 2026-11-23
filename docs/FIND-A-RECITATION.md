# Find a recitation — how it works, how well it works, and its limits

## What it does
You give the app a clip of Sheikh Abdul Basit (an audio or video file, or a recording made with the microphone).
It tells you which recording in the app's library the clip comes from, where in that recording (start and end
time), how sure it is, and lets you play from that moment, play just that section, play the whole recitation,
open the surah in the Mushaf or save it (favourite + pin at the moment).

## How it works
1. **Fingerprints, not transcription.** Every recording is turned into "landmarks": pairs of the strongest points
   of its spectrogram (time, pitch), as in Shazam-style recognition (`tools/fingerprint/fpcore.py`). Landmarks
   survive compression, low quality, background noise, volume changes and trimming. They identify a *recording*,
   not a voice.
2. **The index** of all recordings (2,517 recordings, 1,078 hours, ~49 million landmarks, ~200 MB) is built by
   GitHub Actions (`.github/workflows/fingerprint-index.yml`): each recording is downloaded, fingerprinted and
   deleted; only the fingerprints are committed to `fp/`, split into 65,536 small files.
3. **On the phone** (`js/fp.js`, `js/finder.js`) the clip is decoded, its landmarks are made with exactly the same
   method (verified identical to the Python version), and only the index files those landmarks fall in are
   downloaded (about 0.5–3.5 MB for a 15–20 s clip). The clip itself never leaves the phone.
4. **Matching.** Landmarks that agree on the same recording at the same time offset vote for it. A recording scores
   by how many *different moments* of the clip agree, and over how many seconds they are spread: a real match agrees
   all along the clip, chance agreement comes from one or two moments. The offset gives the position (to ~0.05 s).
5. **Verification.** "Confirmed" needs ≥ 6 agreeing moments over ≥ 3 seconds and at least 2.5 × the best other
   recording; "possible" needs ≥ 4 moments over ≥ 2 seconds and 1.8 ×; anything less is "no reliable match".
   If nothing is confirmed, the clip is tried again at ±3 % and ±6 % speed (social-media speed changes).
6. **Long clips** (over 25 s) are searched in 15 s blocks; blocks that agree become sections, so a video with
   several parts gives several results with their own times.
7. **Copies.** The library contains some recordings more than once (different collections, different edits).
   A second copy that agrees all along the clip is listed as "also found in another copy", not as a rival.

## Test results (real Abdul Basit recordings, full index of 2,517 recordings)
Clips cut from 14 real recordings and degraded the way real clips are:
| Clip | Result |
|---|---|
| MP3 15 s, video (AAC in MP4) 15 s, WhatsApp-style voice note 20 s, pink noise 20 s, very quiet 15 s | all confirmed, correct recording and time (±0.1 s) |
| Simulated phone recording of a speaker (band-limited, room echo, hiss, low bitrate) 20 s | 2 of 3 confirmed, 1 "no match" |
| Sped up 3 % (pitch and tempo) | confirmed after the speed search |
| 6 s clips | mostly confirmed, sometimes only "possible" or none |
| 70 s video with three different recordings | all three sections found with times |
| Clips from recordings not in the library (Khatmat al-Arbaʿ, quarter 2) | correctly "no reliable match" |
No wrong recording was confirmed: every "wrong" result checked turned out to be another copy of the same
recording in the library (for example X6 709 and X6 711 are the same Al-Infiṭār with pauses cut; the built-in
Khatmat al-Arbaʿ quarter 1 is the same as C 0632).

## Limits
- It finds **recordings that are in the library**. A clip from a recording the app doesn't have gets "no reliable
  match" — it cannot be placed in a recording that isn't there. It does not recognise "his voice" in general and
  does not read the verses (no speech recognition).
- Best with **10–30 s of clear recitation**. Very short clips, loud talking or music over the recitation, or a
  phone held far from a speaker in a noisy room may not match.
- Speed changes up to about ±6 % are handled; changing tempo without pitch (or pitch without tempo) is not.
- One recording (`e:C:0959`) could not be downloaded when the index was built, so it can't be found.
- "Read the surah" opens the first surah of the recording, not the exact verse (the fingerprint knows the time, not
  the verse).
- Searching needs an internet connection (to fetch the index parts).

## Adding recordings
Add them to `data/areas.js` as usual, then run the workflow (Actions → Build recording index → Run workflow).
A full rebuild takes about 10 minutes.
