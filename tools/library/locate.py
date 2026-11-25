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
    (('X6', '725-1-1 '), 'confirmed', "At the Sheikh's home", 'منزل الشيخ', 'home', 'Home recitations 1961',
     'own file name: "من بيت الشيخ 1961" (at the Sheikh\'s home); X6 726, the same audio, is labelled the same'),
    (('R', '369--'), 'confirmed', 'Mourphon', 'شركة مورفون', 'egypt', 'Mourphon recitations', 'own file name: "شركة موريفون" (the Mourphon record company, Cairo)'),
    (('R', '366--'), 'confirmed', 'Mourphon', 'شركة مورفون', 'egypt', 'Mourphon recitations', 'own file name: "شركة موريفون" (the Mourphon record company, Cairo)'),
    (('R', '368--'), 'confirmed', 'Mourphon', 'شركة مورفون', 'egypt', 'Mourphon recitations', 'own file name: "شركة موريفون" (the Mourphon record company, Cairo)'),
    (('B', '5-1 النحل 63-103 من تلاوات شركة موريفون'), 'confirmed', 'Mourphon', 'شركة مورفون', 'egypt', 'Mourphon recitations',
     'own file name: "من تلاوات شركة موريفون" (the Mourphon record company, Cairo)'),
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
_SPEC = (r'(مسجد [^-_.|(]{2,25}|جامع [^-_.|(]{2,25}|حي [^-_.|(]{2,15}|بيت الشيخ|سمنود|بور ?سعيد|[اأإ]سنا|القاهرة|[اإ]لاسكندرية|الإسكندرية|طنطا|المنصورة|'
                  r'الزقازيق|دمياط|[اأ]سيوط|سوهاج|قنا|الاقصر|الأقصر|[اأ]سوان|الحسين|الازهر|الأزهر|دمشق|حلب|حمص|حماة|اللاذقية|الاقصى|الأقصى|الاقصي|'
                  r'القدس|بغداد|الكاظمي|مكة|الحرم|المدينة|جدة|الرياض|الشويخ|الدوحة|ابوظبي|أبوظبي|دبي|بنغازي|طرابلس|لاهور|كراتشي|جاكرتا|'
                  r'جوهانسبرغ|دربن|ديربان|اربد|إربد|عمان|بيروت|المقاصد|دار الايتام|اذاعة|إذاعة|الاذاعة|الإذاعة|مورفون|موريفون|تلفزيون)')
SPEC = re.compile('(?<![\u0621-\u064A])(?:[وبلف]|من)?' + _SPEC + '(?![\u0621-\u064A])')

# not a recitation by Sheikh Abdul Basit at all: reported, nothing changed (recordings are never deleted)
NOT_HIS = {('I54', 'Touheed Tv'): 'a hadith lecture ("Kitab al-Talaq", Sahih Bukhari) by Dr Abdul Basit Faheem, uploaded as '
                                    '"explanation-bukhari-muslim-dr.-abdul-basit-faheem" — another person with the same first name'}

# ---------------------------------------------------------------------------------------------------------------------
# 2. announcements: what is SAID at the start or end of the recording (announcements.json, Arabic speech recognition; read
#    by hand, the words quoted as transcribed, with the recogniser's spelling mistakes).
#    (key, file-name prefix) -> (place en, place ar, area, evidence)
ANNOUNCED = [
    (('C', '0663-1_'), 'Sheikh al-Banna Mosque · Monufia', 'مسجد الشيخ البنا · المنوفية', 'egypt',
     'spoken at the start: "نحييكم من قرية شبرا باص بمحافظة المنوفية حيث ننقل لكم شعائر صلاة الجمعة من مسجد المرحوم الشيخ محمود علي البنا" '
     '(a live Friday-prayer broadcast from Sheikh Mahmoud Ali al-Banna\'s mosque, Shubra Bas, Monufia); its own label names no country'),
    (('I16', '1-56-31974'), 'Fahad al-Salem Mosque · Kuwait', 'مسجد فهد السالم · الكويت', 'kuwait',
     'spoken at the end: "تنتهي إذاعتنا هذه من جامع فهد السالم" (transcribed "جامعة هذا السالم")'),
    (('C', '0979-3'), 'Fahad al-Salem Mosque · Kuwait', 'مسجد فهد السالم · الكويت', 'kuwait',
     'spoken at the end: "تنتهي إذاعتنا هذه من جامع فهد السالم" (transcribed "جامعة هادسان")'),
    (('E', 'إبراهيم ( 23 - 41 ) - تلاوة 1'), 'Fahad al-Salem Mosque · Kuwait', 'مسجد فهد السالم · الكويت', 'kuwait',
     'spoken at the end: "تنتهي هذه الإذاعة الدينية التي نقلناها لكم من مسجد المرحوم الشيخ فهد السالم الصباح"'),
    (('X1', '71-'), '14 Ramadan Mosque · Baghdad', 'جامع 14 رمضان · بغداد', 'iraq',
     'spoken at the start: "من جامع أربعة عشر رمضان … ثلاثة أيام … فاتحة على روح الفقيد"; an upload of the same audio is labelled "العراق - مسجد 14 رمضان 1986"'),
    (('X5', '538-6-2'), 'Grand Mosque · Doha', 'المسجد الكبير · الدوحة', 'qatar',
     'spoken at the start: "ننتقل إلى إذاعة خارجية … من المسجد الكبير بالدوحة"'),
    (('C', '0011-'), 'Nidaa al-Islam Radio · Makkah', 'إذاعة نداء الإسلام · مكة', 'saudi',
     'spoken at the end: "هذه إذاعة نداء الإسلام من مكة المكرمة" (a radio broadcast; where it was recited is not said)'),
    (('B', '4 الشرح 1-8 التين العلق القدر'), 'Jordanian Radio · Amman', 'الإذاعة الأردنية · عمّان', 'jordan',
     'spoken at the end: "إذاعة المملكة الأردنية الهاشمية من عمان" (a radio broadcast)'),
    (('B', '4 الحجرات 1-18  وق1-8'), 'Quran Radio · Cairo', 'إذاعة القرآن الكريم · القاهرة', 'egypt',
     'spoken at the start and end: "إذاعة القرآن الكريم من القاهرة … القرآن السهرة لهذه الليلة" (a radio broadcast)'),
    (('B', '3 البروج 1-11 '), 'Quran Radio · Cairo', 'إذاعة القرآن الكريم · القاهرة', 'egypt',
     'spoken at the start: "إذاعة القرآن الكريم من القاهرة. القارئ الشيخ عبد الباسط عبد الصمد يتلو علينا ما تيسر من سورة البروج" (a radio broadcast); '
     'the same audio is R 261 "اذاعة مصر الخمسينات" (Egyptian Radio)'),
    (('B', '7 البينة 1- 8'), 'Quran Radio · Cairo', 'إذاعة القرآن الكريم · القاهرة', 'egypt',
     'spoken at the end: "تلاها علينا القارئ الشيخ عبد الباسط عبد الصمد … سورة البينة. إذاعة القرآن الكريم من القاهرة" (a radio broadcast)'),
    (('C', '1130--1'), 'Quran Radio · Cairo', 'إذاعة القرآن الكريم · القاهرة', 'egypt',
     'spoken at the end: "… الشيخ عبد الباسط عبد الصمد ما تيسر من سورتي … إذاعة القرآن الكريم من القاهرة" (a radio broadcast)'),
    (('C', '0201-3'), 'Mohamed Farag Mosque · Egypt', 'مسجد محمد فرج · مصر', 'egypt',
     'spoken at the end: "في احتفال إذاعة القرآن الكريم بالذكرى السنوية للمرحوم الشيخ علي حزين … على الهواء مباشرة من رحاب مسجد الحاج محمد فرج بحي حدائق القبة مدينة القاهرة"; '
     'C 0210 (the same audio) has the same announcement; X2 256 in the library is labelled "ذكرى علي حزين- مسجد محمد فرج"'),
    (('C', '0210-'), 'Mohamed Farag Mosque · Egypt', 'مسجد محمد فرج · مصر', 'egypt',
     'spoken at the end: "… بالذكرى السنوية للمرحوم الشيخ علي حزين … على الهواء من رحاب مسجد الحاج … بحي حدائق القبة مدينة القاهرة"; C 0201-3 (the same audio) names "مسجد الحاج محمد فرج"'),
]
ANN_RADIO = {'Quran Radio · Cairo': 'Radio recitations · date not given', 'Nidaa al-Islam Radio · Makkah': 'Radio recitations · date not given',
             'Jordanian Radio · Amman': 'Radio recitations · date not given', 'Kuwait Radio': 'Radio recitations · date not given',
             'Egyptian Radio': 'Radio recitations · date not given', 'Syrian Radio': 'Radio recitations · date not given', 'Saudi Radio': 'Radio recitations · date not given'}
# spoken leads that are not enough on their own (not changed)
ANN_LEADS = [
    (('C', '0108-22'), 'highly_likely', 'Dar al-Aytam al-Islamiyya · Lebanon',
     'spoken at the start: "نستمع الآن إلى فضيلة الشيخ عبد الباسط عبد الصمد … يرتل ما تيسر من سورة آل عمران على قراءة الإمام حمزة بن حبيب الزيات الكوفي" — '
     'the same words as the Dar al-Aytam evening of the ten readings, Lebanon 1972 (X1 14), but the sound check does not show the same audio'),
    (('A', '781-'), 'possible', 'South Africa: 16 October 1966',
     'spoken at the start (an English/Arabic introduction, badly transcribed): "16 أكتوبر 1966 في مدينة … في بيطوريا" — possibly Pretoria; not clear enough'),
    (('C', '0829-'), 'override', '', ''),   # handled in OVERRIDE
]
# decisions that need both an announcement and a label: (key, prefix) -> (grade, place en, ar, area, evidence)
OVERRIDE = {
    ('B', '3 البروج 1-11 '): ('confirmed', 'Quran Radio · Cairo', 'إذاعة القرآن الكريم · القاهرة', 'egypt',
                             'spoken at the start: "إذاعة القرآن الكريم من القاهرة … سورة البروج"; the same audio is R 261 "اذاعة مصر الخمسينات" (Egyptian Radio). '
                             'Quran Radio is one of the Egyptian radio networks, so the two agree; the station named in the recording is kept'),
    ('C', '0829-'): ('confirmed', 'Damascus', 'دمشق', 'syria',
                     'spoken at the start (a radio programme of rare recordings, sent in by a listener in Cairo): "سجلت هذه التلاوة من المسجد الأموي بالجمهورية السورية"; '
                     'uploads of the same audio are labelled "المائدة والنبأ والشمس-جامع يلبغا بدمشق1957 (برنامج من التسجيلات النادرة)". Both say Damascus; '
                     'they disagree on the mosque, so only the city is taken'),
}

# ---------------------------------------------------------------------------------------------------------------------
# 3. labels of OTHER uploads on archive.org that are the same audio (labelled-uploads-check.json: 25 s windows matched against
#    the index; at least two windows confirmed, at the same offset). Each label is read for a place with these patterns.
#    (regex, place en, place ar, area)   — a country alone gives (country, '', area)
AW = '\u0621-\u064A'                     # Arabic letters: a country word must stand alone (prefixes ب و ل ف allowed)
def word(rx):
    return '(?:^|[^%s])(?:[وبلف]|من)?(?:%s)(?:$|[^%s])' % (AW, rx, AW)
EXT = [
    (r'مسجد (?:الإمام )?الحسين|El-Hussein Mosque', 'Imam al-Hussein Mosque · Cairo', 'مسجد الإمام الحسين · القاهرة', 'egypt'),
    (r'(?:مسجد|جامع) (?:الإمام )?الشافع|Shafie Mosque', 'Imam al-Shafiʿi Mosque · Cairo', 'مسجد الإمام الشافعي · القاهرة', 'egypt'),
    (r'الحامدية الشاذلية', 'Al-Hamidiya al-Shadhiliya Mosque · Cairo', 'مسجد الحامدية الشاذلية · القاهرة', 'egypt'),
    (r'مسجد (?:مصر )?المحروسة', 'Al-Mahrousa Mosque · Egypt', 'مسجد المحروسة · مصر', 'egypt'),
    (r'بالأقصر|الاقصر|الأقصر', 'Luxor', 'الأقصر', 'egypt'),
    (r'بمدينة الحوامدية|الحوامدية', 'El-Hawamdeya', 'الحوامدية', 'egypt'),
    (r'نادي الزمالك', 'Zamalek Mosque', 'مسجد الزمالك', 'egypt'),
    (r'ختمة الأرباع.*الإذاعة الم|ال[إا]ذاعة المصرية|[إا]ذاعة مصر', 'Egyptian Radio', 'الإذاعة المصرية', 'egypt'),
    (r'فهد السالم|fhdalsalm', 'Fahad al-Salem Mosque · Kuwait', 'مسجد فهد السالم · الكويت', 'kuwait'),
    (r'ثانوية ?الشويخ', 'Shuwaikh Secondary School Mosque · Kuwait', 'مسجد ثانوية الشويخ · الكويت', 'kuwait'),
    (r'الجامع الكبير بالكويت', 'Grand Mosque · Kuwait', 'المسجد الكبير · الكويت', 'kuwait'),
    (r'[إا]ذاعة الكويت|ال[إا]ذاعة الكويتية', 'Kuwait Radio', 'إذاعة الكويت', 'kuwait'),
    (r'المسجد ال[أا]مو[يى]', 'Umayyad Mosque · Damascus', 'المسجد الأموي · دمشق', 'syria'),
    (r'جامع يلبغا', 'Yalbugha Mosque · Damascus', 'مسجد يلبغا · دمشق', 'syria'),
    (r'[إا]ذاعة سوريا|ال[إا]ذاعة السورية', 'Syrian Radio', 'الإذاعة السورية', 'syria'),
    (r'[إا]ذاعة السعودية', 'Saudi Radio', 'الإذاعة السعودية', 'saudi'),
    (r'المسجد ال[أا]قص[ىي]|Masjid Al-Aqsa|_aqsa', 'Al-Aqsa Mosque', 'المسجد الأقصى', 'aqsa'),
    (r'المسجد الحرام', 'Masjid al-Haram · Makkah', 'المسجد الحرام · مكة', 'saudi'),
    (r'القصر الجمهوري بالعراق', 'Presidential Palace · Baghdad', 'القصر الجمهوري · بغداد', 'iraq'),
    (r'مسجد 14 ?رمضان', '14 Ramadan Mosque · Baghdad', 'جامع 14 رمضان · بغداد', 'iraq'),
    (r'مدينة دربن', 'Durban', 'ديربان', 'safrica'),
    (r'مسجد عمر بن الخطاب ?(?:-|ب)?\s*(?:ال)?جزائر', 'Omar ibn al-Khattab Mosque · Algeria', 'مسجد عمر بن الخطاب · الجزائر', 'algeria'),
    (word(r'الإمارات|الامارات'), 'UAE', 'الإمارات', 'uae'),
    (word(r'الهند'), 'India', 'الهند', 'india'),
    (word(r'الباكستان|باكستان'), 'Pakistan', 'باكستان', 'pakistan'),
    (word(r'الكويت|كويت'), 'Kuwait', 'الكويت', 'kuwait'),
    (word(r'العراق'), 'Iraq', 'العراق', 'iraq'),
    (word(r'قطر'), 'Qatar', 'قطر', 'qatar'),
    (word(r'سوريا')+'|tlawat surya', 'Syria', 'سوريا', 'syria'),
    (word(r'جنوب ا[فأ]ريقيا'), 'South Africa', 'جنوب أفريقيا', 'safrica'),
    (word(r'مصر'), 'Egypt', 'مصر', 'egypt'),
]
EXT = [(re.compile(rx, re.I), en, ar, area) for rx, en, ar, area in EXT]
AMBIG = re.compile(r' او | أو |\bor\b')
# labels of other uploads that name Al-Aqsa: several uploaders attribute Kuwait and UAE recordings to Al-Aqsa (their own
# notes say so), so an Al-Aqsa label alone gives only "highly likely"
WEAK_ALONE = {'Al-Aqsa Mosque'}
# a recording's own label naming its country (C/N/A series keep the country in the ID3 title)
OWN_COUNTRY = [(re.compile(word(rx)), area) for rx, area in [
    (r'الكويت|كويت', 'kuwait'), (r'مصر', 'egypt'), (r'سوريا', 'syria'), (r'العراق', 'iraq'), (r'السعودي|مكة', 'saudi'), (r'قطر', 'qatar'),
    (r'باكستان', 'pakistan'), (r'الهند', 'india'), (r'افريقيا|أفريقيا|S\.Africa', 'safrica'), (r'لبنان', 'lebanon'), (r'الاردن|الأردن|عمان', 'jordan'),
    (r'الامارات|الإمارات', 'uae'), (r'ليبيا', 'libya'), (r'المغرب', 'morocco'), (r'ماليزيا', 'malaysia'), (r'امريكا|أمريكا', 'usa'), (r'البحرين', 'bahrain'),
    (r'الاقص|الأقص', 'aqsa')]]
COUNTRY_PLACE = {'egypt': 'Egypt', 'kuwait': 'Kuwait', 'syria': 'Syria', 'iraq': 'Iraq', 'qatar': 'Qatar', 'pakistan': 'Pakistan', 'india': 'India',
                 'safrica': 'South Africa', 'uae': 'UAE', 'saudi': 'Saudi Arabia', 'algeria': 'Algeria', 'aqsa': 'Masjid al-Aqsa'}
SEC_DEFAULT = 'Public recitations · date not given'


def match_key(code, table):
    k, f = code.split(':', 2)[1:]
    for (kk, pre), *rest in table:
        if kk == k and f.startswith(pre):
            return rest
    return None


def main():
    inv = jload('investigation.json')
    meta = jload('meta.json', {})
    # the place fields as they were BEFORE this audit (re-running after the changes gives the same answer)
    bk = os.path.join(ROOT, 'data', 'backups', 'areas.before-location-audit-2026-11-24.js')
    if os.path.exists(bk):
        s = open(bk, encoding='utf-8').read(); A = json.loads(s[s.index('[{'):s.index(';\n')])
    else:
        A = areas()
    where = {}
    for a in A:
        for sc in a['secs']:
            for it in sc['items']:
                where['e:%s:%s' % (it[0], it[1])] = (a['id'], a['en'], sc['en'], it[6] or '', it[5] or '', it[4] or '')
    AEN = {a['id']: a['en'] for a in A}
    AEN['algeria'] = 'Algeria'
    U = {x['code']: x for x in inv}

    def label_of(x):
        i, name = ia(x['url'])
        f = (meta.get(i) or {}).get('files', {}).get(name) or {}
        return ' | '.join(str(f.get(k, '')) for k in ('title', 'album', 'comment') if f.get(k))

    # same audio inside the library
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

    def known_place(code):
        if code in U:
            return None
        w = where.get(code)
        if not w:
            return None
        aid, aen, sec, pen, par_, yr = w
        if not pen or pen == aen or re.search(r'not known|country not given|not named|Place unknown', pen):
            return None
        return dict(area=aid, en=pen, ar=par_, sec=sec)

    # same audio on archive.org (labelled uploads)
    ext = defaultdict(list)
    for r in jload('labelled-uploads-check.json', []):
        got = defaultdict(list)
        for w in r['windows']:
            res = w.get('res')
            if isinstance(res, dict) and res.get('level') == 'confirmed' and res['code'] in U:
                got[res['code']].append((w['t'], res['offset']))
        for code, g in got.items():
            if len(g) >= 2 and all(abs((g[i][1] - g[0][1]) - (g[i][0] - g[0][0])) < 3 for i in range(1, len(g))):
                ext[code].append(r)

    def ext_places(label):
        if AMBIG.search(label):
            return None, 'label uncertain ("or")'
        hits = []
        for rx, en, ar, area in EXT:
            if rx.search(label):
                hits.append((en, ar, area))
        if not hits:
            return None, None
        spec = [h for h in hits if h[0] not in COUNTRY_PLACE.values() and h[0] != 'UAE']
        if spec:
            # the most specific: the first pattern that matched (EXT is ordered venue → station → city → country)
            return spec[0], None
        return hits[0], None

    out, changes = [], []
    for x in inv:
        c = x['code']; key, fname = c.split(':', 2)[1:]
        lab = label_of(x)
        own_area = where[c][0]
        ev = ['own label: "%s"' % (fname + (' || ' + lab if lab else ''))[:260]]
        claims = []      # (place en, place ar, area, source, evidence, strong)
        grade, place, note = 'unknown', None, None
        # not his
        if key == 'I54' and fname.startswith('Touheed Tv'):
            ev.append('NOT A RECITATION BY THE SHEIKH: ' + NOT_HIS[('I54', 'Touheed Tv')])
            out.append(dict(n=x['n'], code=c, title=x['title'], year=x['year'], filed=x['country'], was=x['loc'], mode=x['mode'],
                            grade='not_his', place=None, evidence=ev)); continue
        # the recording's own label: the country it names (if any)
        own_countries = {area for rx, area in OWN_COUNTRY if rx.search(fname + ' ' + lab)}
        # 1. own label (hand-read)
        lr = match_key(c, LABEL)
        if lr:
            g, pen, par_, area, sec, why = lr
            ev.append(why)
            if g == 'confirmed':
                claims.append((pen, par_, area or own_area, 'own label', why, True))
            else:
                grade, place, note = g, pen, why
        elif not lr:
            for w in SPEC.findall(fname + ' ' + lab):
                if re.match(r'(اذاعة|إذاعة|الاذاعة|الإذاعة)$', w.strip()) or 'تلفزيون' in w:
                    continue
                claims.append(('"%s"' % w.strip(), '', None, 'own label', 'its own label names "%s" (not read as a place by hand)' % w.strip(), True))
                ev.append('its own label names "%s" (not read as a place by hand)' % w.strip())
        # 2. announcements
        ar_ = match_key(c, ANNOUNCED)
        if ar_:
            pen, par_, area, why = ar_
            ev.append(why); claims.append((pen, par_, area, 'announcement', why, True))
        lead = match_key(c, ANN_LEADS)
        if lead and lead[0] != 'override':
            ev.append(lead[2])
            if grade == 'unknown':
                grade, place, note = lead[0], lead[1], lead[2]
        # 3. same audio in the library
        root = find(c) if c in par else None
        if root:
            mem = sorted(members[root] - {c})
            descr = []
            for m in mem:
                kp = known_place(m)
                if kp:
                    claims.append((kp['en'], kp['ar'], kp['area'], 'same audio in the library', 'same audio as %s, labelled "%s" (%s)' % (m.split(':', 2)[2][:80], kp['en'], AEN[kp['area']]), True))
                    descr.append('%s [%s / %s]' % (m[:70], AEN[kp['area']], kp['en']))
                elif m in U:
                    mlab = label_of(U[m])
                    descr.append('%s [audited, filed: %s]' % (m[:70], U[m]['country']))
                    oc = {area for rx, area in OWN_COUNTRY if rx.search(m.split(':', 2)[2] + ' ' + mlab)}
                    for area in oc:
                        claims.append((COUNTRY_PLACE.get(area, AEN.get(area, area)), '', area, 'label of an audited copy', 'its copy %s is labelled with the country %s' % (m.split(':', 2)[2][:60], AEN.get(area, area)), False))
                    lr2 = match_key(m, LABEL)
                    if lr2 and lr2[0] == 'confirmed':
                        claims.append((lr2[1], lr2[2], lr2[3] or where[m][0], 'label of an audited copy', 'its copy %s: %s' % (m.split(':', 2)[2][:50], lr2[5][:120]), True))
                    sp = SPEC.findall(m.split(':', 2)[2] + ' ' + mlab)
                    for w in sp:
                        claims.append(('"%s"' % w.strip(), '', None, 'label of an audited copy', 'its copy %s names "%s"' % (m.split(':', 2)[2][:60], w.strip()), True))
            ev.append('same audio (landmark line fit over the whole length) as: ' + '; '.join(descr)[:900])
        # 4. same audio on archive.org
        for r in ext.get(c, []):
            pl, why = ext_places(r['label'])
            q = '"%s" (archive.org/%s)' % (r['label'][:150], r['item'][:50])
            if why:
                ev.append('same audio on archive.org, ' + why + ': ' + q); continue
            if not pl:
                ev.append('same audio on archive.org, label names no place: ' + q); continue
            ev.append('same audio on archive.org, labelled ' + q)
            countryonly = pl[0] in COUNTRY_PLACE.values() or pl[0] == 'UAE'
            claims.append((pl[0], pl[1], pl[2], 'same audio on archive.org', 'same audio as the archive.org upload ' + q, not countryonly))
        # television (type only)
        tv = re.search(TV, fname + ' ' + lab)
        if tv:
            ev.append('own label names the type, not the place: "%s" (a TV broadcast)' % tv.group(0))
        # ---- decide ----
        ov = OVERRIDE.get((key, next((p for (k, p) in OVERRIDE if k == key and fname.startswith(p)), None)))
        if ov:
            g, pen, par_, area, why = ov
            ev.append(why)
            grade, place = g, dict(en=pen, ar=par_, area=area, why=why)
        elif claims:
            spec = [cl for cl in claims if cl[5]]
            cc = [cl for cl in claims if not cl[5]]
            spec_places = {cl[0] for cl in spec}
            areas_claimed = {cl[2] for cl in claims if cl[2]}
            # the filed country counts only where the recording's own label names it (or the place came from that label)
            own = own_countries | ({lr[3] or own_area} if lr and lr[0] == 'confirmed' else set())
            own -= {'unknown', 'radio_unknown'}
            # a place word quoted from a label agrees with a named place that contains it ("بور سعيد" / "بورسعيد")
            norm = lambda t: re.sub(r'[\s"]', '', t).replace('أ', 'ا').replace('إ', 'ا').replace('ى', 'ي')
            named = [cl for cl in claims if cl[5] and not cl[0].startswith('"')]
            claims = [cl for cl in claims if not (cl[0].startswith('"') and any(norm(cl[0]) in norm(n[1] + n[0]) or
                      any(len(t) > 2 and norm(t) in norm(n[1]) for t in cl[0].strip('"').split() if t not in ('مسجد', 'جامع', 'حي', 'من')) for n in named))]
            spec = [cl for cl in claims if cl[5]]
            spec_places = {cl[0] for cl in spec}
            areas_claimed = {cl[2] for cl in claims if cl[2]}
            conflict = []
            if len(spec_places) > 1:
                conflict.append('places: ' + ', '.join(sorted(spec_places)))
            if len(areas_claimed) > 1:
                conflict.append('countries: ' + ', '.join(sorted(AEN.get(a, a) for a in areas_claimed)))
            if own and areas_claimed and not (areas_claimed <= own or (own & areas_claimed and len(areas_claimed) == 1)):
                conflict.append('its own label says %s' % ', '.join(sorted(AEN.get(a, a) for a in own)))
            # filed under a country its own label does not name: moving it needs two independent kinds of evidence
            if not own and own_area not in ('unknown', 'radio_unknown', 'home', 'lost') and areas_claimed and own_area not in areas_claimed:
                if len({cl[3] for cl in claims}) < 2:
                    conflict.append('it is filed under %s; the only evidence for %s is one kind of source' % (AEN[own_area], ', '.join(sorted(AEN.get(a, a) for a in areas_claimed))))
            if conflict:
                ev.append('CONFLICT (%s): nothing changed' % '; '.join(conflict))
                if grade == 'unknown':
                    grade = 'possible'
                    place = dict(en=' or '.join(sorted(spec_places | {AEN.get(a, a) for a in areas_claimed})), why='the evidence disagrees')
            else:
                if spec:
                    pen, par_, area = spec[0][0], spec[0][1], spec[0][2]
                    sources = {cl[3] for cl in spec}
                    why = '; '.join(dict.fromkeys(cl[4] for cl in spec))
                    g = 'confirmed'
                    if pen in WEAK_ALONE and sources == {'same audio on archive.org'}:
                        g = 'highly_likely'
                        why += ' — an Al-Aqsa label on another upload only (such attributions are disputed elsewhere), so not changed'
                    if pen.startswith('"'):
                        g = 'possible'
                    if pen.startswith('Shared khatma'):
                        g = 'possible'; why = 'same audio as part of the shared khatma of the early 1950s: left where it is (' + why + ')'
                elif cc and own_area in ('unknown', 'radio_unknown'):
                    area = cc[0][2]; pen = COUNTRY_PLACE.get(area, AEN.get(area)); par_ = cc[0][1]
                    why = '; '.join(dict.fromkeys(cl[4] for cl in cc)) + ' (the country only: the venue is not named)'
                    g = 'confirmed'
                else:
                    g = None
                if g:
                    if grade in ('unknown', 'possible', 'highly_likely') or g == 'confirmed':
                        grade = g
                        place = dict(en=pen, ar=par_, area=area, why=why)
        rec = dict(n=x['n'], code=c, title=x['title'], year=x['year'], filed=x['country'], was=x['loc'], mode=x['mode'], grade=grade,
                   place=(place or {}).get('en') if isinstance(place, dict) else place, evidence=ev)
        if grade in ('possible', 'highly_likely') and note and not isinstance(place, dict):
            rec['place'] = place
        out.append(rec)
        if grade == 'confirmed':
            w = where[c]
            area = place['area'] if place['area'] and place['area'] != own_area else None
            sec = None
            if area:
                sec = ANN_RADIO.get(place['en']) or SEC_DEFAULT
                if own_area == 'radio_unknown':      # filed as a radio recording: it stays one (as broadcast), in its new country
                    sec = 'Radio recitations · date not given'
                yr = str(x['year'] or '')
                m = re.match(r'(19\d)\d', yr)
                if m and not ANN_RADIO.get(place['en']) and own_area != 'radio_unknown':
                    dec = 'Public recitations %s0s' % m.group(1)
                    if any(sc['en'] == dec for a in A if a['id'] == area for sc in a['secs']):
                        sec = dec
            countryonly = place['en'] in COUNTRY_PLACE.values() or place['en'] == 'UAE'
            changes.append(dict(code=c, key=key, file=fname, area=area, sec=sec, en=('' if countryonly else place['en']),
                                ar=('' if countryonly else place['ar']), was='%s / %s' % (w[1], w[3] or '(none)'), evidence=place['why'],
                                country_only=countryonly))
        elif tv and grade == 'unknown' and not where[c][3]:
            changes.append(dict(code=c, key=key, file=fname, area=None, sec=None, en='TV · channel and country not given',
                                ar='تلفزيون · القناة والبلد غير مذكورين', was='%s / %s' % (where[c][1], where[c][3] or '(none)'),
                                evidence='own label: "%s" — the type is known (television), the place is not' % tv.group(0), type_only=True))
            rec['type'] = 'tv'
    json.dump(out, open(os.path.join(RES, 'audit.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    json.dump(changes, open(os.path.join(RES, 'audit-changes.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    from collections import Counter
    print(Counter(r['grade'] for r in out), len(changes), 'changes (', sum(1 for c in changes if c.get('type_only')), 'type only,',
          sum(1 for c in changes if c.get('country_only')), 'country only )')


if __name__ == '__main__':
    main()
