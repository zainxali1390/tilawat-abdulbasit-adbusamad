# Find a recitation — how it works, how well it works, and its limits

## What it does
You give the app a clip of Sheikh Abdul Basit: a video from the gallery / camera roll, an audio file, a recording
made with the microphone, or a video or audio shared to the app from the gallery or another app (Share → Abdul Basit,
when the app is installed). It answers three questions:

1. **Which recording is this, and where in it?** The recording in the library the clip comes from, and the exact start and end time in that recording.
2. **What is being recited?** The surah (Arabic and English) and the ayah range, recognised from the recitation itself.
3. **Where can I hear all of it?** Play from the moment, play just that section or the whole recitation, copy a link
   that opens the recording at that moment, open the original file, read the verses in the Mushaf, or save it
   (a favourite plus a pin at the moment).

Each result shows:
- surah and ayahs
- recording title
- category (Egyptian Radio, Egyptian recording, mosque, radio outside Egypt, …)
- date
- riwayah, when the label states it
- start and end time
- confidence, and whether it is a **confirmed** or **possible** match.

## What changed in this version (review of the earlier finder)
The earlier finder used sound fingerprints only. Its limits, and what was done about each:

| Limit of the earlier finder | Now |
|---|---|
| It never knew *what* was recited: no surah or ayahs, only the recording's title | **Verse recognition** (below): surah and ayah range from the recitation itself |
| A clip from a recording not in the library got only "no match" | It says plainly that the original was not found, still names the surah and ayahs, and lists the library's recordings that contain that passage by their labels, clearly marked as **other** recordings |
| Copies of the same recording were listed in whatever order they scored | Copies are one result. The copy shown first follows Egyptian Radio → other Egyptian recordings → mosque → radio outside Egypt → radio (station not named) → other → studio sets, each copy with its own times |
| Same recording at the same place could appear twice | Results are de-duplicated across copies |
| Speed: only "faster and higher" (resampled) ±3 % / ±6 % | Also **tempo changes with the pitch kept** (what video apps do): ±3 %, ±6 %, ±10 %, ±25 % |
| Clips only from the file picker | **Choose from gallery** (videos from the gallery / camera roll), **Audio file**, and **Share → Abdul Basit** from the gallery or another app (installed app, Android) |
| One failed download of an index part stopped the whole search ("Searching needs an internet connection") | Each part is retried; a few missing parts don't stop the search; only a real outage stops it, with a **Try again** button |
| Every search downloaded the index parts again, and the same clip was searched again | Index parts are kept on the phone until the index is rebuilt, and results are remembered per clip (by its contents) |
| Results had no category, ayahs, full-file link or shareable time link | Added |
| "Read the surah" opened the first surah of the title | Opens the recognised ayah's page |
| Little progress during long steps | Progress bar for the index download, the model download and the verse recognition |

## How it works
### 1. Sound fingerprints: which recording, and where
- **Landmarks.** Every recording is turned into "landmarks": pairs of the strongest points of its spectrogram (time, pitch), the method behind Shazam (`tools/fingerprint/fpcore.py`). They survive:
  - compression and low quality
  - noise and echo
  - volume changes and trimming.

  They identify a *recording*, not a voice, so two performances of the same surah are never confused.
- **The index** covers 3,080 recordings (1,351 hours) and is split into 65,536 small files in `fp/`. GitHub Actions builds it (`.github/workflows/fingerprint-index.yml`) whenever `data/areas.js` changes.
- **On the phone** (`js/fp.js`, `js/finder.js`):
  - The clip is fingerprinted the same way (verified identical to the Python version).
  - Only the index files its landmarks fall in are downloaded.
  - The clip never leaves the phone.
- **Matching.** A recording scores by how many *different moments* of the clip agree on the same time offset, and how far apart they are spread. The offset gives the position to about 0.05 s.
- **Levels:**
  - **Confirmed** needs at least 6 agreeing moments over at least 3 s, and at least 2.5 × the best other recording.
  - **Possible** needs at least 4 moments over at least 2 s, and 1.8 ×.
  - Anything less is "no reliable match".
- **Speed changes.** If nothing is confirmed, the clip is tried again with the speed changed both ways: resampled (speed and pitch change together), and time-stretched with the pitch kept.
- **Long clips and edits.** Clips over 25 s are searched in 15 s blocks. Blocks that agree become sections, so a video edited from several recordings, or with cuts, gives one result per section with its own times.
- **Exact timestamps** (`finderRefine` in `js/finder.js`).
  - The search uses a thinned-out sample of the clip's landmarks. The offset between clip and recording comes from the median of the exact offsets of all agreeing landmarks, plus half of the index's 64 ms time step, so it is accurate to a few hundredths of a second.
  - A section with nothing found before it starts at the clip's first moment, unless the sound clearly changes before the recording is first recognised (an intro).
  - A cut between two recordings is placed at the first clear change in the sound between the last evidence of one recording and the first of the next, so it is never late.
  - Before this fix, long clips (over 25 s) were placed from the first *sampled* landmark that agreed. That landmark is always late: each moment is compared with the 1.5 s around it, which doesn't match the recording right after a clip's start or a cut. Start times were about 1 s late on average, and up to 5 s.

### 2. Verse recognition: which surah and ayahs (`js/ayah.js`)
- **Speech model.** The clip is transcribed on the phone by `models/whisper-tiny-ar-quran`, a speech model trained on Quran recitation (Apache 2.0).
  - It runs in a background worker, so the screen stays responsive.
  - About 63 MB, downloaded once and then kept by the browser.
  - It can be switched off on the screen.
- **Placing the transcript.** The transcript is placed in the Quran text (`data/quran-uthmani.txt`) by matching 4-letter groups:
  - Vowel marks, hamzas and alifs are removed on both sides, so small mistakes of the model and differences of spelling don't stop a match.
  - Letter groups found in few places of the Quran fix the alignment.
  - Repeats and going back (common in live recitation) still count.
- **Levels:**
  - **Confirmed** when most of the transcript lines up in one place and no other place comes close.
  - Repeated verses (e.g. "فبأي آلاء ربكما تكذبان") come back as **possible**, with the other places listed.
- **Working with the sound match:**
  - When the recording is found by sound, its label is checked against the verses heard ("agrees with the label", or "the label doesn't list Sūrah X").
  - If the transcript alone is unclear, it is placed within the surahs of the recording found. That is shown as such, never as independent agreement.
  - A weak (possible) sound match that contradicts clearly recognised verses is left out.
  - **Only a confirmed verse place names a surah.** An unconfirmed guess of the speech model is never shown as a surah,
    on a result or on the "not found" screen (it caused the wrong surahs reported in November 2026, see
    `docs/FINDER-ACCURACY.md`). On the "not found" screen the confirmed places of the clip must also agree with each
    other.

### 2b. The library's verse map (`vm/`, `tools/verses/analyse.mjs`)
- **Every recording in the library is analysed once** by the same Quran speech model: one 30 s stretch every 60 s,
  each placed in the Quran text by the same matcher. Stored per recording: the surah and ayahs at each point, how
  sure, and the raw transcripts (so a better matcher can re-place everything without listening again:
  `node tools/verses/analyse.mjs replace`). The workflow "Build verse map" analyses only recordings not analysed yet
  (new ones are picked up automatically when `data/areas.js` changes) and retries failed ones on request.
- **Verification.** When a recording is found by sound, the map says what that recording recites at the matched point.
  If the clip's confirmed verses contradict it, the match is shown only as **possible** (or left out if it was weak),
  with the reason. If they agree, the card says so.
- **Verses without the clip's own recognition.** If the clip's verses weren't recognised (noise, short clip, verse
  recognition switched off), the card shows the verses the map found at that point, marked as coming from the map.
- **Original not found.** The recordings the map heard reciting the recognised passage are listed first, with the
  time in each, then those whose labels name it — always as other recordings, never as the original.
- **Copies.** A file that agrees with the clip only partly is not called "the same recording"; only one that agrees
  in every block of the clip and nearly as strongly is shown as a copy (and may be shown first by category).

### 3. Categories and the copy shown first
- **Where categories come from.** Only from the library's filing, which comes from the source labels:
  - **Egyptian Radio** = filed under Egypt › Radio recitations.
  - **Egyptian recording** = other Egypt sections.
  - **Mosque** = Masjid al-Aqsa, or the place label names a mosque or Haram.
  - **Radio outside Egypt**, **Radio · station not named**, **Other**, **Studio set**.
- Nothing is labelled Egyptian Radio without that filing.

## Test results
The full index (3,080 recordings) was used, through the real screen in a browser. Clips were cut from 14 real recordings and changed the way real clips are:
- MP3
- MP4 video
- voice note
- noise, quiet, phone speaker
- echo and noise
- band-limited low bitrate
- resampled +3 %
- tempo ±5 % / +10 % (also in video)
- 4.5 s and 6 s clips
- a 70 s video edited from three recordings.

| | Result |
|---|---|
| Recording and time (sound) | 40 of 44 clips confirmed with the right recording and time (within 0.15 s), including all 3 sections of the edited video; every tempo-changed clip was found after the speed search |
| The other 4 | 2 found a *copy* of the same audio (same recording, another file); 2 gave "no match" (a simulated phone-speaker recording, and a 4.5 s clip) |
| Wrong recording confirmed | **none** |
| Start time, clips from one recording (40–90 s, with or without a 3 s intro) and short clips | within 0.04 s of the true start (before the fix: 0.3–5 s late on long clips) |
| Start time at a cut between two recordings in an edited video | 0–1.5 s early, never late |
| What is actually heard after "Play from here" (captured from the player) | within 0.02–0.16 s of the true start |
| Verses (clear recitation, e.g. Khatmat al-Arbaʿ) | right surah and ayah, confirmed |
| Verses (old live recordings with long melodic passages and crowd noise) | often "not recognised" or "possible"; when the recording is found by sound, the verses are placed within its surahs |
| Clip from a recording not in the library | "The original recording wasn't found", the right surah and ayah, and the library's recordings containing that passage by their labels (marked as other recordings) |
| Unreliable connection (30 % of index downloads made to fail) | every clip still found, correctly |
| Connection lost | stops after about 20 s with Try again; Try again then finds the match |
| Video shared to the installed app | opens Find a recitation and finds the match |

The verse matcher on its own was tested on 2,000 random Quran passages of 4–14 words with about 20 % of the words damaged:
- 1,489 (74 %) were confirmed, all at the right place.
- The rest came back possible or with no answer.
- In earlier runs, about 1 in 2,000 confirmed answers had a starting ayah 2 off: a 5-word phrase that occurs in two nearby ayahs.

## Limits
- **Recording identification** works only for recordings in the library. A clip from a recording the app doesn't have can't be placed in that recording. The app then says so, and gives the verses and other recordings of the passage.
- **Verse recognition** depends on a small speech model that runs on a phone. It is good on clear recitation and weak on old, noisy live recordings with long melodic stretches. When it is unsure it says so, or shows nothing, rather than guess.
- **Qirāʾāt / riwāyāt** are not recognised from the sound. The riwayah is shown only where the recording's label states it (the full sets: Hafs or Warsh). The verse matcher ignores hamzas, alifs and vowels, so a Warsh clip is still placed, but it is not *identified* as Warsh.
- **Short or noisy clips.**
  - Best with 10–30 s of clear recitation.
  - Clips under about 5 s, loud talking or music over the recitation, or a phone far from a speaker may not match.
  - Clips need at least 4 seconds.
- **Long files.**
  - Only the first 10 minutes of a clip are searched.
  - Very long videos may not decode in a phone browser; trim them first.
- **Video sites.** Save the video from YouTube, TikTok, Instagram etc. to the gallery first, then choose it or share it to the app.
- **Sharing to the app** needs the app installed (Add to Home screen). Android/Chrome support it; iPhone does not let web apps receive shares, so use Choose from gallery there.
- **Copies not always shown.** Copies of a recording appear only when they also match the clip strongly. Known duplicates are listed in `docs/DUPLICATES-REVIEW.md`.
- **Connection.** Searching needs an internet connection (index parts and, the first time, the speech model).

## Adding recordings (the reference database grows with the library)
Add recordings to `data/areas.js` as usual. The index workflow runs by itself, or from Actions → Build recording index → Run workflow, and takes about 10 minutes. New recordings are then found by sound, their category comes from where they are filed, and their verses from their titles.

To check new files for duplicates before adding them, use `tools/fingerprint/check_audio.py` (workflow `fingerprint-check.yml`).
