# Recording library — name and accuracy audit (24 November 2026)

A backup of the database before this audit is in `data/backups/areas.before-name-audit-2026-11-24.js` (and in git history). No existing recording was deleted, and no recording ID, audio file or link was changed.

## Summary

| | |
|---|---|
| Recordings checked (every entry, names and details) | **2,176** live/radio recordings, plus 342 full-set surahs in the sound check |
| Names corrected (wrong or missing surahs, impossible verse ranges) | **25** |
| Arabic titles standardised (canonical surah names, one format) | **1048** (every Arabic title now follows one format) |
| Details corrected (place spelling unified, details shared between copies of the same audio) | **44** |
| Duplicate entries identified in the existing library (same audio) | **388 groups, 818 entries** — flagged, not deleted |
| Recordings found online that are not in the library (by sound) | **1643** of 5179 candidate files (3157 were copies of recordings already in the library) |
| New recordings added | **263** |
| Need verification (see below) | listed in this report and in `docs/DUPLICATES-REVIEW.md` |

## Sources used

- **The original files and their labels** on the Internet Archive (archive.org): file names, ID3 titles and collection titles of the 15 collections the app already used and of 56 more Abdul Basit collections (for example the "Abdul Basit heritage library — original copies" series by year and country, "118 recitations from Al-Aqsa", "Live recitations", "Mosque recordings — Al-Kandari", "Various rare radio recitations").
- **The audio itself**: every recording was fingerprinted and compared by sound with every other recording (the same method as Find a recitation). This tells the same recording apart from a different performance of the same surah, even when titles differ.
- **The Quran text data** already in the app (surah names in Arabic and English, verse counts) to check names and verse ranges.
- Not used: guesses, other websites' unsourced claims, or assumptions from a recording's collection when its own label said otherwise.

## Second pass (after "Ghāfir is missing from Egyptian radio")

The first pass only searched archive.org collections the app did **not** use. The collections the app already used
still held **1,732 files that had never been imported** — for example "اذاعة مصر الستينات النصف ساعة – غافر 1-20"
(Ghāfir 1–20, Egyptian radio, 1960s), which is now under Egypt → Radio recitations 1960s.

All of them were checked by sound against the library:

| Result | Files |
|---|---|
| Copies of recordings already in the library | 1,031 |
| Not in the library | 415 |
| Unclear (not added) | 100 |
| Known duplicates removed earlier (skipped) | 183 |

- **Added: 300 recordings** (238 after the first sound check, 62 more after look-alikes were settled by an 8-point sound check).
  Every addition was checked by sound again after it was indexed; copies found then were removed again.
- **Not added**: files that name no surah, processed/echo copies, repeats of the same new recording, and anything
  the sound check could not settle (flagged).
- **Existing entries corrected from labelled copies of the same audio: 13** — country, mosque, year or radio
  station filled in or made exact, and entries moved out of "Place unknown" when a copy of the same audio names the
  place. Where copies disagree with each other or with the entry, nothing was changed (4 cases, flagged).

**Library now: 2739 live and radio recordings** (351 radio; Egyptian radio 119, up from 68).

## 1. Names corrected (25)

| Was | Now | Why (source label) |
|---|---|---|
| An-Naṣr · Al-Masad · Al-Kawthar · Al-Ikhlāṣ · Al-Falaq | An-Naṣr · Al-Masad · Al-Kawthar · Al-Ikhlāṣ · Al-Falaq · An-Nās | source "الاخلاص والمعوذتين": the two last surahs |
| Al-Ḥujurāt · part 5 | Al-Ḥujurāt · Qāf · part 5 | source "الحجرات وق 5": Qāf was missing |
| Al-Wāqiʿah (short clip) | Al-Wāqiʿah · short clip | standard form |
| Ibrāhīm (23–end) · Al-Qadr | Ibrāhīm (23–52) · Al-Qadr | source "ابراهيم 23-آخرها": to its end, verse 52 |
| 4-30 | Muḥammad (4–30) (incomplete) | source "محمد 4-30 مبتورة اولها": surah name was missing |
| Aṣ-Ṣāffāt | Aṣ-Ṣāffāt · Ṣād | source "الصافات ص": Ṣād was missing |
| 1 | Recitation 1 · surahs not named | source "تلاوة 1 - المسجد الأقصى" names no surah |
| Al-Māʾidah (55–181) | Al-Māʾidah (from 55) | source says "55 - 181" but Al-Māʾidah has 120 verses: end not known |
| Al-Anʿām 122 – Al-Aʿrāf | Al-Anʿām (from 122) · Al-Aʿrāf | source "الانعام 122 - الاعراف": standard form |
| Al-Ḥajj (75–88) | Al-Ḥajj (from 75) | source says "75-88" but Al-Ḥajj has 78 verses: end not known |
| Ash-Shūrā | Ash-Shūrā · Qāf · short surahs | source "الشورى ق القصار" |
| Ash-Shūrā | Ash-Shūrā · Qāf | source "الشورى ق" |
| Ash-Shūrā · Aṭ-Ṭāriq | Ash-Shūrā · Qāf · Aṭ-Ṭāriq | source "الشورى ق الطارق" |
| Al-Ḥujurāt | Al-Ḥujurāt · Qāf | source "الحجرات ق 1986" |
| Al-Ḥujurāt | Al-Ḥujurāt · Qāf | source "الحجرات ق" |
| Al-Ḥujurāt | Al-Ḥujurāt · Qāf · part 2 | source "الحجرات و ق (2)" |
| Al-Ḥujurāt | Al-Ḥujurāt · Qāf · part 2 | source "الحجرات وق (2)" |
| Al-Ḥujurāt | Al-Ḥujurāt · Qāf · part 3 | source "الحجرات وق (3)" |
| Al-Ḥujurāt | Al-Ḥujurāt · Qāf | source "الحجرات وق" |
| Al-Ḥujurāt · part 2 | Al-Ḥujurāt · Qāf · part 2 | source "الحجرات وق 2" |
| Al-Ḥujurāt · part 3 | Al-Ḥujurāt · Qāf · part 3 | source "الحجرات وق 3" |
| Al-Ḥujurāt · part 4 | Al-Ḥujurāt · Qāf · part 4 | source "الحجرات وق 4" |
| Adh-Dhāriyāt | Adh-Dhāriyāt · Qāf | source "الذاريات - ق" |
| 4-30 | Muḥammad (4–30) | source "محمد 4--30": surah name was missing |
| Al-Baqarah · part 182 | Al-Baqarah (182) | source "البقرة الاية 182 فقط": verse 182 only |

## 2. Standard naming

Every recording now has: an **Arabic title** with the canonical Arabic surah names (e.g. "الأنعام", not "الانعام"), an **English title** in one transliteration ("Al-Anʿām"), verse ranges written the same way in both ("(33–40)", "(from 122)"), and the same notes in both languages ("(incomplete)" / "(ناقصة)", "short surahs" / "قصار السور", "part 2" / "الجزء 2"). The reciter is the same for every entry (Abdul Basit Abdul Samad, shown by the app). Year, place and country are shown where the source gives them; otherwise they are left empty (unknown).

Examples of Arabic titles standardised:

- آل عمران 33-40 → آل عمران (33–40)
- الانعام → الأنعام
- طه 83-122 → طه (83–122)
- العنكبوت 1 → العنكبوت · الجزء 1
- التين 1-8 والقدر → التين (1–8) · القدر
- العلق 1-19 → العلق (1–19)
- البقرة 115-125 → البقرة (115–125)
- البقرة 126- 133 → البقرة (126–133)
- البقرة 247-253 → البقرة (247–253)
- البقرة254 -260 → البقرة (254–260)
- آل عمران 33-45 → آل عمران (33–45)
- النساء 7-12 → النساء (7–12)

Place labels unified (44 entries):

- Sayyida Zainab Mosque · Cairo / مسجد السيدة زينب · القاهرة → Sayyida Zaynab Mosque · Cairo / مسجد السيدة زينب · القاهرة (5)
- Imam al-Busiri Mosque / مسجد الإمام البوصيري → Imam al-Busiri Mosque · Alexandria / مسجد الإمام البوصيري · الإسكندرية (2)
- Abd al-Rahim al-Qinawi Mosque, Qena / مسجد عبد الرحيم القنائي → Abd al-Rahim al-Qinawi Mosque · Qena / مسجد عبد الرحيم القنائي · قنا (2)
- Al-Azhar Mosque / الجامع الأزهر → Al-Azhar Mosque · Cairo / الجامع الأزهر · القاهرة (2)
- Mourphon / مورفون → Mourphon / شركة مورفون (17)
- Mourphon / شركة موريفون → Mourphon / شركة مورفون (2)
- Egyptian Radio / إذاعة مصر → Egyptian Radio / الإذاعة المصرية (1)
- Masjid al-Haram / المسجد الحرام → Masjid al-Haram · Makkah / المسجد الحرام · مكة (4)
- Makkah / مكة → Makkah · Saudi Arabia / مكة · السعودية (1)
- Abu Dhabi / أبو ظبي → Abu Dhabi · UAE / أبوظبي · الإمارات (4)
- Karachi / كراتشي → Karachi · Pakistan / كراتشي · باكستان (1)
- London radio / إذاعة لندن → BBC Radio · London / إذاعة لندن (بي بي سي) (1)
- Iran radio / إذاعة إيران → Iran Radio / إذاعة إيران (2)

## 3. Recording style

Live and radio recordings are filed as public (mosque/concert), radio or TV recitations, as their sources say. Full sets keep their stated style (Murattal, Mujawwad, Warsh). No style was assigned where the source does not state it.

## 4. Duplicates in the existing library (388 groups)

Found by sound. Nothing was deleted; each group is listed in `docs/DUPLICATES-REVIEW.md` for you to decide.

| Kind | Groups |
|---|---|
| placed recording also listed under Place unknown / station not named | 169 |
| same section twice | 77 |
| same country, different sections | 58 |
| copies labelled with different countries (conflict) | 54 |
| copies labelled with different years (conflict) | 23 |
| live entry is the same audio as a full-set surah | 7 |

## 5. Missing recordings found and added

5,179 recording files (2,634 hours) from Abdul Basit collections on archive.org that the app did not use were checked by sound against the library:

| Result | Files |
|---|---|
| already in the library (another upload of the same recording) | 3157 |
| not in the library | 1643 |
| possibly in the library (not added) | 368 |
| could not be read | 11 |

Of the 1643 not in the library, **401 name their surahs** in their own file name; the others are named only "001.mp3" etc. and were **not added** (they would need someone to listen and name them).

Not added: 4 by a different reciter ("Abdul Basit Abu al-Azm"), 52 repeats of the same new recording in several collections, 51 that look the same as an existing entry on paper (flagged), 23 that a second sound check showed to be copies, 6 possibly the same as another recording, 1 whose copies are labelled differently.

**263 recordings were added.** Each is named from its own file label; country, place and year come from that label, or from its collection's title when the collection is about one country and year (e.g. "Kuwait recitations 1974"); otherwise they are under Place unknown (or "Radio · station not named").

| Area | Added |
|---|---|
| Place unknown | 81 |
| Kuwait | 57 |
| Egypt | 37 |
| Masjid al-Aqsa | 31 |
| Radio · station not named | 18 |
| South Africa | 11 |
| Syria | 8 |
| UAE | 5 |
| Pakistan | 5 |
| Iraq | 4 |
| Qatar | 2 |
| Saudi Arabia | 1 |
| Lebanon | 1 |
| Morocco | 1 |
| United States | 1 |

## 6. Need verification

- **Impossible verse numbers in the source**: Al-Māʾidah "55–181" (C 0811) and Al-Ḥajj "75–88" (C 0410) — shown as "(from 55)" / "(from 75)".
- **Ambiguous numbers in collection C**: "Āl ʿImrān 13–17", "Al-Isrāʾ 13/15/16", "Yūsuf 14/15", "Al-Baqarah 142", "Ibrāhīm 27", "Al-Wāqiʿah 14" — the source does not say whether the number is a recording number or a starting verse; shown as "part N".
- **Recording without surah names**: "Recitation 1 · surahs not named" (Al-Aqsa, C 0986).
- **Same audio, different labels**: 54 groups with different countries and 23 with different years (see `docs/DUPLICATES-REVIEW.md`).
- **Live entries identical to a surah in a full set**: 7 (either the live label or the full set is wrong).
- **Unnamed recordings not in the library**: about 1,240 files online that need listening to be named.
- One recording (C 0959, a 36-second Al-Wāqiʿah clip) could not be downloaded for the sound check.
