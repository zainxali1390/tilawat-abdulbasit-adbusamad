# Step 9: Archive indexing and search

Status: see the checklist. Code: `tools/engine/build_index.mjs` (melody index), `js/engine/archive.js` (the app's
loader), `tools/verses/analyse.mjs --model --step --all` (verse map), `tools/engine/build_vi.mjs` (verse index).
Tests: `test_archive.mjs`, `melody_hash_eval.mjs --archive`, `cand_eval.mjs`, `verse_exp.mjs`. Workflows:
`engine-index.yml`, `engine-verse-exp.yml`, `verse-rebuild.yml`. Results: `tools/engine/eval/results/index-20261126-0934-9d4a741`
(first whole-archive test), `index-20261126-1308-f271c46` (after the fixes below), `verse-exp-*`.

## 1. What was indexed

| Index | Content | Size | A search downloads |
|---|---|---|---|
| `mf/` melody frames | one file per recording, 1 byte per 50 ms (`mf/r/XX/<fnv>.bin`) | 3,081 recordings, 97 MB | the melodies of the 30 recordings it checks (about 0.7 MB) |
| `mh/` melody hashes | 11.2 million entries in 12,028 shard files, sharded like `fp/` | 48 MB | the shards of the clip's hashes (a few hundred small files) |
| `vm/` verse map | rebuilt: base model, a 30 s window every 30 s (§3) | see §3 | unchanged: the parts it needs |
| `vi/` verse index | the verse map turned around, per surah | see §3 | one surah's file |

- **Incremental:** the melody indexer keeps a manifest (`mf/manifest.json`: code → file, frames, url). A recording whose url
  hasn't changed is not downloaded again. Tested locally: the second run reused both test recordings and downloaded
  nothing.
- **Recordings that drop out:** recordings no longer in the library lose their files at the next merge.
- **Build id:** an FNV hash of the recording list and lengths is put on every file request (`?b=`), so a page never mixes
  two builds.
- **Whole-archive build:** 24 parallel jobs, all 3,081 recordings, **0 failures**. It took about 50 minutes, because the
  pitch tracker runs at about 0.6 % of real time.

## 2. Melody search against the whole archive

The first whole-archive test showed the Step 8 vote, measured on 89 recordings, doesn't carry over to 3,081 unchanged:

| Melody hashes alone, 640 clips | Pilot (89 recordings) | Whole archive, plain vote | Whole archive, final |
|---|---|---|---|
| Right recording first | 421 | 342 | **398** |
| In top 30 | 557 | 417 | 420 |

Two fixes, found with a local test bed (the 40 edited clips of one local recording against the whole served index):

1. **Rare hashes weigh more.** Each hit counts log(1 + 10 × mean list length / this hash's list length). Locally the right
   recording reached the top 30 for 31/40 clips, against 29 before.
2. **Re-ranking by alignment.** The vote's first 30 recordings are each aligned with the full melody alignment
   (`MELODY.alignNear`) on a window around the suggested time. That needs only those 30 melodies.
   - Locally: whenever the right recording was in the top 30, it came **first** after this (31/31).
   - Whole archive: first for 398 clips, up from 342.
   - Cost: median 0.9 s per clip, including fetching the 30 melodies (3 s at most).
3. **Only good alignments are passed on** (`CAND.melody`, at least 0.7). Without this, the melody list's weak entries pushed
   verse candidates out of the shortlist. The cut-off was measured on the fused list: 0.65–0.8 all give the best result,
   and 0.7 sits in the middle.

The clips the vote misses rank hundreds deep, so a longer list does not help (top 400: 34/40 locally against 31 at top 30).
Their turning points are destroyed: pitch ±2 on top of noise, distortion, a music bed.

**The shortlist with the whole-archive melody source** (Step 8 fusion, landmark and verse lists as before):

| | Landmarks + verses | + melody, plain | + melody, final |
|---|---|---|---|
| Right recording in the shortlist, 68 clips the landmark search didn't confirm | 57 | 56 | **59** |
| Right recording in the shortlist, all 640 clips | 629 | 628 | **631** |
| Right recording first in the shortlist, all 640 clips | 601 | 564 | 612 |

## 3. The verse map

(filled in from the rebuild)

## 4. Functional tests

`test_archive.mjs` reads the served indexes over HTTP exactly as the app does:
- the manifests agree (build id, recording count);
- melodies fetch;
- the served index gives the same top 5 as an index built in memory (local test build);
- the verse index loads, and a missing surah gives nothing.

All passed locally and on GitHub against the whole archive.

## 5. Problems found and fixed

- **The indexer joined absolute local paths to the repository root**, and the merge wrote to `mf/` before creating it.
  Both were found in the local test and fixed before the CI run.
- **The list step lacked numpy** on GitHub. Added.
- **The melody vote was too noisy at archive scale** (§2). Fixed with the rare-hash weighting, the re-ranking and the
  cut-off.
- **The verse map was built with the tiny speech model,** before Step 4 chose the base model, and sampled half of each
  recording. Measured and rebuilt (§3).
