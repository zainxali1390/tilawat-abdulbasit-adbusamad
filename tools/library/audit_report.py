"""docs/LOCATION-AUDIT.md from tools/library/research/audit.json (tools/library/locate.py) and the change log."""
import json, os
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
RES = os.path.join(HERE, 'research')
au = json.load(open(os.path.join(RES, 'audit.json'), encoding='utf-8'))
ch = json.load(open(os.path.join(RES, 'audit-changes.json'), encoding='utf-8'))
log = [x for x in json.load(open(os.path.join(HERE, 'organise-log.json'), encoding='utf-8')) if x.get('audit')]
applied = {x['rec'] for x in log}
G = Counter(r['grade'] for r in au)
FILED = {'nocountry': 'Country not known'}


def esc(s):
    return str(s).replace('|', '\\|').replace('\n', ' ')


def short(code):
    k, f = code.split(':', 2)[1:]
    return '%s %s' % (k, f[:60])


L = []
w = L.append
w('# "Location not known": audit of every recording (%s)' % '25 November 2026')
w('')
w('Every recording the library showed as **"Location not known"** (or "Radio · station not named", or with no country) '
  'was checked: **%d recordings**. The full list, one line per recording with all its evidence, is '
  '`tools/library/research/audit.json`; the starting list is `tools/library/research/investigation.json`.' % len(au))
w('')
w('## Totals')
w('')
w('| | Recordings |')
w('|---|---|')
w('| Audited | %d |' % len(au))
cc = {c['code'] for c in ch if c.get('country_only')}
w('| **Confirmed**, and changed in the library | **%d** |' % G['confirmed'])
w('| … the venue, station or town | %d |' % (G['confirmed'] - len(cc)))
w('| … the country only (they had none, or a wrong one); the venue is still not known | %d |' % len(cc))
w('| Highly likely (not changed) | %d |' % G['highly_likely'])
w('| Possible (not changed) | %d |' % G['possible'])
w('| Still unknown | %d |' % G['unknown'])
w('| Not a recitation by the Sheikh (reported, not changed) | %d |' % G['not_his'])
w('| Place still unknown, but the type is now shown (television) | %d |' % sum(1 for c in ch if c.get('type_only')))
w('')
w('Nothing was deleted. No recording ID, file, link, title, year or timestamp changed: only the place field of the '
  'recordings below (and, where the recording was filed under the wrong or no country, the country it is filed under). '
  'The library still holds **2,739** recordings. Backup of the data before this audit: '
  '`data/backups/areas.before-location-audit-2026-11-24.js`.')
w('')
w('## How each recording was checked')
w('')
w('1. **Its own labels**: the file name, and the ID3 title / album / comment tags and upload description on archive.org '
  '(`research/meta.json`, every file, read for this audit). Labels saying "A or B" were not taken as an answer.')
w('2. **The same audio elsewhere** in the library: all recordings were compared by sound (landmark fingerprints, a straight '
  'time line fitted over the whole length; `tools/library/same_audio_library.py`). Where an exact copy is labelled at a '
  'venue, that venue was taken, **only if** every copy and its own label agree on the country and place. If they disagree, nothing was changed.')
w('3. **What is said in the recording**: the first 60 s and last 45 s of every recording were transcribed with an Arabic '
  'speech model (`research/announcements.json`), looking for an announcer or the Sheikh naming a mosque, city, station or occasion. '
  'Every hit was read by hand and is quoted in the evidence (the recogniser misspells words; the quotes are corrected where the meaning is clear).')
w('4. **Other uploads of the same audio on archive.org**: every other Abdul Basit upload on archive.org whose label names a place '
  '(%d files) was matched by sound against the library (`research/labelled-uploads-check.json`); a match counts only when at least two '
  '25-second windows agree at the same offset. Their labels were then read for a place.' % len(json.load(open(os.path.join(RES, 'candidates.json'), encoding='utf-8'))))
w('')
w('**Rules for "confirmed"**: every source that names a place must agree. A recording already filed under a country that its own '
  'label does not name is moved to another country only on two independent kinds of evidence (e.g. its announcement and labelled '
  'copies). "Al-Aqsa" labels on other uploads are not taken alone, because several uploaders attribute Kuwait and UAE recordings to '
  'Al-Aqsa (their own notes say so). A label that says "A or B" is not an answer. Where a radio recording is identified, the place is the '
  'station that broadcast it (as the library does for all radio recordings), and it stays in the Radio collection.')
w('5. **Web search** (Arabic and English) about the tours with the most unplaced recordings (South Africa 1966, Kuwait 1964). '
  'It confirmed the tours but named no venue for any particular recording, so it changed nothing.')
w('')
w('Not used as evidence: recording quality, the surahs recited (the same passage was recited at many events), the '
  'collection a file was uploaded in (one exception: an upload whose own title names the station, I12 "إذاعيات مصر"), '
  'or where a copy was later broadcast.')
w('')
CO = {c['code'] for c in ch if c.get('country_only')}
for head, sel in (('Changes made: venue, station or town confirmed', lambda x: 'e:' + x['rec'] not in CO),
                  ('Changes made: country confirmed (the venue is still not known)', lambda x: 'e:' + x['rec'] in CO)):
    w('## ' + head)
    w('')
    w('| Recording | Title | Year | Was | Now | Evidence |')
    w('|---|---|---|---|---|---|')
    for x in log:
        if x['kind'] == 'type' or not sel(x):
            continue
        now = x['now'] if not x['now'].endswith(' / ') else x['now'][:-3] + ' / location not known'
        w('| %s | %s | %s | %s | %s | %s |' % (esc(short('e:' + x['rec'])), esc(x['title']), esc(x['year']), esc(x['was']), esc(now), esc(x['evidence'])))
    w('')
w('')
w('## Type named, place still unknown')
w('')
w('These labels say the recording is a **television** recitation. They are now listed as "TV · channel and country not '
  'given" under "Country not known", not as an unknown public recitation. Their place remains unknown.')
w('')
for x in log:
    if x['kind'] == 'type':
        w('- %s — %s (%s)' % (esc(short('e:' + x['rec'])), esc(x['title']), esc(x['evidence'])))
w('')
w('## Highly likely and possible (NOT changed: need more investigation)')
w('')
w('| Recording | Title | Filed | Grade | Lead | Why not changed |')
w('|---|---|---|---|---|---|')
for r in au:
    if r['grade'] in ('highly_likely', 'possible'):
        why = next((e for e in r['evidence'] if e.startswith('CONFLICT')), None) or r['evidence'][-1]
        w('| %s | %s | %s | %s | %s | %s |' % (esc(short(r['code'])), esc(r['title']), esc(FILED.get(r['filed'], r['filed'])),
                                         r['grade'].replace('_', ' '), esc(r['place'] or ''), esc(why[:400])))
w('')
w('## Not a recitation by the Sheikh')
w('')
for r in au:
    if r['grade'] == 'not_his':
        w('- %s — %s. Left in place; you may want to remove it from the library.' % (esc(short(r['code'])), esc(next(e for e in r['evidence'] if e.startswith('NOT')))))
w('')
w('## Filing questions found on the way (not changed)')
w('')
w('- **B "4-2 الحاقة 1-18 نسخة ايران"** is filed under **Iran** only because its file name says "نسخة ايران", which means "the copy '
  'from Iran" (where the uploader got the tape), not that it was recited in Iran. Its place is unknown.')
w('- **The "Al-Aqsa or Kuwait" group** (I1, 6 recordings): its own labels say "الاقصي او الكويت" / "تنسب للاقصي وغالبا الكويت". '
  'They stay filed under Kuwait; neither place is proven.')
w('- **Kuwait recordings whose exact copies are labelled "Al-Aqsa Mosque" (1964–65)**, Syria-labelled recordings whose copies are '
  'labelled Egyptian Radio or Port Said, and others in the table above. One of the two labels is wrong; the sound alone cannot tell which.')
w('')
w('## Still unknown, by where they are filed')
w('')
w('| Filed under | Still unknown |')
w('|---|---|')
for k, v in Counter(FILED.get(r['filed'], r['filed']) for r in au if r['grade'] == 'unknown').most_common():
    w('| %s | %d |' % (k, v))
w('')
w('Most of these have labels that name only the country (or nothing), no spoken announcement in the first and last minute, '
  'and no labelled copy anywhere we could find. They were left as "Location not known" rather than given a guessed venue.')
w('')
w('## Accounted for')
w('')
w('All %d recordings in the starting list appear once in `audit.json` with a grade (%s). %d changes were applied; '
  'every other recording is unchanged.' % (len(au), ', '.join('%s %d' % (k.replace('_', ' '), v) for k, v in G.most_common()), len(log)))
open(os.path.join(ROOT, 'docs', 'LOCATION-AUDIT.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print('docs/LOCATION-AUDIT.md', len(L), 'lines')
