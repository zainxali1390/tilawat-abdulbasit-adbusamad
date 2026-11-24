# Find a recitation — measured accuracy (24 November 2026)

Measured with `tools/finder-eval/` in a browser running the real app against the full recording index (3,081
recordings, 1,351 hours).

**The test clips:**
- 150 clips cut from 15 known Abdul Basit recordings at random points, so most start part-way through an ayah.
- Changed the way real clips are:
  - MP3, 10 s, noise, phone quality, video, echo, 7 s;
  - tempo +5 %, 1.25× and 0.8× speed;
  - music under the recitation, a 3 s intro.

**How each clip is searched:**
1. **In the library.** The right recording, or a copy of it, should be found. A copy is the same audio in another file, found by sound at several speeds.
2. **Hidden.** The recording and all its copies are left out of the search. This is what a clip from a recording the app doesn't have looks like, so anything named then is a false identification.

| | Before the update (fingerprint only, `1e9b8af`) | Update that you reported (`5a593dc`) | Now |
|---|---|---|---|
| Right recording, confirmed (of 150) | 105 | 134 | **134** |
| Right recording, only "possible" | 10 | 5 | 5 |
| No answer | 35 | 11 | 11 |
| **Wrong recording confirmed** (of 150) | 0 | 0 | **0** |
| **Hidden recording: anything confirmed** (of 150) | 0 | 0 | **0** |
| **A wrong surah named** (on a result or on the "not found" screen) | — (no verse recognition) | **9** (7 from unconfirmed guesses) | **1** (fixed since, see below) |

## What caused the wrong surahs (the regression)
**1. Mixed index builds on the phone (the main cause of a wrong recording being shown).**

The previous update (`5b7054d`) made the app keep the index parts it downloads on the phone. That saved copy was named after the index's build **date**.

On 24 November the index was rebuilt twice in one day: first with 300 added recordings, then for the Al-Qamar replacement. Removing and adding entries shifts the numbers of other recordings.

A phone that had searched earlier that day kept the earlier parts and read them with the new list of recordings. So a correct sound match was shown under a **neighbouring recording's title**.

Example, reported with a TikTok clip of Al-Anfāl / Al-Infiṭār from Kuwait:
- The search was right: "Al-Anfāl (1–21) · Al-Infiṭār, Kuwait", 15:10, 64 moments against 3.
- The phone showed "Al-Mā'idah (67–79), Shuwaikh Mosque 1964", the entry next to it.

This was reproduced exactly by filling a browser with the earlier build's parts.

**Fixed:**
- The saved copy and every part's address are now tied to the exact build (its list of recordings), not the date, so parts of two builds can never be mixed.
- Results remembered from before the fix are not reused.

The test harness opens a fresh browser for every run, so it could not see this. The "Mixed builds" test (`tools/finder-eval/mixed_builds.js`) now covers it.

**2. Verse guesses shown as surahs.**
The sound matching did not get worse. In every version, no clip was ever confirmed as a wrong recording, and no hidden recording was replaced by another.

The wrong surahs came from the **verse recognition** added in `5b7054d`:
- When the speech model's guess was only "possible", it was still shown with a big surah name.
- This happened above all on the "not found" screen, which appears for clips from recordings the app doesn't have.
- On social-media-style clips, 7 of the 12 surahs that screen named were wrong:
  - An-Nisāʾ for At-Tawbah;
  - Al-Māʾidah for Al-Wāqiʿah;
  - Hūd for Al-Furqān;
  - and others.
- The speech model also sometimes "hallucinates" on sound it can't make out ("ما ما ما …"), and that text lined up with Hūd 11:48 as "confirmed".

**Fixed:**
- **Unconfirmed guesses:** a surah is now named only from a *confirmed* verse place, and the recognised parts of the clip must agree with each other.
- **Hallucinations:** looping transcripts are removed before matching.
- **Copies:** a file is called "the same recording" only when it agrees with the clip all along, and nearly as strongly; partial agreement can be another performance.
- **Speed retries:** these count only confirmed results.

## Right recording found, by kind of clip (confirmed)
| Clip | Before the update | Now |
|---|---|---|
| MP3 15 s | 13/15 | 13/15 |
| 10 s from the middle of an ayah | 14/15 | 15/15 |
| Pink noise | 13/15 | 13/15 |
| Phone quality (band-limited, echo, 32 kbps AAC) | 14/15 | 14/15 |
| Video (AAC in MP4) | 15/15 | 15/15 |
| Tempo +5 % (pitch kept) | 1/15 | 13/15 |
| 7 s | 12/15 | 12/15 |
| Heavy echo | 10/15 | 10/15 |
| 1.25× speed (video) | 0/7 | 7/7 |
| 0.8× speed (video) | 0/8 | 8/8 |
| Music under the recitation (video) | 7/8 | 8/8 |
| 3 s intro, then the recitation (video) | 6/7 | 6/7 |

Start times on clips from one recording are within 0.04 s of the true start (see `docs/FIND-A-RECITATION.md`).
The "time off" cases in the test are:
- **Clips with a 3 s intro of quiet noise:** the start is placed at the beginning of the clip, 3 s early (never late).
- **One 1.25× clip:** placed 9 s off inside the right recording, at a repeated phrase.

## Every wrong or doubtful answer seen (kept to improve the system)
| Clip | What happened | Status |
|---|---|---|
| TikTok clip, Al-Anfāl / Al-Infiṭār, Kuwait (reported) | Right recording found, but shown as "Al-Mā'idah (67–79), Shuwaikh 1964" on a phone holding index parts of an earlier same-day build | **Fixed** (index parts tied to the exact build) |
| Al-Furqān clip at +5 % tempo (A 249) | Speech model looped "ما ما ما…" → "Hūd 11:48, confirmed" on the "not found" screen | **Fixed** (loops removed) |
| 7 social-media clips, recording hidden | "Not found" screen named a surah from an unconfirmed guess (An-Nisāʾ, Al-Māʾidah, At-Tawbah, Al-Baqarah, Aṭ-Ṭūr, Al-Anʿām, Hūd) | **Fixed** (only confirmed places name a surah) |
| Al-Qamar/Ar-Raḥmān phone-quality clip (A 770) | Earlier test: confirmed as X5 568, which the sound check shows is *not* the same audio (another performance of the same verses) | Not reproduced in this test set; copies must now agree all along |
| "Short surahs" at 1.25× (A 393) | Verses shown: Al-Baqarah 285 | Correct: the transcript is "آمن الرسول بما أنزل إليه من ربه"; the recording's title doesn't list its surahs |
| Verse matcher alone, 2,000 damaged passages | About 1 in 1,000 confirmed answers has the right surah but a start ayah 2–4 off | Phrases the Quran repeats a few ayahs apart (e.g. "ويل يومئذ للمكذبين") |

## The library's verse map
Every recording in the library has been analysed: **3,081 recordings, none failed**. One 30 s stretch every 60 s, 82,442 stretches in all, was placed in the Quran text. The results are stored in `vm/`, with the raw transcripts kept so better matching never needs to listen again.

| | |
|---|---|
| Stretches confidently placed | 30,350 (37 %) |
| Stretches placed as "possible" | 17,522 (21 %) |
| Stretches not recognised (mostly old, noisy live recordings) | 34,570 (42 %) |
| Recordings with at least one confirmed place | 2,406 of 3,081 (78 %) |
| Recordings whose title names surahs, checked (2 or more confirmed stretches) | 1,857 |
| … agreeing with their title | **1,839 (99 %)** |
| … disagreeing entirely (listed for review in `docs/TITLE-CHECK.md`) | 18 |

**How the finder uses the map:**
- It checks each sound match against what that recording recites at the matched point, and demotes the match if the verses contradict it.
- It shows the verses there when the clip's own speech recognition fails.
- When the original isn't in the library, it lists recordings that contain the recognised passage, with the time in each.

New recordings are analysed automatically when they are added.
