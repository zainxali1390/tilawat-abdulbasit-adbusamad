# Recitations library — country and place archive (24 November 2026)

The library is now organised **country → place → recordings**:

- **Places** are mosques, radio stations, television, venues, record companies, or a city when no venue is named.
- **Year, type, surah and length** are filters and sorting inside each place.

No recording was deleted, duplicated or renamed, and no ID, file, link, title or year changed. All **2,739** recordings are in the archive, each exactly once (checked automatically). A backup of the data before this change is in `data/backups/areas.before-locations-2026-11-24.js`.

## How places are decided (js/library.js)

- **Country:** the country the recording is filed under. Masjid al-Aqsa is filed under Palestine and BBC under United Kingdom. Place unknown, unnamed radio, the Sheikh's home and lost recitations go under **Country not known**.
- **Place:** the recording's own place field, taken from its source label. The same place written two ways is one place (see Merges).
- **Place not named:** when the field only names the country, the recording goes to that country's **Location not known**. For radio or TV it goes to **Radio · station not named** or **TV · channel not named**, as its source says. A venue is never guessed.
- **Type:** taken from the recording's source label: public recitation, radio, television, at home, studio record, shared khatma, compilation or lost fragment. Recordings at a radio or TV place count as radio or TV.
- **Repeatable:** corrections to the data are made by `tools/library/organise.py`, only where the recording's own file name proves them. Each correction is listed below. Running it again changes nothing.

## Countries and places

### Egypt (مصر) — 705 recordings, 70 places

| Place | Arabic | Kind | Recordings |
|---|---|---|---|
| Imam al-Shafiʿi Mosque · Cairo | مسجد الإمام الشافعي · القاهرة | Mosque | 118 |
| Imam al-Hussein Mosque · Cairo | مسجد الإمام الحسين · القاهرة | Mosque | 91 |
| Sayyida Zaynab Mosque · Cairo | مسجد السيدة زينب · القاهرة | Mosque | 18 |
| Al-Azhar Mosque · Cairo | الجامع الأزهر · القاهرة | Mosque | 8 |
| Al-Mursi Abu al-Abbas Mosque · Alexandria | مسجد المرسي أبو العباس · الإسكندرية | Mosque | 4 |
| Abd al-Rahim al-Qinawi Mosque · Qena | مسجد عبد الرحيم القنائي · قنا | Mosque | 3 |
| Ahmed el-Tawabi Mosque · El-Tawabiya | مسجد أحمد الطوابي · الطوابية | Mosque | 3 |
| Al-Salihin Mosque · Cairo | مسجد الصالحين · القاهرة | Mosque | 3 |
| Imam al-Busiri Mosque · Alexandria | مسجد الإمام البوصيري · الإسكندرية | Mosque | 3 |
| Sayyid al-Badawi Mosque · Tanta | مسجد السيد البدوي · طنطا | Mosque | 3 |
| Al-Hamidiya al-Shadhiliya Mosque · Cairo | مسجد الحامدية الشاذلية · القاهرة | Mosque | 2 |
| Al-Rifaʿi Mosque · Cairo | مسجد أحمد الرفاعي · القاهرة | Mosque | 2 |
| Sheikh al-Banna Mosque · Monufia | مسجد الشيخ البنا · المنوفية | Mosque | 2 |
| Sheikh Saleh al-Jaafari Mosque · Cairo | مسجد الشيخ صالح الجعفري · القاهرة | Mosque | 2 |
| Sinan Pasha Mosque · Bulaq | مسجد سنان باشا · بولاق | Mosque | 2 |
| Abu Abdullah al-Gharib Mosque · Suez | مسجد أبو عبد الله الغريب · السويس | Mosque | 1 |
| Al-Mahrousa Mosque · Egypt | مسجد المحروسة · مصر | Mosque | 1 |
| Al-Salam Mosque · Sharqia | مسجد السلام · الشرقية | Mosque | 1 |
| Atef El-Sadat Mosque | مسجد عاطف السادات | Mosque | 1 |
| Atef Pasha Mosque | مسجد عاطف باشا | Mosque | 1 |
| Khalid ibn al-Walid Mosque · Egypt | مسجد خالد بن الوليد · مصر | Mosque | 1 |
| Mohamed Farag Mosque · Egypt | مسجد محمد فرج · مصر | Mosque | 1 |
| Salama al-Radi Mosque · Egypt | مسجد سلامة الراضي · مصر | Mosque | 1 |
| Sayyida Nafisa Mosque · Cairo | مسجد السيدة نفيسة · القاهرة | Mosque | 1 |
| Sultan Abu al-Ela Mosque · Cairo | مسجد السلطان أبي العلا · القاهرة | Mosque | 1 |
| Zamalek Mosque | مسجد الزمالك | Mosque | 1 |
| Shared khatma · early 1950s | الختمة المشتركة · أوائل الخمسينيات | Venue / occasion | 35 |
| Abdeen Square · Cairo | ميدان عابدين · القاهرة | Venue / occasion | 8 |
| Al-Khalifa Square · Cairo | ميدان الخليفة · القاهرة | Venue / occasion | 1 |
| Cairo University | جامعة القاهرة | Venue / occasion | 1 |
| El-Mahalla El-Kubra | المحلة الكبرى | Venue / occasion | 1 |
| Egyptian Radio | الإذاعة المصرية | Radio | 101 |
| Middle East Radio · Cairo | إذاعة الشرق الأوسط · القاهرة | Radio | 1 |
| Radio · station not named | إذاعة · المحطة غير مذكورة | Radio | 1 |
| Radio Cairo | إذاعة القاهرة | Radio | 1 |
| Egyptian TV | التلفزيون المصري | Television | 3 |
| Mourphon | شركة مورفون | Record company | 19 |
| Sawt al-Qahira | صوت القاهرة | Record company | 2 |
| Sawt al-Islam records | أسطوانات صوت الإسلام | Record company | 1 |
| Alexandria | الإسكندرية | City or region (venue not named) | 22 |
| Armant | أرمنت | City or region (venue not named) | 20 |
| Luxor | الأقصر | City or region (venue not named) | 10 |
| Aswan | أسوان | City or region (venue not named) | 8 |
| Asyut | أسيوط | City or region (venue not named) | 6 |
| Sohag | سوهاج | City or region (venue not named) | 6 |
| Cairo | القاهرة | City or region (venue not named) | 5 |
| Qena | قنا | City or region (venue not named) | 5 |
| El-Batniya · Cairo | الباطنية · القاهرة | City or region (venue not named) | 3 |
| Giza | الجيزة | City or region (venue not named) | 3 |
| Qus | قوص | City or region (venue not named) | 3 |
| Bab al-Shaariya · Cairo | باب الشعرية · القاهرة | City or region (venue not named) | 2 |
| Beni Suef | بني سويف | City or region (venue not named) | 2 |
| Edfu | إدفو | City or region (venue not named) | 2 |
| Esna | إسنا | City or region (venue not named) | 2 |
| Port Said | بورسعيد | City or region (venue not named) | 2 |
| Al-Buuth City · Cairo | مدينة البعوث الإسلامية · القاهرة | City or region (venue not named) | 1 |
| Al-Minshawi 40th-day memorial | الذكرى الأربعين للشيخ المنشاوي | City or region (venue not named) | 1 |
| Dakahlia | الدقهلية | City or region (venue not named) | 1 |
| Dokki | الدقي | City or region (venue not named) | 1 |
| El-Hawamdeya | الحوامدية | City or region (venue not named) | 1 |
| El-Manial · Cairo | المنيل · القاهرة | City or region (venue not named) | 1 |
| El-Manshiya · Alexandria | المنشية · الإسكندرية | City or region (venue not named) | 1 |
| Hadayek El-Kobba | حدائق القبة | City or region (venue not named) | 1 |
| Helwan | حلوان | City or region (venue not named) | 1 |
| Sharqia | الشرقية | City or region (venue not named) | 1 |
| Suez | السويس | City or region (venue not named) | 1 |
| Tanta | طنطا | City or region (venue not named) | 1 |
| Upper Egypt | الصعيد | City or region (venue not named) | 1 |
| Zamalek | الزمالك | City or region (venue not named) | 1 |
| Location not known | المكان غير معروف | Not known | 140 |

### Kuwait (الكويت) — 306 recordings, 7 places

| Place | Arabic | Kind | Recordings |
|---|---|---|---|
| Shuwaikh Secondary School Mosque · Kuwait | مسجد ثانوية الشويخ · الكويت | Mosque | 30 |
| Fahad al-Salem Mosque · Kuwait | مسجد فهد السالم · الكويت | Mosque | 16 |
| Souq Mosque · Kuwait | مسجد السوق · الكويت | Mosque | 7 |
| Al-Salem Mosque · Kuwait | مسجد السالم · الكويت | Mosque | 2 |
| Kuwait Radio | إذاعة الكويت | Radio | 18 |
| Kuwait TV | تلفزيون الكويت | Television | 12 |
| Location not known | المكان غير معروف | Not known | 221 |

### Syria (سوريا) — 145 recordings, 14 places

| Place | Arabic | Kind | Recordings |
|---|---|---|---|
| Umayyad Mosque · Damascus | المسجد الأموي · دمشق | Mosque | 31 |
| Abdullah ibn Rawaha Mosque · Damascus | جامع عبد الله بن رواحة · دمشق | Mosque | 2 |
| Al-Jamiʿ al-Aʿla · Hama | الجامع الأعلى · حماة | Mosque | 1 |
| Al-Sultan Mosque · Hama | مسجد السلطان · حماة | Mosque | 1 |
| Khalid ibn al-Walid Mosque · Homs | مسجد خالد بن الوليد · حمص | Mosque | 1 |
| Lala Mustafa Pasha Mosque | مسجد لالا مصطفى باشا | Mosque | 1 |
| Yalbugha Mosque · Damascus | مسجد يلبغا · دمشق | Mosque | 1 |
| Syrian Radio | الإذاعة السورية | Radio | 53 |
| Aleppo | حلب | City or region (venue not named) | 8 |
| Damascus | دمشق | City or region (venue not named) | 4 |
| Latakia | اللاذقية | City or region (venue not named) | 4 |
| Hama | حماة | City or region (venue not named) | 2 |
| Location not known | المكان غير معروف | Not known | 35 |
| Lost recitations | تلاوات مفقودة | Not known | 1 |

### Palestine (فلسطين) — 124 recordings, 1 places

| Place | Arabic | Kind | Recordings |
|---|---|---|---|
| Al-Aqsa Mosque | المسجد الأقصى | Mosque | 124 |

### South Africa (جنوب أفريقيا) — 89 recordings, 2 places

| Place | Arabic | Kind | Recordings |
|---|---|---|---|
| Johannesburg · South Africa | جوهانسبرغ · جنوب أفريقيا | City or region (venue not named) | 3 |
| Location not known | المكان غير معروف | Not known | 86 |

### Saudi Arabia (السعودية) — 66 recordings, 8 places

| Place | Arabic | Kind | Recordings |
|---|---|---|---|
| Masjid al-Haram · Makkah | المسجد الحرام · مكة | Mosque | 11 |
| Masjid an-Nabawi · Madinah | المسجد النبوي · المدينة | Mosque | 1 |
| Saudi Radio | الإذاعة السعودية | Radio | 20 |
| Jeddah Radio | إذاعة جدة | Radio | 8 |
| Radio · station not named | إذاعة · المحطة غير مذكورة | Radio | 2 |
| Saudi TV | تلفزيون السعودية | Television | 2 |
| Makkah | مكة | City or region (venue not named) | 1 |
| Location not known | المكان غير معروف | Not known | 21 |

### Pakistan (باكستان) — 64 recordings, 3 places

| Place | Arabic | Kind | Recordings |
|---|---|---|---|
| Karachi · Pakistan | كراتشي · باكستان | City or region (venue not named) | 6 |
| Lahore · Pakistan | لاهور · باكستان | City or region (venue not named) | 1 |
| Location not known | المكان غير معروف | Not known | 57 |

### United Arab Emirates (الإمارات) — 53 recordings, 5 places

| Place | Arabic | Kind | Recordings |
|---|---|---|---|
| Grand Mosque · Abu Dhabi | المسجد الكبير · أبوظبي | Mosque | 2 |
| Zayed bin Sultan Mosque · Abu Dhabi | مسجد زايد بن سلطان · أبوظبي | Mosque | 2 |
| UAE TV | تلفزيون الإمارات | Television | 3 |
| Abu Dhabi · UAE | أبوظبي · الإمارات | City or region (venue not named) | 29 |
| Location not known | المكان غير معروف | Not known | 17 |

### Iraq (العراق) — 48 recordings, 8 places

| Place | Arabic | Kind | Recordings |
|---|---|---|---|
| 14 Ramadan Mosque · Baghdad | جامع 14 رمضان · بغداد | Mosque | 7 |
| Al-Firdaws Mosque | جامع الفردوس | Mosque | 1 |
| Al-Safawi Mosque · Kadhimiya, Baghdad | الجامع الصفوي · الكاظمية، بغداد | Mosque | 1 |
| Presidential Palace · Baghdad | القصر الجمهوري · بغداد | Venue / occasion | 7 |
| Iraqi TV | تلفزيون العراق | Television | 1 |
| Baghdad | بغداد | City or region (venue not named) | 6 |
| Kadhimiya · Baghdad | الكاظمية · بغداد | City or region (venue not named) | 1 |
| Location not known | المكان غير معروف | Not known | 24 |

### Qatar (قطر) — 33 recordings, 4 places

| Place | Arabic | Kind | Recordings |
|---|---|---|---|
| Grand Mosque · Doha | المسجد الكبير · الدوحة | Mosque | 2 |
| Qatar Radio | إذاعة قطر | Radio | 1 |
| Qatar TV | تلفزيون قطر | Television | 4 |
| Location not known | المكان غير معروف | Not known | 26 |

### United States (الولايات المتحدة) — 16 recordings, 2 places

| Place | Arabic | Kind | Recordings |
|---|---|---|---|
| Al-Huda Mosque · United States | مسجد الهدى · الولايات المتحدة | Mosque | 2 |
| Location not known | المكان غير معروف | Not known | 14 |

### Jordan (الأردن) — 12 recordings, 4 places

| Place | Arabic | Kind | Recordings |
|---|---|---|---|
| Al-Husseini Mosque · Amman | المسجد الحسيني · عمّان | Mosque | 1 |
| Jordanian TV | التلفزيون الأردني | Television | 4 |
| TV interview with Omar Al-Bteishi | لقاء تلفزيوني مع عمر البطيشي | Television | 3 |
| Location not known | المكان غير معروف | Not known | 4 |

### Lebanon (لبنان) — 9 recordings, 1 places

| Place | Arabic | Kind | Recordings |
|---|---|---|---|
| Location not known | المكان غير معروف | Not known | 9 |

### India (الهند) — 7 recordings, 1 places

| Place | Arabic | Kind | Recordings |
|---|---|---|---|
| Location not known | المكان غير معروف | Not known | 7 |

### Iran (إيران) — 4 recordings, 3 places

| Place | Arabic | Kind | Recordings |
|---|---|---|---|
| Iran Radio | إذاعة إيران | Radio | 2 |
| Iran TV | تلفزيون إيران | Television | 1 |
| Location not known | المكان غير معروف | Not known | 1 |

### Malaysia (ماليزيا) — 4 recordings, 1 places

| Place | Arabic | Kind | Recordings |
|---|---|---|---|
| Location not known | المكان غير معروف | Not known | 4 |

### Morocco (المغرب) — 3 recordings, 1 places

| Place | Arabic | Kind | Recordings |
|---|---|---|---|
| Location not known | المكان غير معروف | Not known | 3 |

### Libya (ليبيا) — 2 recordings, 1 places

| Place | Arabic | Kind | Recordings |
|---|---|---|---|
| Location not known | المكان غير معروف | Not known | 2 |

### United Kingdom (المملكة المتحدة) — 2 recordings, 1 places

| Place | Arabic | Kind | Recordings |
|---|---|---|---|
| BBC Radio · London | إذاعة لندن (بي بي سي) | Radio | 2 |

### Bahrain (البحرين) — 1 recordings, 1 places

| Place | Arabic | Kind | Recordings |
|---|---|---|---|
| Location not known | المكان غير معروف | Not known | 1 |

### Country not known (البلد غير معروف) — 1046 recordings, 11 places

| Place | Arabic | Kind | Recordings |
|---|---|---|---|
| Al-Maghfira Mosque (country not given) | مسجد المغفرة (البلد غير مذكور) | Mosque | 1 |
| Al-Tawba Mosque (country not given) | مسجد التوبة (البلد غير مذكور) | Mosque | 1 |
| Martyr Salah Ashmawi Mosque (country not given) | مسجد الشهيد صلاح عشماوي (البلد غير مذكور) | Mosque | 1 |
| At the Sheikh's home | منزل الشيخ | Venue / occasion | 4 |
| Radio · station not named | إذاعة · المحطة غير مذكورة | Radio | 123 |
| Quran Radio (country not given) | إذاعة القرآن (البلد غير مذكور) | Radio | 1 |
| Radio of the United Arab Republic | إذاعة الجمهورية العربية المتحدة | Radio | 1 |
| El-Meamaria | المعمارية | City or region (venue not named) | 1 |
| Location not known | المكان غير معروف | Not known | 909 |
| Lost recitations | تلاوات مفقودة | Not known | 3 |
| An East Asian country (not named) | إحدى دول شرق آسيا (غير مسماة) | Not known | 1 |

Total: 2739 recordings.

## Recordings that were filed under the wrong country (19, corrected)

| Recording | Year | Was | Now | Evidence |
|---|---|---|---|---|
| Yūsuf (1–21) | 1964 | Egypt / Public recitations 1960s / Presidential Palace · Cairo | Iraq / Public recitations 1960s / Presidential Palace · Baghdad | file name: "القصر الجمهوري 1964 العراق" |
| Āl ʿImrān (33–49) | 1964 | Egypt / Public recitations 1960s / Presidential Palace · Cairo | Iraq / Public recitations 1960s / Presidential Palace · Baghdad | file name: "القصر الجمهوري بغداد 1964" |
| Al-Māʾidah (109–117) | 1964 | Egypt / Public recitations 1960s / Presidential Palace · Cairo | Iraq / Public recitations 1960s / Presidential Palace · Baghdad | file name: "من تلاوات القصر الجمهوري بالعراق 1964" |
| Hūd (36–49) · Al-Qadr | 1964 | Egypt / Public recitations 1960s / Presidential Palace · Cairo | Iraq / Public recitations 1960s / Presidential Palace · Baghdad | file name: "القصر الجمهوري 1964", collection number -4- (Iraq), same series |
| Al-Aʿrāf (142–155) · Al-Balad | 1964 | Egypt / Public recitations 1960s / Presidential Palace · Cairo | Iraq / Public recitations 1960s / Presidential Palace · Baghdad | file name: "من القصر الجمهوري 1964", collection number -4- (Iraq), same series |
| Āl ʿImrān (185–195) | 1977 | Kuwait / Public recitations 1970s / Kuwait | Iraq / Public recitations 1970s / 14 Ramadan Mosque · Baghdad | file name: "عزاء ناجي الخضيري - مسجد 14 رمضان بغداد 1977" |
| Az-Zumar (61–75) · Al-Aʿlā | 1977 | Kuwait / Public recitations 1970s / Kuwait | Iraq / Public recitations 1970s / 14 Ramadan Mosque · Baghdad | file name: "عزاء آل الخضيري - مسجد 14 رمضان 1977 بغداد" |
| Al-Ḥujurāt (13–18) · Qāf (1–4) | 1977 | Kuwait / Public recitations 1970s / Kuwait | Iraq / Public recitations 1970s / 14 Ramadan Mosque · Baghdad | file name: "عزاء آل الخضيري - جامع 14 رمضان 1977", collection number -4- (Iraq) |
| Al-Ḥashr (18–24) · Al-Fajr (1–30) | 1977 | Kuwait / Public recitations 1970s / Kuwait | Iraq / Public recitations 1970s / 14 Ramadan Mosque · Baghdad | file name: "عزاء آل الخضيري 1977 مسجد 14 رمضان - العراق" |
| Al-Furqān (58–77) | 1977 | Kuwait / Public recitations 1970s / Kuwait | Iraq / Public recitations 1970s / 14 Ramadan Mosque · Baghdad | file name: "مجلس عزاء آل الخضيري 1977 جامع 14 رمضان ببغداد" |
| Al-Qamar (49–55) · Ar-Raḥmān (1–27) | 1977 | Kuwait / Public recitations 1970s / Kuwait | Iraq / Public recitations 1970s / Baghdad | file name: "عزاء آل الخضيري 1977 بغداد" (no mosque named) |
| An-Nabaʾ · Al-Infiṭār · short surahs | 1977 | Kuwait / Public recitations 1970s / Kuwait | Iraq / Public recitations 1970s / Baghdad | file name: "ختام عزاء الخضيري 1977 بغداد" (no mosque named) |
| Al-Furqān (61–77) · Aṭ-Ṭāriq · An-Naṣr |  | Saudi Arabia / Public recitations · date not given / Saudi Arabia | Egypt / Public recitations · date not given / Sayyida Zaynab Mosque · Cairo | file name: "مسجد السيدة زينب", collection number -1- (Egypt) |
| Al-Wāqiʿah (75–96) | 1950s | Egypt / Public recitations 1950s / Egypt | Place unknown / Sūrah Al-Wāqiʿah / An East Asian country (not named) | file name: "من فترة الخمسينات في احدى دول شرق اسيا" |
| An-Nisāʾ (58–70) | 1960s | Place unknown / Sūrah An-Nisāʾ /  | Kuwait / Public recitations 1960s / Kuwait | file name: "كويت في الستينات" |
| Al-Māʾidah (109–120) | 1960s | Place unknown / Sūrah Al-Māʾidah /  | Kuwait / Public recitations 1960s / Kuwait | file name: "كويت في الستينات" |
| Al-Qamar · Ar-Raḥmān · Al-Fajr |  | Place unknown / Sūrah Al-Qamar /  | Qatar / Radio recitations · date not given / Qatar Radio | file name: "اذاعة قطر" |
| Hūd (36–45) · Al-Qiyāmah | 1978 | Place unknown / Sūrah Hūd /  | Egypt / Public recitations 1970s / Al-Salihin Mosque · Cairo | same audio as A 426 "Al-Salihin Mosque" (Egypt) and E "مسجد الصالحين القاهرة مصر 1978", by fingerprint |
| At-Tawbah (18–26) |  | Lost recitations / Lost recitations /  | Syria / Lost recitations / Syria | file name: "من تلاوات سوريا" |

The five recordings filed as "Presidential Palace · Cairo" are all from the **Presidential Palace in Baghdad, 1964**:
- Three of their file names say Baghdad or Iraq.
- The other two belong to the same series: the collection numbers them -4- (its Iraq group), with the same palace and the same year.
- That place label was wrong as a whole, probably an error in the 24 November name audit.

## Places made exact from the file names (65)

Where the place field only named the country or a city, but the recording's own file name names the mosque, radio station or venue:

| Recording | Year | Was | Now | Evidence |
|---|---|---|---|---|
| An-Nisāʾ (1–17) | 1954 | Egypt | Egyptian Radio | file name: "الإذاعة المصرية" |
| Al-Aʿrāf (42–73) | 1959 | Egypt | Egyptian Radio | file name: "الإذاعة المصرية" |
| Al-Anʿām (141–155) | 1955 | Egypt | Egyptian Radio | file name: "الإذاعة المصرية" |
| Ar-Raḥmān | 1960 | Egypt | Egyptian Radio | file name: "الإذاعة المصرية" |
| Al-Baqarah (from 253) | 1962 | Egypt | Egyptian Radio | file name: "الإذاعة المصرية" |
| Fuṣṣilat (from 47) · Ash-Shūrā (1–15) | 1961 | Egypt | Egyptian Radio | file name: "الإذاعة المصرية" |
| An-Nisāʾ (1–13) |  | Egypt | Egyptian Radio | file name: "الإذاعة المصرية" |
| Al-Aḥzāb (21–35) | 1979 | Egypt | Imam al-Shafiʿi Mosque · Cairo | file name: "مسجد الإمام الشافع" |
| An-Naḥl (from 120) · Al-Isrāʾ (1–14) | 1978 | Egypt | Al-Mahrousa Mosque · Egypt | file name: "مسجد المحروسة" |
| Az-Zumar (73–75) · Ghāfir (1–20) | 1985 | Egypt | Khalid ibn al-Walid Mosque · Egypt | file name: "مسجد خالد بن الوليد" |
| Al-Ḥajj (23–37) · Al-Ḥāqqah (1–18) | 1962 | Egypt | Salama al-Radi Mosque · Egypt | file name: "مسجد سلامة الراضي" |
| Al-Isrāʾ (9–25) | 1976 | Egypt | Mohamed Farag Mosque · Egypt | file name: "مسجد محمدفرج" |
| Al-Aʿrāf |  | Cairo | Radio Cairo | file name: "إذاعة القاهرة" |
| Aṣ-Ṣāffāt (75–122) | 1986 | Cairo | Al-Rifaʿi Mosque · Cairo | file name: "مسجد احمدالرفاعي" |
| Hūd · Al-Qiyāmah | 1978 | Cairo | Al-Salihin Mosque · Cairo | file name: "مسجد الصالحين" |
| Al-Qamar (49–55) · Ar-Raḥmān · Al-Ḥāqqah · An-Nabaʾ · At-Takwīr | 1970s | Cairo | Al-Khalifa Square · Cairo | file name: "ميدان الخليفة" |
| At-Taḥrīm (8–12) · Al-Ḥāqqah (1–24) · Aḍ-Ḍuḥā · Ash-Sharḥ | 1970s | Cairo | El-Manial · Cairo | file name: "المنيل" |
| Al-Aḥzāb | 1968 | Cairo | Cairo University | file name: "جامعة القاهرة" |
| Al-Ḥujurāt (1–13) |  | Suez | Abu Abdullah al-Gharib Mosque · Suez | file name: "مسجد أبو عبدالله الغريب" |
| Al-Furqān (61–77) · Al-Balad · Al-Kawthar | 1980 | Sharqia | Al-Salam Mosque · Sharqia | file name: "مسجد السلام" |
| Al-Furqān (61–77) · Al-Balad · short surahs | 1980 | Monufia | Sheikh al-Banna Mosque · Monufia | file name: "مسجد الشيخ البنا" |
| Al-Ḥashr · Aḍ-Ḍuḥā · At-Tīn · Al-Ikhlāṣ | 1979 | Qena | Abd al-Rahim al-Qinawi Mosque · Qena | file name: "مسجد القناني" |
| Āl ʿImrān (33–49) |  | Iraq | Al-Safawi Mosque · Kadhimiya, Baghdad | file name: "الجامع الصفوي بالكاظمية" |
| Āl ʿImrān (189–200) · At-Tīn · Al-Qadr | 1964 | Iraq | Presidential Palace · Baghdad | file name: "القصر الحمهوري بغداد" |
| Al-Aʿrāf (42–58) |  | Iraq | Presidential Palace · Baghdad | file name: "القصر الرئاسي في العراق" |
| Ibrāhīm (23–41) | 1977 | Iraq | 14 Ramadan Mosque · Baghdad | file name: "جامع 14 رمضان" |
| Al-Isrāʾ (9–17) | 1977 | Iraq | 14 Ramadan Mosque · Baghdad | file name: "مسجد 14 رمضان" |
| Al-Ḥashr (18–24) · At-Takwīr · Al-Fajr | 1956 | Iraq | Kadhimiya · Baghdad | file name: "الكاظمية" |
| Al-Aḥzāb (21–35) · Aḍ-Ḍuḥā · Ash-Sharḥ | 1986 | Iraq | Baghdad | file name: "ببغداد" |
| Al-Ḥujurāt · Qāf | 1986 | Iraq | Baghdad | file name: "بغداد" |
| Maryam (1–36) · Ash-Shams | 1965 | Jordan | Al-Husseini Mosque · Amman | file name: "المسجد الحسيني" |
| Āl ʿImrān (133–146) | 1964 | Kuwait | Souq Mosque · Kuwait | file name: "مسجد السوق" |
| Hūd (36–49) · Al-Balad | 1967 | Kuwait | Souq Mosque · Kuwait | file name: "مسجد السوق" |
| Ibrāhīm (23–38) | 1967 | Kuwait | Souq Mosque · Kuwait | file name: "مسجد السوق" |
| Fuṣṣilat (30–45) · Ash-Shams | 1964 | Kuwait | Souq Mosque · Kuwait | file name: "مسجد السوق" |
| Ar-Raʿd (1–16) | 1964 | Kuwait | Souq Mosque · Kuwait | file name: "مسجد السوق" |
| Āl ʿImrān (133–146) | 1964 | Kuwait | Souq Mosque · Kuwait | file name: "مسجد السوق" |
| Al-Isrāʾ (1–14) | 1964 | Kuwait | Souq Mosque · Kuwait | file name: "مسجد السوق" |
| Al-Ḥajj (1–33) | 1974 | Kuwait | Fahad al-Salem Mosque · Kuwait | file name: "مسجد فهدالسالم" |
| Al-Ḥashr · Al-Ḥāqqah · An-Nabaʾ · At-Takwīr · Aḍ-Ḍuḥā · Ash-Sharḥ | 1974 | Kuwait | Al-Salem Mosque · Kuwait | file name: "مسجدالسالم" |
| Ibrāhīm (23–41) | 1980s | Qatar | Grand Mosque · Doha | file name: "المسجدالكبير" |
| Al-Qamar (49–55) · Ar-Raḥmān (1–27) |  | Qatar | Grand Mosque · Doha | file name: "المسجد الكبير" |
| Adh-Dhāriyāt | 1951 | Saudi Arabia | Jeddah Radio | file name: "إذاعة جده" |
| Al-Muʾminūn (1–33) |  | Syria | Syrian Radio | file name: "اذاعة سوريا" |
| Al-Ḥajj (23–41) · Al-Balad | 1962 | Syria | Abdullah ibn Rawaha Mosque · Damascus | file name: "جامع عبدالله بن رواحة" |
| Al-Ḥajj (23–41) · Al-Balad | 1962 | Damascus | Abdullah ibn Rawaha Mosque · Damascus | file name: "جامع عبدالله بن رواحة" |
| Maryam (1–34) · Al-Aʿlā | 1950s | Hama | Al-Jamiʿ al-Aʿla · Hama | file name: "الجامع الاعلى" |
| Āl ʿImrān (189–200) · Ash-Shams · Aḍ-Ḍuḥā · Ash-Sharḥ · At-Tīn · Al-ʿAlaq | 1961 | Hama | Al-Sultan Mosque · Hama | file name: "مسجد السلطان" |
| Al-Kahf (from 60) · Ash-Sharḥ · Al-Fātiḥah | 1957 | Damascus | Yalbugha Mosque · Damascus | file name: "مسجد يلبغا" |
| Al-Muddaththir (1–56) · Al-Qiyāmah (1–40) | 1954 | Homs | Khalid ibn al-Walid Mosque · Homs | file name: "مسجدخالد بن الوليد" |
| Al-Anʿām (72–90) |  | Abu Dhabi · UAE | Zayed bin Sultan Mosque · Abu Dhabi | file name: "مسجد زايدبن سلطان" |
| Hūd (36–49) · Al-Infiṭār |  | Abu Dhabi · UAE | Zayed bin Sultan Mosque · Abu Dhabi | file name: "مسجد زايد بن سلطان" |
| Al-Furqān (58–73) · Al-Jumuʿah | 1982 | Abu Dhabi · UAE | Grand Mosque · Abu Dhabi | file name: "مسجد ابوظبي الكبير" |
| Al-Isrāʾ (1–19) | 1980 | Abu Dhabi · UAE | Grand Mosque · Abu Dhabi | file name: "المسجد الكبير" |
| At-Taḥrīm (8–12) · Al-Ḥāqqah (1–24) · Al-Infiṭār | 1987 | United States | Al-Huda Mosque · United States | file name: "مسجد الهدي" |
| Ibrāhīm (23–41) | 1987 | United States | Al-Huda Mosque · United States | file name: "مسجدالهدى" |
| Āl ʿImrān (189–200) · Al-Ḥāqqah · Al-Qadr · At-Tawbah | 1962 | (none) | Al-Tawba Mosque (country not given) | file name: "مسجد التوبة" |
| Al-Māʾidah (90–93) | 1985 | (none) | Al-Maghfira Mosque (country not given) | file name: "مسجد المغفرة" |
| Az-Zumar · Al-Balad · Aḍ-Ḍuḥā · Ash-Sharḥ · At-Tīn · An-Naṣr | 1987 | (none) | Martyr Salah Ashmawi Mosque (country not given) | file name: "مسجد الشهيد صلاح عشماوي" |
| Al-Baqarah |  | (none) | Radio of the United Arab Republic | file name: "إذاعة الجمهورية العربية المتحدة" |
| An-Naḥl (90–127) |  | (none) | Quran Radio (country not given) | file name: "اذاعة القران" |
| Hūd · Al-Qiyāmah | 1978 | Al-Salihin Mosque | Al-Salihin Mosque · Cairo | A 426 is the same audio as the "مسجد الصالحين القاهرة مصر 1978" recording (fingerprint) |
| Aṣ-Ṣāffāt | 1979 | Al-Rifaʿi Mosque | Al-Rifaʿi Mosque · Cairo | both labels: "مسجد أحمد الرفاعي"; the other names Cairo |
| Al-Furqān · Al-Balad · Aḍ-Ḍuḥā · Ash-Sharḥ |  | Sheikh al-Banna Mosque | Sheikh al-Banna Mosque · Monufia | same mosque name in Egypt; the other label names Monufia |
| Maryam | 1968 | Sinan Pasha Mosque | Sinan Pasha Mosque · Bulaq | same mosque name in Egypt; the other label names Bulaq |

## Merges (one place written two ways)

- "Damascus Radio" = **Syrian Radio**: إذاعة دمشق is the Syrian national radio.
- "BBC" = **BBC Radio · London**.
- "Makkah · Saudi Arabia" = **Makkah**.
- Mosques written with and without their city:
  - Al-Ṣāliḥīn Mosque = Al-Ṣāliḥīn Mosque · Cairo;
  - Al-Rifāʿī Mosque = Al-Rifāʿī Mosque · Cairo;
  - Sheikh al-Banna Mosque = Sheikh al-Banna Mosque · Monufia;
  - Sinan Pasha Mosque = Sinan Pasha Mosque · Bulaq.
- "مسجد القناني" in a file name is the existing **Abd al-Rahim al-Qinawi Mosque · Qena** (a misspelling).
- "مسجد السوق" and "مسجد السوق الكبير" (Kuwait) = **Souq Mosque · Kuwait**.

The duplicate-place check compares names regardless of accents, "Mosque/Masjid/Jamiʿ", "al-", the city, and Arabic spelling. It now finds no duplicate places.

## Kept separate on purpose (not proven to be the same place)

- **Zamalek** (district) and **Zamalek Mosque**, both 1964.
- **Egyptian Radio** and **Radio Cairo**: the label says إذاعة القاهرة.
- **Saudi Radio** and **Jeddah Radio**.
- **Al-Salem Mosque** and **Fahad al-Salem Mosque** (Kuwait).
- **Makkah** (city) and **Masjid al-Haram**.
- The four mosques named without a country (Al-Tawba, Al-Maghfira, Martyr Salah Ashmawi, and one Al-Ṣāliḥīn) stay under Country not known.

## Duplicate recordings found

Three entries are **one recording**: Al-Ṣāliḥīn Mosque, Cairo, Friday 24 March 1978 (Hūd 36–45 · Al-Qiyāmah). Compared by fingerprint across their whole length:
- A 426 and X1 168 match at the same speed;
- E "مسجد الصالحين القاهرة مصر 1978" matches both at about 89 % speed (a slowed copy, labelled "better quality").

They are now all filed under that mosque. None was deleted; choose which to keep (see `docs/DUPLICATES-REVIEW.md`).

## Final checks (automatic)

- 2,739 recordings before and after, each in exactly one place; none missing or added.
- No title, year, file or link changed.
- Every place has an English and an Arabic name.
- No duplicate place IDs, and no duplicate places by the name comparison (except Zamalek, kept on purpose).
- Playback, the play queue (now the recordings of the same place, in the order chosen there), "where it comes from", search, filters and sorting tested in English and Arabic.
