# Step 7: Vocal recognition

Status: **done** (26 Nov 2026). Code: `js/engine/voice.js`; model and reference: `models/voice/`. Tests:
`tools/engine/eval/voice_set.py`, `voice_eval.mjs`, `voice_score.py`, `voice_shipped.mjs`, `test_voice.mjs`; workflows
`engine-voice.yml`, `engine-voice-score.yml`. Results: `tools/engine/eval/results/voice-20261125-2351-40682b9` (first run),
`voice-rescore-*` (clean labels, the numbers below), `voice-shipped-*` (the shipped files).

## 1. The question

Every recording in the archive is Abdul Basit, so the voice can never pick a recording. What it could do (design §4.5):
1. When nothing matches, say whether the clip even sounds like him ("this may be another reciter").
2. Stop a Confirmed result when the voice is clearly someone else.

Step 7 was to measure whether a speaker model can do either, and whether that is worth its download.

## 2. What was built

| Part | What it does |
|---|---|
| `VOICE.fbank` | Kaldi-compatible 80-band log filterbank (25 ms windows, 10 ms steps, povey window, pre-emphasis, mean-normalised): the input all four candidate models were trained on. It matches `kaldi-native-fbank` to 0.003 (log units) over 1,000 frames. |
| `VOICE.segments` | Voiced pieces of at most 6 s: 3 s windows within 20 dB of the clip's loud level and above −55 dBFS. Silence and very short clips give no pieces, so the verdict is "unknown". |
| `VOICE.embed` | One vector per clip: the mean of the unit vectors of up to 5 pieces. Works with onnxruntime-web (browser) and onnxruntime-node (tests). |
| `VOICE.judge` | Best cosine to the 4 reference centroids. Below the threshold → **"unlike"**; otherwise "no-objection". Less than 4 s of voice → "unknown". |
| `VOICE.check` | Browser: loads onnxruntime-web 1.20.1 (CDN) and the model in a worker on first use. The model is kept in Cache Storage. |

## 3. The test

- **Abdul Basit:** 180 archive recordings, 40 each from the 1950s, 1960s, 1970s and 1980s and 20 undated, from 61
  collections (`voice_pos.json`). Three 12 s samples each, at 20/50/80 %, keeping voiced samples: 495 in all. They are split
  60/40 into reference and test **by surah and year**, so two copies of one performance never sit on both sides.
- **Other reciters:** 16 named reciters found on archive.org by name (`voice_neg.json`): Egyptian reciters of his era
  (Al-Husary, Al-Minshawi, Mustafa Ismail, Al-Banna, Shuaisha, Rifat, Al-Bahtimi, Shahat Anwar, At-Tablawi, Naina,
  Ghalwash) and later Gulf reciters (Alafasy, As-Sudais, Al-Muaiqly, Al-Ghamdi, Jibreel). Two samples per file, up to 4
  items each.
  - Labels were checked two ways. Items naming Abdul Basit were skipped, and every sample was searched in the recording
    index. One "Al-Minshawi" sample matched the archive (it is Abdul Basit's audio) and was dropped.
  - Reading the item list afterwards, 13 items were not clean samples of the named reciter: songs by a singer named Naina,
    Qur'an with a Tamil, Hindi or German translation voice, a children's repetition course, and items with no named
    reciter. These are excluded (`voice_exclude.json`), leaving 364 samples.
- **Edited clips:** the 640-clip test set (all Abdul Basit, with pitch, speed, reverb, noise, joins …), first 20 s.
- **Models:** four speaker-embedding models with ONNX exports (sherpa-onnx), each full and 8-bit.

| Model | Size full / 8-bit |
|---|---|
| WeSpeaker ResNet34-LM (VoxCeleb) | 26.5 / 6.7 MB |
| WeSpeaker CAM++-LM (VoxCeleb) | 29.3 / 8.4 MB |
| 3D-Speaker CAM++ zh-en advanced | 28.3 / 8.6 MB |
| 3D-Speaker ERes2Net base | 39.6 / 10.2 MB |

## 4. Results (clean labels, held-out Abdul Basit samples)

Equal error rate (EER) is the point where wrongly rejected Abdul Basit samples equal wrongly accepted other reciters.
Lower is better.

| Model (8-bit) | Centroids | EER | Others rejected when 99 % of AB pass | Edited clips passing |
|---|---|---|---|---|
| WeSpeaker ResNet34 | 4 | 20.1 % | 44 % | 98.0 % |
| WeSpeaker CAM++ | 4 | 22.5 % | 58 % | 93.8 % |
| 3D-Speaker CAM++ | 4 | 21.6 % | 51 % | 96.4 % |
| 3D-Speaker ERes2Net | 4 | 22.5 % | 16 % | 96.1 % |

The best full-size model reached 18.9 % EER. Several centroids help (1 → 4: about 5 points of EER), because his voice
and the recording chains changed over 35 years. 8-bit costs 0–3 points.

**So a speaker model cannot reliably tell Abdul Basit from other reciters on this material.** The reasons are measurable:
- His own recordings vary hugely (1950s radio, 1980s cassettes, phone copies). Samples of him scored as low as 0.39
  against his own centroids.
- The reciters closest to him are the Egyptian reciters of the same era and recording chains:

| Reciter | Rejected at the strict threshold, 3D-Speaker CAM++ |
|---|---|
| Ghalwash | 0/28 |
| Rifat | 0/27 |
| Al-Bahtimi | 1/26 |
| Shuaisha | 1/20 |
| Shahat Anwar | 1/16 |
| Al-Minshawi | 1/23 |

  The later Gulf reciters are separated much better: Al-Ghamdi 22/32, Al-Muaiqly 19/32, As-Sudais 11/16, Al-Husary
  (studio) 9/12.

### Strict threshold
The engine must not tell a user that a clip of Abdul Basit sounds like someone else. So the threshold was set where **no
held-out Abdul Basit sample** and at most 0.5 % of the edited clips fall below it:

| Model (8-bit), centroids | Threshold | Other reciters flagged "unlike" | Edited Abdul Basit clips wrongly flagged |
|---|---|---|---|
| 3D-Speaker CAM++, 4 | 0.575 | **28.8 %** | 0.6 % (4/640: combo 1, pitch +2, pitch +3, speed 1.25; one each) |
| WeSpeaker ResNet34, 8 | 0.409 | 20.3 % | 0.5 % |
| WeSpeaker CAM++, 4 | 0.403 | 19.2 % | 0.6 % |
| 3D-Speaker ERes2Net, 4 | 0.282 | 0 % | 0.6 % |

## 5. Decision

- **Not used to confirm or to veto.** A Confirmed result rests on identical audio (landmarks). A voice veto would wrongly
  block about 0.6 % of real matches on edited clips, and would add nothing on unedited ones.
- **Not used to say "it is Abdul Basit".** Reciters of his era pass as often as he does.
- **Used for one thing:** when a search ends with **no reliable match**, and the clip has at least 4 s of voice that falls
  below the strict threshold, the result adds: *"The voice does not resemble Abdul Basit's recordings — this may be another
  reciter."* That happens for about 28 % of other-reciter clips, mostly later reciters, and for about 0.5–0.6 % of Abdul
  Basit clips. It is a reason shown alongside "no reliable match", never a result. (Whether a melody-only "Possible"
  should be demoted by it is decided in Step 12, with tests.)
- **Model:** 3D-Speaker CAM++ zh-en advanced, 8-bit, **8.6 MB**, Apache 2.0 (`models/voice/SOURCE.md`). It flags the most
  other reciters at the same safety level. The reference (`models/voice/reference.json`) holds 4 centroids from all 495
  samples, with threshold 0.5751.
- **Download:** only when a search ends without a reliable match. That is the model (8.6 MB, kept in Cache Storage) plus
  onnxruntime-web's wasm (about 3 MB compressed, from the CDN). Nothing changes for searches that find their recording.
- **Speed:** about 70 ms per 6 s piece for the model (onnxruntime-node). In the browser, 1.6–1.9 s for a 20 s clip,
  including loading the model and the runtime the first time.

## 6. Functional tests (`test_voice.mjs`)

Local, Node and Chromium, with the CDN files served from the same onnxruntime-web 1.20.1 package:
- The reference loads: 4 centroids of 192 values.
- Silence → "unknown". A 3 s clip → "unknown". A steady tone does not crash. Its verdict is "no-objection", which claims
  nothing.
- 5 Abdul Basit recordings (1950s–1980s), at two places each: 10/10 "no-objection", scores 0.80–0.94.
- `VOICE.check` in the real app page (worker, wasm): same score as Node (0.935 vs 0.935), 1.9 s.

On GitHub (`engine-voice-score.yml`, job `shipped`), with the real CDN: the shipped model and reference over the whole
voice set and the 640 clips, plus the browser test on other-reciter samples. See §7.

## 7. The shipped files on the whole set

`results/voice-shipped-20261126-0000-36cc93c`. This run uses the shipped model, the shipped reference and the final
`VOICE.segments` over the whole voice set, in Node with onnxruntime-web:

| | Flagged "unlike" |
|---|---|
| Other reciters | **102/364 (28 %)**: Al-Muaiqly 25/32, Al-Ghamdi 24/32, As-Sudais 11/16, Al-Banna 11/32, Al-Husary 6/12, Mustafa Ismail 6/18, Naina 5/14, At-Tablawi 5/28, Alafasy 5/24, Jibreel 2/16, Al-Bahtimi 1/26, Shahat Anwar 1/16; Al-Minshawi, Rifat, Ghalwash, Shuaisha 0 |
| Abdul Basit, voice set | 3/495 (0.6 %): one each from the 1960s, 1970s and 1980s; none from the 1950s or undated |
| Abdul Basit, 640 edited clips | 3/640 (0.5 %): bass boost, pitch +2, speed 1.25; one each |
| Too little voice ("unknown") | 4 Abdul Basit samples, 5 other-reciter samples |

The shipped reference is built from all 495 samples, which moves its centroids a little. So 3 of its own samples now fall
just below the threshold, where none of the held-out test samples did in §4. The honest figure for wrongly flagging
Abdul Basit is therefore **about 0.5–0.6 %**.

Functional test on GitHub, with the real CDN (`functional.txt`): all passed. Three other-reciter samples → "unlike" in
Node. In the app page: Abdul Basit → no-objection (0.869, the same as Node, 2.1 s), and an other-reciter sample →
"unlike" (0.452).

## 8. Problems found and fixed

- **archive.org lengths:** some file lengths come as "29:18", not seconds. The set builder crashed on the first run;
  fixed with `secs()`.
- **Mislabelled "other reciters":** found by reading the item list; 13 items excluded, and the numbers above use the clean
  set.
- **Silence:** at first it was treated as voice, because loudness was only compared with the clip's own level. Added an
  absolute floor (−55 dBFS); silence → "unknown".
- **Repeat downloads:** `models/` bypasses the service worker, so the voice worker keeps the model in Cache Storage, keyed
  by the reference's build.

## 9. Limitations

- Classical Egyptian reciters are not told apart from Abdul Basit. That isn't attempted, and no claim is made.
- The verdict needs at least 4 s of voice.
- Heavy pitch shifts change the timbre. Of the 4 edited clips wrongly flagged, 2 were pitch-shifted. Matched clips never
  reach this check, because it only runs when nothing matched.
- The reference is built from 180 recordings. Adding recordings later doesn't require rebuilding it, but the threshold
  was measured on this set.
