"""Corrections to recording places in data/areas.js, each backed by the recording's own source label (its file name).

  python3 tools/library/organise.py            # dry run: prints every change
  python3 tools/library/organise.py --apply    # writes data/areas.js (a backup is made first) and the change log

Nothing is deleted and no recording ID (collection key + file name), title, year or link changes. Only:
  * MOVES: recordings filed under the wrong country, where the file name names the right one;
  * PLACES: a more exact place (a named mosque, radio station or venue) where the file name names it and the place
    field only had the country or city.
The country/location archive (js/library.js) is built from these place fields at run time.
"""
import json, os, re, sys, shutil
from collections import Counter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
AREAS_JS = os.path.join(ROOT, 'data', 'areas.js')

# (file-name prefix, collection key) -> (new country, new section en/ar or None to keep the type, place en, place ar, evidence)
SEC = {
    'iraq60': ('Public recitations 1960s', 'تلاوات خارجية الستينيات'),
    'iraq70': ('Public recitations 1970s', 'تلاوات خارجية السبعينيات'),
    'egyptND': ('Public recitations · date not given', 'تلاوات خارجية · بدون تاريخ'),
    'kuwait60': ('Public recitations 1960s', 'تلاوات خارجية الستينيات'),
    'qatarRadio': ('Radio recitations · date not given', 'تلاوات إذاعية · بدون تاريخ'),
    'syriaLost': ('Lost recitations', 'تلاوات مفقودة'),
    'egypt70': ('Public recitations 1970s', 'تلاوات خارجية السبعينيات'),
    'syriaND': ('Public recitations · date not given', 'تلاوات خارجية · بدون تاريخ'),
    'egyptRadioND': ('Radio recitations · date not given', 'تلاوات إذاعية · بدون تاريخ'),
    'saudiND': ('Public recitations · date not given', 'تلاوات خارجية · بدون تاريخ'),
    'safricaND': ('Public recitations · date not given', 'تلاوات خارجية · بدون تاريخ'),
    'kuwaitND': ('Public recitations · date not given', 'تلاوات خارجية · بدون تاريخ'),
    'aqsaND': ('Public recitations · date not given', 'تلاوات خارجية · بدون تاريخ'),
}
PAL_EN, PAL_AR = 'Presidential Palace · Baghdad', 'القصر الجمهوري · بغداد'
R14_EN, R14_AR = '14 Ramadan Mosque · Baghdad', 'جامع 14 رمضان · بغداد'
MOVES = [
    # the "Presidential Palace 1964" series: the file names say Baghdad / Iraq, and the collection numbers them -4- (Iraq)
    ('X2', '195-4-1 ', 'iraq', 'iraq60', PAL_EN, PAL_AR, 'file name: "القصر الجمهوري 1964 العراق"'),
    ('I14', '03-4-1 ', 'iraq', 'iraq60', PAL_EN, PAL_AR, 'file name: "القصر الجمهوري بغداد 1964"'),
    ('I19', '05-4-1 ', 'iraq', 'iraq60', PAL_EN, PAL_AR, 'file name: "من تلاوات القصر الجمهوري بالعراق 1964"'),
    ('I27', '11-4-1 ', 'iraq', 'iraq60', PAL_EN, PAL_AR, 'file name: "القصر الجمهوري 1964", collection number -4- (Iraq), same series'),
    ('X1', '135-4-2 ', 'iraq', 'iraq60', PAL_EN, PAL_AR, 'file name: "من القصر الجمهوري 1964", collection number -4- (Iraq), same series'),
    # the al-Khudairi funeral recitations, Baghdad 1977 (filed under Kuwait)
    ('X1', '69-4-4 ', 'iraq', 'iraq70', R14_EN, R14_AR, 'file name: "عزاء ناجي الخضيري - مسجد 14 رمضان بغداد 1977"'),
    ('X4', '480-4-1 ', 'iraq', 'iraq70', R14_EN, R14_AR, 'file name: "عزاء آل الخضيري - مسجد 14 رمضان 1977 بغداد"'),
    ('X5', '533-4-1 ', 'iraq', 'iraq70', R14_EN, R14_AR, 'file name: "عزاء آل الخضيري - جامع 14 رمضان 1977", collection number -4- (Iraq)'),
    ('X5', '622-4-2 ', 'iraq', 'iraq70', R14_EN, R14_AR, 'file name: "عزاء آل الخضيري 1977 مسجد 14 رمضان - العراق"'),
    ('X3', '398-4-1 ', 'iraq', 'iraq70', R14_EN, R14_AR, 'file name: "مجلس عزاء آل الخضيري 1977 جامع 14 رمضان ببغداد"'),
    ('X5', '569-4-2 ', 'iraq', 'iraq70', 'Baghdad', 'بغداد', 'file name: "عزاء آل الخضيري 1977 بغداد" (no mosque named)'),
    ('X6', '700-4-1 ', 'iraq', 'iraq70', 'Baghdad', 'بغداد', 'file name: "ختام عزاء الخضيري 1977 بغداد" (no mosque named)'),
    # filed under Saudi Arabia; the file names the Sayyida Zaynab Mosque, collection number -1- (Egypt)
    ('X3', '396-1-14', 'egypt', 'egyptND', 'Sayyida Zaynab Mosque · Cairo', 'مسجد السيدة زينب · القاهرة', 'file name: "مسجد السيدة زينب", collection number -1- (Egypt)'),
    # filed under Egypt; the file name says "in one of the East Asian countries"
    ('X5', '606-7-1', 'unknown', None, 'An East Asian country (not named)', 'إحدى دول شرق آسيا (غير مسماة)', 'file name: "من فترة الخمسينات في احدى دول شرق اسيا"'),
    # had no place; the file names say Kuwait in the 1960s
    ('X1', '79-5-02 ', 'kuwait', 'kuwait60', 'Kuwait', 'الكويت', 'file name: "كويت في الستينات"'),
    ('X1', '110-5-2 ', 'kuwait', 'kuwait60', 'Kuwait', 'الكويت', 'file name: "كويت في الستينات"'),
    # had no place; the file name says Qatar Radio
    ('I4', 'اذاعة قطر', 'qatar', 'qatarRadio', 'Qatar Radio', 'إذاعة قطر', 'file name: "اذاعة قطر"'),
    # no country given; the same audio (by fingerprint, whole length) as "Al-Salihin Mosque" A 426 (Egypt) and the
    # Al-Salihin Mosque, Cairo 1978 recording; its own label: Friday 24-3-1978
    ('X1', '168-1-1 ', 'egypt', 'egypt70', 'Al-Salihin Mosque · Cairo', 'مسجد الصالحين · القاهرة', 'same audio as A 426 "Al-Salihin Mosque" (Egypt) and E "مسجد الصالحين القاهرة مصر 1978", by fingerprint'),
    # a lost-recitation fragment whose file name says it is from Syria
    ('B', '5 التوبة 18-26', 'syria', 'syriaLost', 'Syria', 'سوريا', 'file name: "من تلاوات سوريا"'),
]
# a more exact place from the file name, only where the place field is just the country or a city:
# (country, current places allowed, regex on the file name, place en, place ar)
PLACES = [
    ('egypt', {'Egypt'}, r'(?:ا|إ)ل?(?:ا|إ)?ذاعة المصرية|الإذاعة المصري', 'Egyptian Radio', 'الإذاعة المصرية'),
    ('egypt', {'Egypt'}, r'مسجد الإمام الشافع', 'Imam al-Shafiʿi Mosque · Cairo', 'مسجد الإمام الشافعي · القاهرة'),
    ('egypt', {'Egypt'}, r'مسجد المحروسة', 'Al-Mahrousa Mosque · Egypt', 'مسجد المحروسة · مصر'),
    ('egypt', {'Egypt'}, r'مسجد خالد بن الوليد', 'Khalid ibn al-Walid Mosque · Egypt', 'مسجد خالد بن الوليد · مصر'),
    ('egypt', {'Egypt'}, r'مسجد سلامة الراضي', 'Salama al-Radi Mosque · Egypt', 'مسجد سلامة الراضي · مصر'),
    ('egypt', {'Egypt'}, r'مسجد محمد ?فرج', 'Mohamed Farag Mosque · Egypt', 'مسجد محمد فرج · مصر'),
    ('egypt', {'Cairo'}, r'إذاعة القاهرة', 'Radio Cairo', 'إذاعة القاهرة'),
    ('egypt', {'Cairo'}, r'مسجد احمد ?الرفاعي', 'Al-Rifaʿi Mosque · Cairo', 'مسجد الرفاعي · القاهرة'),
    ('egypt', {'Cairo'}, r'مسجد الصالحين', 'Al-Salihin Mosque · Cairo', 'مسجد الصالحين · القاهرة'),
    ('egypt', {'Cairo'}, r'ميدان الخليفة', 'Al-Khalifa Square · Cairo', 'ميدان الخليفة · القاهرة'),
    ('egypt', {'Cairo'}, r'المنيل', 'El-Manial · Cairo', 'المنيل · القاهرة'),
    ('egypt', {'Cairo'}, r'جامعة القاهرة', 'Cairo University', 'جامعة القاهرة'),
    ('egypt', {'Suez'}, r'مسجد أبو عبدالله الغريب', 'Abu Abdullah al-Gharib Mosque · Suez', 'مسجد أبو عبد الله الغريب · السويس'),
    ('egypt', {'Sharqia'}, r'مسجد السلام', 'Al-Salam Mosque · Sharqia', 'مسجد السلام · الشرقية'),
    ('egypt', {'Monufia'}, r'مسجد الشيخ البنا', 'Sheikh al-Banna Mosque · Monufia', 'مسجد الشيخ البنا · المنوفية'),
    # "مسجد القناني" in Qena: the existing Abd al-Rahim al-Qinawi Mosque, misspelt in the file name
    ('egypt', {'Qena'}, r'مسجد القناني', 'Abd al-Rahim al-Qinawi Mosque · Qena', 'مسجد عبد الرحيم القنائي · قنا'),
    ('iraq', {'Iraq'}, r'الجامع الصفوي بالكاظمية', 'Al-Safawi Mosque · Kadhimiya, Baghdad', 'الجامع الصفوي · الكاظمية، بغداد'),
    ('iraq', {'Iraq'}, r'القصر الحمهوري بغداد|القصر الرئاسي في العراق', PAL_EN, PAL_AR),
    ('iraq', {'Iraq'}, r'مسجد 14 ?رمضان|جامع 14 ?رمضان', R14_EN, R14_AR),
    ('iraq', {'Iraq'}, r'الكاظمية', 'Kadhimiya · Baghdad', 'الكاظمية · بغداد'),
    ('iraq', {'Iraq'}, r'ببغداد|بغداد', 'Baghdad', 'بغداد'),
    ('jordan', {'Jordan'}, r'المسجد الحسيني', 'Al-Husseini Mosque · Amman', 'المسجد الحسيني · عمّان'),
    ('kuwait', {'Kuwait'}, r'مسجد السوق', 'Souq Mosque · Kuwait', 'مسجد السوق · الكويت'),
    ('kuwait', {'Kuwait'}, r'مسجد فهد ?السالم', 'Fahad al-Salem Mosque · Kuwait', 'مسجد فهد السالم · الكويت'),
    ('kuwait', {'Kuwait'}, r'مسجد ?السالم', 'Al-Salem Mosque · Kuwait', 'مسجد السالم · الكويت'),
    ('qatar', {'Qatar'}, r'المسجد ?الكبير', 'Grand Mosque · Doha', 'المسجد الكبير · الدوحة'),
    ('saudi', {'Saudi Arabia'}, r'إذاعة جده|اذاعة جدة', 'Jeddah Radio', 'إذاعة جدة'),
    ('syria', {'Syria'}, r'اذاعة سوريا', 'Syrian Radio', 'الإذاعة السورية'),
    ('syria', {'Syria', 'Damascus'}, r'جامع عبدالله بن رواحة', 'Abdullah ibn Rawaha Mosque · Damascus', 'جامع عبد الله بن رواحة · دمشق'),
    ('syria', {'Hama'}, r'الجامع الاعلى', 'Al-Jamiʿ al-Aʿla · Hama', 'الجامع الأعلى · حماة'),
    ('syria', {'Hama'}, r'مسجد السلطان', 'Al-Sultan Mosque · Hama', 'مسجد السلطان · حماة'),
    ('syria', {'Damascus'}, r'مسجد يلبغا', 'Yalbugha Mosque · Damascus', 'مسجد يلبغا · دمشق'),
    ('syria', {'Homs'}, r'مسجد ?خالد بن الوليد', 'Khalid ibn al-Walid Mosque · Homs', 'مسجد خالد بن الوليد · حمص'),
    ('uae', {'Abu Dhabi · UAE', 'UAE'}, r'مسجد زايد ?بن سلطان', 'Zayed bin Sultan Mosque · Abu Dhabi', 'مسجد زايد بن سلطان · أبوظبي'),
    ('uae', {'Abu Dhabi · UAE', 'UAE'}, r'المسجد الكبير|مسجد ابوظبي الكبير', 'Grand Mosque · Abu Dhabi', 'المسجد الكبير · أبوظبي'),
    ('usa', {'United States'}, r'مسجد ?الهد(?:ى|ي)', 'Al-Huda Mosque · United States', 'مسجد الهدى · الولايات المتحدة'),
    # recordings whose country is not known but whose venue or station is named
    ('unknown', {'', 'Place unknown'}, r'مسجد التوبة', 'Al-Tawba Mosque (country not given)', 'مسجد التوبة (البلد غير مذكور)'),
    ('unknown', {'', 'Place unknown'}, r'مسجد المغفرة', 'Al-Maghfira Mosque (country not given)', 'مسجد المغفرة (البلد غير مذكور)'),
    ('unknown', {'', 'Place unknown'}, r'مسجد الصالحين', 'Al-Salihin Mosque (country not given)', 'مسجد الصالحين (البلد غير مذكور)'),
    ('unknown', {'', 'Place unknown'}, r'مسجد الشهيد صلاح عشماوي', 'Martyr Salah Ashmawi Mosque (country not given)', 'مسجد الشهيد صلاح عشماوي (البلد غير مذكور)'),
    ('radio_unknown', {''}, r'إذاعة الجمهورية العربية المتحدة', 'Radio of the United Arab Republic', 'إذاعة الجمهورية العربية المتحدة'),
    ('radio_unknown', {''}, r'اذاعة القران', 'Quran Radio (country not given)', 'إذاعة القرآن (البلد غير مذكور)'),
]


# one place written with and without its city: (country, place as written, place as kept, Arabic, evidence)
SAME_PLACE = [
    ('egypt', 'Al-Salihin Mosque', 'Al-Salihin Mosque · Cairo', 'مسجد الصالحين · القاهرة', 'A 426 is the same audio as the "مسجد الصالحين القاهرة مصر 1978" recording (fingerprint)'),
    ('egypt', 'Al-Rifaʿi Mosque', 'Al-Rifaʿi Mosque · Cairo', 'مسجد أحمد الرفاعي · القاهرة', 'both labels: "مسجد أحمد الرفاعي"; the other names Cairo'),
    ('egypt', 'Sheikh al-Banna Mosque', 'Sheikh al-Banna Mosque · Monufia', 'مسجد الشيخ البنا · المنوفية', 'same mosque name in Egypt; the other label names Monufia'),
    ('egypt', 'Sinan Pasha Mosque', 'Sinan Pasha Mosque · Bulaq', 'مسجد سنان باشا · بولاق', 'same mosque name in Egypt; the other label names Bulaq'),
]


# places from a copy of the SAME AUDIO (sound check reports in tools/fingerprint/reports/, "duplicate" verdicts) whose own
# label names the venue or station, where ours only names the country or nothing, and the country agrees:
# (key, file-name prefix, new country or None to keep, section key or None, place en, place ar, evidence)
SAME_AUDIO = [
    ('C', '1113-', 'syria', 'syriaND', 'Umayyad Mosque · Damascus', 'المسجد الأموي · دمشق', 'same audio as "المسجد الأموي بسوريا" (AbdAlbasit_Syria-Tilawat_quran)'),
    ('C', '0418-', 'egypt', 'egyptND', 'Egypt', 'مصر', 'same audio as "مسجد سلامة الرضي 1962 - او الشافعي" (5323411962); the label is unsure of the mosque, so only the country is taken'),
    ('R', '15--', 'egypt', 'egyptRadioND', 'Egyptian Radio', 'الإذاعة المصرية', 'same audio as "سورة الأحقاف 1-18 الإذاعة المصرية 1956" (1-18-1956)'),
    ('C', '0934-', 'saudi', 'saudiND', 'Masjid al-Haram · Makkah', 'المسجد الحرام · مكة', 'same audio as three uploads labelled "النور - المسجد الحرام - مكة المكرمة" (E, N2 339, …)'),
    ('X3', '401-5-3', None, None, 'Fahad al-Salem Mosque · Kuwait', 'مسجد فهد السالم · الكويت', 'same audio as "الفرقان تلاوة فجر من الكويت مسجد فهد السالم عام 1974" (15611974)'),
    ('C', '0774-', None, None, 'Yalbugha Mosque · Damascus', 'مسجد يلبغا · دمشق', 'same audio as "الكهف و قصار السور مسجد يلبغا بدمشق - 1956" (two uploads; that label says 1956, ours 1957)'),
    ('X2', '226-2-1', None, None, 'Bab Musalla Grand Mosque · Damascus', 'مسجد باب مصلى الكبير · دمشق', 'same audio as "ابراهيم مسجد باب مصلى الكبير عام 1952" (two uploads)'),
    ('C', '1123-', 'safrica', 'safricaND', 'Grand Mosque · Johannesburg', 'المسجد الكبير · جوهانسبرغ', 'same audio as "القصص والحاقة والقدر المسجد الكبير بجوهانسبرغ عام 1966" (0010011960)'),
    ('C', '0154-2', 'kuwait', 'kuwaitND', 'Fahad al-Salem Mosque · Kuwait', 'مسجد فهد السالم · الكويت', 'same audio as "ما يتيسر من سورة الانعام من مسجد فهد السالم عام 1974" (15611974)'),
    ('C', '0830-2', 'aqsa', 'aqsaND', 'Al-Aqsa Mosque', 'المسجد الأقصى', 'same audio as "المائدة والمزمل - المسجد الاقصى 1964" (E, and another upload)'),
    ('C', '0436-3', None, None, 'Al-Azhar Mosque · Cairo', 'الجامع الأزهر · القاهرة', 'same audio as "سورة الحجرات - 1978م - ( مسجد الأزهر - مصر" (Tilawat-kharijiya)'),
    ('N2', '279.mp3', None, None, 'Shuwaikh Secondary School Mosque · Kuwait', 'مسجد ثانوية الشويخ · الكويت', 'same audio as "المائدة 57-66 مسجد ثانوية الشويخ 1964 الكويت" (X1 117)'),
    ('N2', '282.mp3', None, None, 'Shuwaikh Secondary School Mosque · Kuwait', 'مسجد ثانوية الشويخ · الكويت', 'same audio as "المائدة 77-89 مسجد ثانوية الشويخ 1964 الكويت" (X1 119)'),
    ('N2', '320.mp3', None, None, 'Shuwaikh Secondary School Mosque · Kuwait', 'مسجد ثانوية الشويخ · الكويت', 'same audio as "النساء 80-91 مسجد ثانويةالشويخ 1964 الكويت" (X1 90)'),
    ('N2', '327.mp3', None, None, 'Shuwaikh Secondary School Mosque · Kuwait', 'مسجد ثانوية الشويخ · الكويت', 'same audio as "النساء 126-135 مسجد ثانويةالشويخ 1964 الكويت" (X1 94)'),
    ('I8', '00025.mp3', None, None, 'Shuwaikh Secondary School Mosque · Kuwait', 'مسجد ثانوية الشويخ · الكويت', 'same audio as "النساء 113-125 مسجد ثانويةالشويخ 1964 الكويت" (X1 93)'),
    ('I8', '00035.mp3', None, None, 'Al-Salem Mosque · Kuwait', 'مسجد السالم · الكويت', 'same audio as "القمر49-55-الرحمن1-69 من مسجد السالم 1974 الكويت" (X5 572)'),
    ('C', '0060-5', None, None, 'Al-Othman Mosque · Kuwait', 'مسجد العثمان · الكويت', 'same audio as "ابراهيم مسجد العثمان بالكويت" (E)'),
    ('A', '772-rad', None, None, 'Grand Mosque · Doha', 'المسجد الكبير · الدوحة', 'same audio as "الرعد 1-16 منتصف الثمانينات من المسجد الكبير في قطر" (X2 218)'),
    ('A', '744.mp3', None, None, 'Al-Atiq Mosque · Benghazi', 'المسجد العتيق · بنغازي', 'same audio as "الاسراء1-14 المسجد العتيق في بنغازي 1968 - ليبيا" (X2 276; that label says 1968, ours 1972)'),
    ('C', '0769-1', None, None, 'Umayyad Mosque · Damascus', 'المسجد الأموي · دمشق', 'same audio as "الكهف وقصار السور - المسجد الأموي - سوريا" (N2 263)'),
    ('C', '0969-4', None, None, 'Atef al-Sadat Mosque (country not given)', 'مسجد عاطف السادات (البلد غير مذكور)', 'same audio as "الواقعة 10-70 مسجلة من مسجد عاطف السادات" (X5 611)'),
] + [(k, f, None, None, 'Saudi Radio', 'الإذاعة السعودية', 'same audio as the Saudi radio uploads "%s" (R)' % lab) for k, f, lab in [
    ('B', '2-1 القصص 5-24', 'اذاعة السعودية الخمسينات - القصص 5-24'), ('B', '3-1 الملك1-30', 'اذاعة السعودية الستينات - الملك 1-30 والقدر'),
    ('B', '7 ال عمران 33-78', 'اذاعة السعودية الستينات - آل عمران 33-78'), ('B', '8 البقرة  183-188', 'اذاعة السعودية الخمسينات - البقرة 183-188'),
    ('B', '1-2 الواقعة 1-26', 'اذاعة السعودية الخمسينات - الواقعة 1-26'), ('C', '0001-', 'اذاعة السعودية الستينات - الكهف 1-31')]
] + [(k, f, None, None, 'Syrian Radio', 'الإذاعة السورية', 'same audio as the Syrian radio upload "%s" (R)' % lab) for k, f, lab in [
    ('B', '3 الصف 1-14', 'اذاعة سوريا - الصف 1-14 والجمعة 1-5'), ('B', '2 الصف 1-14', 'اذاعة سوريا - الصف 1-14 والجمعة 1-11'),
    ('B', '3-1 المؤمنون 1-44', 'اذاعة سوريا - المؤمنون 1-44'), ('B', '2-1  يس 1-40', 'اذاعة سوريا - يس 1-40'), ('B', '2 الفتح 1-27', 'اذاعة سوريا - الفتح 1-27'),
    ('B', '6 النمل 15- 44', 'اذاعة سوريا - النمل 15-44'), ('B', '1 الروم 1-28', 'اذاعة سوريا - الروم 1-28'), ('B', '3 الشعراء 1-68', 'اذاعة سوريا - الشعراء 1-68'),
    ('B', '4-1 مريم 1-52', 'اذاعة سوريا - مريم 1-52')]
]
# same audio, but the copy's label disagrees with ours (country or year): nothing changed, listed for review
SAME_AUDIO_CONFLICTS = [
    ('C 0795-3, Al-Māʾidah, Kuwait 1974', 'a copy is labelled "سورة المائدة - ( المسجد الاقصى" (Al-Aqsa)'),
    ('C 0059-4, Ibrāhīm, Pakistan 1980s', 'a copy is labelled "ابراهيم من المسجد الاقصي" (Al-Aqsa)'),
    ('A 346, An-Nisāʾ · Al-Māʾidah, Kuwait 1973', 'a copy is labelled "المائدة 5-13 مسجد ثانوية الشويخ 1964" (1964)'),
    ('A 345, An-Nisāʾ, Kuwait 1974', 'a copy is labelled "النساء 46-59 مسجد ثانويةالشويخ 1964" (1964)'),
    ('B 1-1 Al-Ḥajj 1-29, "من تلاوات سوريا"', 'a copy is labelled "اذاعة مصر الخمسينات - الحج 1-29" (Egyptian Radio)'),
    ('B 11 Āl ʿImrān 75-96, "من تلاوات سوريا"', 'a copy is labelled "اذاعة مصر الخمسينات - آل عمران 75-96" (Egyptian Radio)'),
    ('B 1-1 Al-ʿAnkabūt 1-32, "من تلاوات سوريا"', 'a copy is labelled "اذاعة مصر الخمسينات - العنكبوت 1-32" (Egyptian Radio)'),
    ('B 1 Az-Zukhruf 29-63, "تلاوات السعودية"', 'a copy is labelled "اذاعة مصر الستينات - الزخرف 24-63" (Egyptian Radio)'),
    ('I45 Al-Isrāʾ 1-98 (place not known)', 'parts match a Syrian radio upload and an Egyptian radio upload'),
]


def load():
    s = open(AREAS_JS, encoding='utf-8').read()
    i, j = s.index('[{'), s.index(';\n')
    return s, i, j, json.loads(s[i:j])


def main(apply):
    s, i, j, A = load()
    AREA = {a['id']: a for a in A}
    before = Counter('%s:%s' % (it[0], it[1]) for a in A for sc in a['secs'] for it in sc['items'])
    log = []
    # moves
    for key, pre, to, seck, pen, par, why in MOVES:
        hit = [(a, sc, it) for a in A for sc in a['secs'] for it in sc['items'] if it[0] == key and it[1].startswith(pre)]
        if len(hit) != 1:
            print('!! move not found exactly once:', key, pre, len(hit)); continue
        a, sc, it = hit[0]
        old = (a['en'], sc['en'], it[6])
        if a['id'] == to and it[6] == pen:
            continue
        sc['items'].remove(it)
        it[5], it[6] = par, pen
        dest = AREA[to]
        if seck is None:    # Place unknown: filed by its first surah, as that area is
            from_unknown = [x for x in dest['secs'] if x['en'].startswith('Sūrah ') and x['en'][6:] in it[3]]
            tsec = from_unknown[0] if from_unknown else dest['secs'][-1]
        else:
            en, ar = SEC[seck]
            tsec = next((x for x in dest['secs'] if x['en'] == en), None)
            if not tsec:
                tsec = {'en': en, 'ar': ar, 'items': []}; dest['secs'].append(tsec)
        tsec['items'].append(it)
        log.append(dict(kind='moved', rec='%s:%s' % (it[0], it[1]), title=it[3], year=it[4], was='%s / %s / %s' % old, now='%s / %s / %s' % (dest['en'], tsec['en'], pen), evidence=why))
    # more exact places
    for aid, allowed, rx, pen, par in PLACES:
        for sc in AREA[aid]['secs']:
            for it in sc['items']:
                if it[6] in allowed and re.search(rx, it[1]):
                    log.append(dict(kind='place', rec='%s:%s' % (it[0], it[1]), title=it[3], year=it[4], was=it[6] or '(none)', now=pen, evidence='file name: "%s"' % re.search(rx, it[1]).group(0)))
                    it[5], it[6] = par, pen
    for key, pre, to, seck, pen, par, why in SAME_AUDIO:
        hit = [(a, sc, it) for a in A for sc in a['secs'] for it in sc['items'] if it[0] == key and it[1].startswith(pre)]
        if len(hit) != 1:
            print('!! same-audio entry not found exactly once:', key, pre, len(hit)); continue
        a, sc, it = hit[0]
        if it[6] == pen and (to is None or a['id'] == to):
            continue
        was = '%s / %s' % (a['en'], it[6] or '(none)')
        it[5], it[6] = par, pen
        if to and to != a['id']:
            sc['items'].remove(it)
            en, ar = SEC[seck]
            dest = AREA[to]
            tsec = next((x for x in dest['secs'] if x['en'] == en), None)
            if not tsec:
                tsec = {'en': en, 'ar': ar, 'items': []}; dest['secs'].append(tsec)
            tsec['items'].append(it)
            log.append(dict(kind='moved', rec='%s:%s' % (it[0], it[1]), title=it[3], year=it[4], was=was, now='%s / %s' % (dest['en'], pen), evidence=why))
        else:
            log.append(dict(kind='place', rec='%s:%s' % (it[0], it[1]), title=it[3], year=it[4], was=was, now=pen, evidence=why))
    for aid, was, now, ar, why in SAME_PLACE:
        for sc in AREA[aid]['secs']:
            for it in sc['items']:
                if it[6] == was:
                    log.append(dict(kind='place', rec='%s:%s' % (it[0], it[1]), title=it[3], year=it[4], was=was, now=now, evidence=why))
                    it[5], it[6] = ar, now
    for a in A:
        a['secs'] = [sc for sc in a['secs'] if sc['items']]
    after = Counter('%s:%s' % (it[0], it[1]) for a in A for sc in a['secs'] for it in sc['items'])
    assert before == after, 'recordings changed!'
    for x in log:
        print('%-6s %-48s %s -> %s   [%s]' % (x['kind'], x['title'][:48], x['was'], x['now'], x['evidence'][:70]))
    print(len([x for x in log if x['kind'] == 'moved']), 'moved,', len([x for x in log if x['kind'] == 'place']), 'places made exact;', sum(after.values()), 'recordings, all kept')
    if apply:
        bk = os.path.join(ROOT, 'data', 'backups', 'areas.before-locations-2026-11-24.js')
        if not os.path.exists(bk):
            shutil.copy(AREAS_JS, bk)
        open(AREAS_JS, 'w', encoding='utf-8').write(s[:i] + json.dumps(A, ensure_ascii=False, separators=(',', ':')) + s[j:])
        json.dump(log, open(os.path.join(ROOT, 'tools', 'library', 'organise-log.json'), 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main('--apply' in sys.argv)
