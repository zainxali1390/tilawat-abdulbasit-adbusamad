"""Grade the evidence for the place of every recording whose location was not known, and list the changes to make.

Reads (all in tools/library/research/):
  investigation.json        the 1,673 recordings audited (built before any change)
  meta.json                 archive.org metadata of every file: ID3 title / album / comment and the upload's description
  same-audio-library.json   recordings that are the same audio (whole-length landmark line fit, tools/library/same_audio_library.py)
  same-audio-pairs.json     extra pairs checked the same way (recordings whose labels name the same event)
  announcements.json        what is said in the first 60 s and last 45 s of each recording (Arabic speech recognition)

Writes:
  audit.json                one line per recording: grade, place found (if any), every piece of evidence
  audit-changes.json        the changes to make: only CONFIRMED places (applied by tools/library/organise.py)

Grades (the user's definitions):
  confirmed      a reliable source explicitly identifies the place (the recording's own label or tag naming the city /
                 venue / station, or the label of the SAME AUDIO elsewhere), with nothing contradicting it
  highly_likely  strong but indirect evidence (e.g. the label names an event whose place another label gives, but the
                 sound does not prove it is the same recording)
  possible       a lead only (a label that says "A or B", the same surahs at a known event, an uploader's group title)
  unknown        nothing found
Only "confirmed" changes the library.
"""
import json, os, re, sys, urllib.parse
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
RES = os.path.join(HERE, 'research')
sys.path.insert(0, HERE)


def jload(name, default=None):
    p = os.path.join(RES, name)
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else default


def areas():
    s = open(os.path.join(ROOT, 'data', 'areas.js'), encoding='utf-8').read()
    return json.loads(s[s.index('[{'):s.index(';\n')])


def ia(url):
    m = re.match(r'https?://archive\.org/download/([^/]+)/(.+)$', url)
    return (m.group(1), urllib.parse.unquote(m.group(2))) if m else (None, None)


# ---------------------------------------------------------------------------------------------------------------------
# 1. the recording's OWN label (file name, ID3 title/album/comment) names a city, venue or station.
#    (key, file-name prefix) -> (grade, place en, place ar, new area or None, target section or None, evidence)
#    Every line was read by hand; the label is quoted in the evidence.
LABEL = [
    (('X3', '390-1-9 '), 'confirmed', 'Samannud', 'سمنود', None, None,
     'own file name: "سهرة في 14-11-1979 في سمنود" (the label adds "صعيد مصر", Upper Egypt, but Samannud is in the Delta; the city named is kept, the region is not)'),
    (('X4', '444-1-9 '), 'confirmed', 'Port Said', 'بورسعيد', None, None,
     'own file name: "بور سعيد 1979"; N1 047, labelled separately "الأحزاب - تلاوة 5 - بور سعيد - مصر", is the same audio (landmark fit)'),
    (('N1', '047.mp3'), 'confirmed', 'Port Said', 'بورسعيد', None, None,
     'own ID3 title: "الأحزاب - تلاوة 5 - بور سعيد - مصر"; X4 444 ("بور سعيد 1979", another collection) is the same audio (landmark fit)'),
    (('X2', '210-1-9 '), 'confirmed', 'Esna', 'إسنا', None, None, 'own file name: "من أسنا 1979 مصر"'),
    (('X5', '613-1-3 '), 'confirmed', 'Esna', 'إسنا', 'egypt', 'Public recitations · date not given',
     'own file name: "مسجلة من إسنا" (Esna, Egypt); it was filed under "Country not known"'),
    (('X6', '676-1-10 '), 'confirmed', 'Esna', 'إسنا', 'egypt', 'Public recitations 1970s',
     'own file name: "مسجلة من مركز إسنا 1970" (Esna district, Egypt); it was filed under "Country not known"'),
    (('I3', '28-1-10 '), 'confirmed', 'Upper Egypt', 'الصعيد', None, None, 'own file name: "سهرة من صعيد مصر" (an evening recitation in Upper Egypt, town not named)'),
    (('I19', '05-5-1 '), 'confirmed', 'Souq Mosque · Kuwait', 'مسجد السوق · الكويت', None, None,
     'own ID3 title (Comprehensive Library): "Great Soq\'s Mosque 1966 KT." — the Great Souq Mosque, already a place here ("مسجد السوق الكبير", X1 173). '
     'The tag says 1966, the file name 1964: the year is not changed'),
    (('I15', '49-7-8 '), 'confirmed', 'Durban', 'ديربان', None, None, 'own file name: "من مدينة دربن عام 1981 من جنوب افريقيا"; ID3 title: "derbon 1981 S.Africa"'),
    (('I9', '041--1954'), 'confirmed', 'Al-Kadhimiya Mosque · Baghdad', 'مسجد الكاظمين · الكاظمية، بغداد', None, None,
     'own ID3 title: "سورة الحشر والتكوير والفجر - 1954م - ( مسجد الكاظمين - العراق"'),
    (('N2', '388.mp3'), 'confirmed', 'Baghdad', 'بغداد', None, None, 'own ID3 title: "لقمان - بغداد - العراق"'),
    (('X1', '106-3-1 '), 'confirmed', 'Irbid', 'إربد', None, None, 'own file name: "اربد الاردن 1965"'),
    (('X4', '451-3-2 '), 'confirmed', 'Amman', 'عمّان', None, None, 'own file name: "من تلاوات عمان1980 -الاردن"'),
    (('X2', '193-2-2 '), 'confirmed', 'Al-Maqasid Islamic Charitable Association · Lebanon', 'جمعية المقاصد الخيرية الإسلامية · لبنان', None, None,
     'own file name: "في الستينات- جمعية المقاصد الخيرية لبنان"'),
    (('X1', '14-6-1 '), 'confirmed', 'Dar al-Aytam al-Islamiyya · Lebanon', 'دار الأيتام الإسلامية · لبنان', None, None,
     'own file name: "دار الايتام 6-4-1972 - لبنان"'),
    (('X1', '164-6-1 '), 'confirmed', 'Dar al-Aytam al-Islamiyya · Lebanon', 'دار الأيتام الإسلامية · لبنان', None, None,
     'own file name: "دار الايتام 6 نيسان1972-لبنان"'),
    (('I34', '1-12 '), 'confirmed', 'Dar al-Aytam al-Islamiyya · Lebanon', 'دار الأيتام الإسلامية · لبنان', None, None,
     'own file name and ID3 title: "يوسف لبنان دار الايتام"'),
    (('I12', '011-15-73'), 'confirmed', 'Egyptian Radio', 'الإذاعة المصرية', None, None,
     'the upload\'s own title: "إذاعيات مصر - فترة الخمسينات - تلاوات فئة 15 دقيقة" (Egyptian radio, 1950s)'),
    # leads only — nothing changed
    (('X5', '621-4-1 '), 'highly_likely', 'Kadhimiya · Baghdad', 'الكاظمية · بغداد', None, None,
     'own file name names the event: "عزاء الاميرة جليلة 1956 العراق" (the mourning for Princess Jalila); X5 620, the same event, is labelled '
     '"عزاء الاميرة جليلة - الكاظمية 1956". The sound check does not show them to be the same audio, so not changed'),
    (('X6', '659-6-2 '), 'possible', 'Makkah', 'مكة', None, None,
     'own file name: "من موسم الحج في السبعينات" (the Hajj season, 1970s): the town is not named (Makkah, Mina or Arafat)'),
]
for code_prefix in ('almsjed-alaqsa (70)', 'almsjed-alaqsa (43)', 'almsjed-alaqsa (42)', 'almsjed-alaqsa (53)', 'almsjed-alaqsa (80)', 'almsjed-alaqsa (79)'):
    LABEL.append((('I1', code_prefix + '.mp3'), 'possible', 'Al-Aqsa Mosque or Kuwait', '', None, None,
                  'own ID3 title says the place is uncertain: "الاقصي او الكويت" / "تنسب للاقصي وغالبا الكويت" (attributed to Al-Aqsa, more likely Kuwait); '
                  'it is filed under Kuwait already'))
# the recording type is named (television), not the place: the place stays "not known", the type is shown
TV = r'تلاوة تلفزيونية|تلاوة فيديوية من قناة'
# words in a label that name a specific place (used to catch copies whose own labels disagree)
SPEC = re.compile(r'(مسجد [^-_.|(]{2,25}|جامع [^-_.|(]{2,25}|حي [^-_.|(]{2,15}|بيت الشيخ|سمنود|بور ?سعيد|[اأإ]سنا|القاهرة|[اإ]لاسكندرية|الإسكندرية|طنطا|المنصورة|'
                  r'الزقازيق|دمياط|[اأ]سيوط|سوهاج|قنا|الاقصر|الأقصر|[اأ]سوان|الحسين|الازهر|الأزهر|دمشق|حلب|حمص|حماة|اللاذقية|الاقصى|الأقصى|الاقصي|'
                  r'القدس|بغداد|الكاظمي|مكة|الحرم|المدينة|جدة|الرياض|الشويخ|الدوحة|ابوظبي|أبوظبي|دبي|بنغازي|طرابلس|لاهور|كراتشي|جاكرتا|'
                  r'جوهانسبرغ|دربن|ديربان|اربد|إربد|عمان|بيروت|المقاصد|دار الايتام|اذاعة|إذاعة|الاذاعة|الإذاعة|مورفون|موريفون|تلفزيون)')

# not a recitation by Sheikh Abdul Basit at all: reported, nothing changed (recordings are never deleted)
NOT_HIS = {('I54', 'Touheed Tv'): 'a hadith lecture ("Kitab al-Talaq", Sahih Bukhari) by Dr Abdul Basit Faheem, uploaded as '
                                    '"explanation-bukhari-muslim-dr.-abdul-basit-faheem" — another person with the same first name'}

# ---------------------------------------------------------------------------------------------------------------------
# 2. announcements: what is SAID at the start or end of the recording (the announcer or the Sheikh naming the place).
#    Filled in by hand after reading announcements.json: (key, file-name prefix) -> (grade, place en, place ar, area, section, evidence)
ANNOUNCED = []


def main():
    inv = jload('investigation.json')
    meta = jload('meta.json', {})
    A = areas()
    where = {}
    for a in A:
        for sc in a['secs']:
            for it in sc['items']:
                where['e:%s:%s' % (it[0], it[1])] = (a['id'], a['en'], sc['en'], it[6] or '', it[5] or '', it[4] or '')
    U = {x['code']: x for x in inv}

    def label_of(x):
        i, name = ia(x['url'])
        f = (meta.get(i) or {}).get('files', {}).get(name) or {}
        return ' | '.join(str(f.get(k, '')) for k in ('title', 'album', 'comment') if f.get(k))

    # same audio: clusters (connected) over confirmed pairs
    pairs = [p for p in (jload('same-audio-library.json', []) + jload('same-audio-pairs.json', [])) if p.get('same')]
    par = {}

    def find(a):
        par.setdefault(a, a)
        while par[a] != a:
            par[a] = par[par[a]]; a = par[a]
        return a
    for p in pairs:
        par[find(p['u'])] = find(p['other'])
    members = defaultdict(set)
    for c in list(par):
        members[find(c)].add(c)

    def specific(code):
        """a known, specific place of a recording outside the audit (or one this audit confirms from its own label)"""
        if code in U:
            return None
        w = where.get(code)
        if not w:
            return None
        aid, aen, sec, pen, par_, yr = w
        if not pen or pen == aen or pen in ('Place unknown',) or re.search(r'not known|country not given|not named', pen):
            return None
        return dict(area=aid, area_en=aen, sec=sec, en=pen, ar=par_, year=yr, code=code)

    label_hits = {}
    for (k, pre), *rest in LABEL:
        for c, x in U.items():
            kk, f = c.split(':', 2)[1:]
            if kk == k and f.startswith(pre):
                label_hits.setdefault(c, []).append(rest)
    ann_hits = {}
    for (k, pre), *rest in ANNOUNCED:
        for c in U:
            kk, f = c.split(':', 2)[1:]
            if kk == k and f.startswith(pre):
                ann_hits.setdefault(c, []).append(rest)

    out, changes = [], []
    COUNTRY_OF_AREA = {a['id']: a['en'] for a in A}
    for x in inv:
        c = x['code']; key, fname = c.split(':', 2)[1:]
        lab = label_of(x)
        ev, grade, place = [], 'unknown', None
        ev.append('own label: "%s"' % (fname + (' || ' + lab if lab else ''))[:260])
        # not his
        for (k, pre), why in NOT_HIS.items():
            if key == k and fname.startswith(pre):
                ev.append('NOT A RECITATION BY THE SHEIKH: ' + why)
                grade = 'not_his'
        # own label
        for g, pen, par_, area, sec, why in label_hits.get(c, []):
            ev.append(why)
            if g == 'confirmed' or grade in ('unknown', 'possible'):
                grade, place = g, dict(en=pen, ar=par_, area=area, sec=sec, why=why)
        # announcements
        for g, pen, par_, area, sec, why in ann_hits.get(c, []):
            ev.append(why)
            if grade != 'confirmed' or (place and place['en'] == pen):
                grade, place = g, dict(en=pen, ar=par_, area=area, sec=sec, why=why)
        # same audio
        root = find(c) if c in par else None
        if root:
            mem = members[root] - {c}
            known = [s for s in (specific(m) for m in mem) if s]
            # labels of the audited copies (their own labels name the country)
            copies_u = sorted(m for m in mem if m in U)
            ev.append('same audio (landmark line fit over the whole length) as: ' + '; '.join(
                ['%s [%s / %s]' % (k['code'][:70], k['area_en'], k['en']) for k in known] +
                ['%s [audited, filed: %s]' % (m[:70], U[m]['country']) for m in copies_u])[:900])
            own_area = where[c][0]
            countries = {k['area'] for k in known} | {where[m][0] for m in copies_u if where[m][0] not in ('unknown', 'radio_unknown')}
            if own_area not in ('unknown', 'radio_unknown'):
                countries.add(own_area)
            places = {k['en'] for k in known}
            # place words in the audited copies' OWN labels (and this recording's): any that the adopted place does not
            # contain is a disagreement
            own_words = {}
            for m in copies_u + [c]:
                for w in SPEC.findall(m.split(':', 2)[2] + ' ' + label_of(U[m])):
                    own_words.setdefault(w.strip(), m)
            if known and len(places) == 1:
                k0 = known[0]
                odd = [w for w in own_words if not any(t in (k0['ar'] + ' ' + k0['code']) for t in re.split(r'[ ]+', w)
                                                       if len(t) > 2 and t not in ('مسجد', 'جامع', 'حي', 'من', 'في'))]
                if odd:
                    places = places | {'"%s" (label of %s)' % (w, own_words[w].split(':', 2)[2][:40]) for w in odd}
            if known and len(countries) == 1 and len(places) == 1 and grade in ('unknown', 'possible'):
                k = known[0]
                grade = 'confirmed'
                why = 'same audio as %s, labelled at "%s" (%s)' % (k['code'][:90], k['en'], k['area_en'])
                if k['sec'].startswith('Shared khatma'):
                    grade = 'possible'   # a copy of a khatma part: belongs with the Khatmas section, not moved by this audit
                    why = 'same audio as part of the shared khatma of the early 1950s (%s): left where it is' % k['code'][:80]
                place = dict(en=k['en'], ar=k['ar'], area=k['area'] if k['area'] != own_area else None,
                             sec=k['sec'] if k['area'] != own_area else None, why=why)
            elif known and (len(countries) > 1 or len(places) > 1):
                ev.append('CONFLICT: the copies are labelled at different places (%s; countries %s): nothing changed' % (
                    ', '.join(sorted(places)), ', '.join(sorted(COUNTRY_OF_AREA.get(a, a) for a in countries))))
                if grade == 'unknown':
                    grade = 'possible'
                    place = dict(en=' or '.join(sorted(places)), ar='', area=None, sec=None, why='conflicting labels of the same audio')
        # type only (television)
        tv = re.search(TV, fname + ' ' + lab)
        if tv:
            ev.append('own label names the type, not the place: "%s" (a TV broadcast)' % tv.group(0))
        rec = dict(n=x['n'], code=c, title=x['title'], year=x['year'], filed=x['country'], was=x['loc'], mode=x['mode'], grade=grade,
                   place=(place or {}).get('en'), evidence=ev)
        out.append(rec)
        if grade == 'confirmed':
            w = where[c]
            changes.append(dict(code=c, key=key, file=fname, area=place['area'], sec=place['sec'], en=place['en'], ar=place['ar'],
                                was='%s / %s' % (w[1], w[3] or '(none)'), evidence=place['why']))
        elif tv and grade == 'unknown' and not where[c][3]:
            changes.append(dict(code=c, key=key, file=fname, area=None, sec=None, en='TV · channel and country not given',
                                ar='تلفزيون · القناة والبلد غير مذكورين', was='%s / %s' % (where[c][1], where[c][3] or '(none)'),
                                evidence='own label: "%s" — the type is known (television), the place is not' % tv.group(0), type_only=True))
            rec['type'] = 'tv'
    json.dump(out, open(os.path.join(RES, 'audit.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    json.dump(changes, open(os.path.join(RES, 'audit-changes.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    from collections import Counter
    print(Counter(r['grade'] for r in out), len(changes), 'changes (', sum(1 for c in changes if c.get('type_only')), 'type only )')


if __name__ == '__main__':
    main()
