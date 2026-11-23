# Tilawat Abdul Basit Abdul Samad

An installable web app (PWA) for the recitations of Sheikh Abdul Basit Abdul Samad: every surah in Murattal and
Mujawwad, 2,100+ live and radio recordings by country, complete khatmas, and the Madinah Mushaf with translation and
verse-by-verse audio.

Plain HTML, CSS and JavaScript. No frameworks, no build step, no npm: the files in this folder are the app.

## Project structure

```
index.html            the page: screens and layout only (no CSS or app code inside)
privacy.html          privacy policy (linked from Settings → About)
404.html              sends unknown addresses back to the app (GitHub Pages)
manifest.webmanifest  app name, colours, icons (what "Install app" uses)
sw.js                 service worker: offline copy of the app, Mushaf cache
css/
  style.css           colour variables, fonts, page frame
  components.css      bars, cards, lists, player, khatmas, settings, Mushaf reader, sheets
  responsive.css      layouts for tablets, desktops, landscape and very small phones; press feedback
  pages.css           privacy and 404 pages
js/                   loaded in this order (each file may use what the earlier ones define)
  i18n.js             interface text: English, Arabic, French, German, Turkish
  quran-data.js       surah names and verse counts, Al-Fatihah, first page of each surah / juz
  library-config.js   full-Quran sets, riwayat, archive.org collection links, colour themes
  (data/areas.js, data/aliases.js)  the live and radio recordings by country
  icons.js            line icons and the mosque drawing
  storage.js          saved settings and progress (localStorage key "abq")
  utils.js            small shared helpers ($, t(), toast, time format, search normaliser)
  ui.js               theme, language, surah list
  recitations.js      tracks, Live/Radio collections, favourites, khatmas, YouTube khatma, sheets
  player.js           audio player, queue, resume position, player screen
  mushaf.js           Mushaf reader, translation view, go-to sheet, ayah audio
  navigation.js       screens and back button
  share.js            sharing the app, a recitation (optionally from a moment), opening shared links
  app.js              start-up, splash, press feedback
  pwa.js              registers the service worker
data/
  aliases.js          removed duplicates -> the copy kept (old links keep working)
  areas.js            recordings: area → section → [collection, file, surahs (ar/en), year, place (ar/en)]
docs/
  REFACTOR-REPORT.md  audit, changes and test results of the November 2026 restructure
assets/
  icons/              app icons (32, 180, 192, 512, maskable 512)
  images/             splash picture, link-preview picture
  audio/              the two built-in recordings (Khatmat al-Arbaʿ, quarters 1–2)
```

The scripts are classic `<script>` tags (not modules) and share one global scope, exactly as when everything was in
one file. Keep the order in `index.html`.

## Run it on your computer

Any static web server works. With Python installed:

```
cd tilawat-abdulbasit-adbusamad
python3 -m http.server 8000
```

Then open <http://localhost:8000/>. (Opening `index.html` directly as a file also shows the app, but the offline
service worker only runs on `http://localhost` or `https://`.)

## Put it online with GitHub Pages

1. Push the files to the repository.
2. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, choose the branch and
   `/ (root)`, then **Save**.
3. After a minute or two the app is at `https://<username>.github.io/<repository>/`.

All links inside the app are relative, so it works from that sub-folder, from a custom domain or locally without
changes. Two places name the address on purpose:
- `404.html` → `BASE` (and its two links): the folder to send lost visitors to. Change it if the repository is renamed,
  or set it to `/` for a custom domain.
- `index.html` → the `og:url` / `og:image` tags: link previews in WhatsApp etc. need a full address.

## Updating the app

Edit the files and push. When online, the app always loads the newest files first, so a new `index.html` never runs
with old scripts. If you add or rename a file, also add it to the `SHELL` list in `sw.js` and change `VERSION`
there, so the offline copy includes it.

## Install it on a phone

- **Android (Chrome):** open the link → menu ⋮ → **Install app** (or "Add to Home screen").
- **iPhone (Safari):** open the link → Share → **Add to Home Screen**.

## Offline: what works and what doesn't

- The app itself opens offline once it has been opened online.
- Mushaf pages, fonts and translations you have opened are saved and work offline.
- Recitation audio is streamed from archive.org and mp3quran.net and needs internet. It is not downloaded
  automatically (the library is many gigabytes).

## Credits

- Mushaf pages: [quran-qcf4](https://github.com/MohamadHajjRabee/quran-qcf4) (page data MIT). The QCF4 font
  (Madinah Mushaf 1441 AH, calligraphy by Uthman Taha, King Fahd Complex; web version by Ahmad ElGharib) is loaded
  from the package on jsDelivr for Quran rendering only and is not copied into this repository.
- Translations: [quran-json](https://github.com/risan/quran-json) (CC BY 4.0): Saheeh International (English),
  Hamidullah (French), Diyanet (Turkish).
- Full surahs: mp3quran.net. Live and radio recordings: collections on the Internet Archive (archive.org).
- Ayah audio: verses.quran.com, with everyayah.com as a fallback.
