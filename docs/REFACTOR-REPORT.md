# Refactor report (23 November 2026)

## Audit of the original project

- **Files:** `index.html` (596 KB: 510 lines of CSS, ~1,100 lines of JavaScript including a 339 KB recordings table
  and a 95 KB base64 splash picture), `manifest.webmanifest`, `sw.js`, `404.html`, `icons/`, `audio/` (2 built-in
  recordings), plus 4 test screenshots that had been committed by mistake (`shots/`).
- **Architecture:** one classic script sharing a global scope; state in `localStorage["abq"]`; screens switched by
  URL hash; Mushaf pages, fonts and translations loaded on demand from jsDelivr; audio streamed from archive.org,
  mp3quran.net, verses.quran.com / everyayah.com and YouTube.
- **Platforms:** there are no separate iOS or Android versions: one PWA serves both (and desktop).
- **Not present in the app** (so not invented): IndexedDB, audio download/offline audio. The app streams audio.
- **Problems found:**
  1. Everything in one file, hard to maintain.
  2. The app's own address was written into the code, so share links would break on another address
     (renamed repository, custom domain, local testing).
  3. The service worker saved only the page and three icons. Mushaf pages were described in the app as
     "stays on your phone" but were not saved by the app.
  4. Bug: in the Mushaf's Translation view, changing the app language kept the old translation until you changed surah.
  5. The splash `<img>` had no `src` in the markup (invalid HTML; filled in by script).
  6. 19 inline styles; a stale code comment said "no recitations are included yet".
  - No syntax errors, missing files or broken paths were found. No inline event handlers existed.

## What changed

- `index.html` now holds only the page structure (22 KB). CSS moved to `css/style.css`, `css/components.css` and
  `css/responsive.css`, kept in the original order so the cascade is identical. JavaScript moved, line for line, into
  15 files loaded in the original order (see README). Function names, globals and the storage key are unchanged.
- Recordings table → `data/areas.js`. Splash picture → `assets/images/splash.jpg`. Icons → `assets/icons/`,
  link-preview picture → `assets/images/`, built-in audio → `assets/audio/`.
- Inline styles replaced by classes, except three that depend on data (per-word Mushaf font, progress-bar width,
  colour-swatch preview).
- The app address is worked out from where the app is served.
- New service worker: saves all app files on install, network-first when online (new HTML never runs with old
  scripts), offline fallback, saves Mushaf pages, fonts and translations the first time they are opened, caches
  Google Fonts, leaves audio streaming alone, versioned caches with clean-up of old ones (including the previous
  `abdulbasit-v5`).
- `pwa.js` checks for app updates whenever the installed app comes back to the screen.
- Manifest: same file name on purpose (installed apps look for updates at this address); added an explicit `id`
  equal to the previous default, so installed copies stay the same app.
- Added `privacy.html` (linked from Settings → About) and `css/pages.css`; `404.html` cleaned up with a
  configurable `BASE`.
- Fixed the Translation-view language bug and the splash `<img>`.
- Removed the 4 committed test screenshots.

## Tests run (all automated in a real Chromium browser)

| Check | Result |
|---|---|
| Syntax of every JS file (`node --check`) | pass, 15/15 + sw.js |
| HTML: W3C Nu validator on index, privacy, 404 | pass, 0 errors (original had 1 HTML error) |
| CSS: css-tree parser on all 4 files | pass, 0 parse errors |
| Look unchanged: computed style (~490 properties) and position of every element on 19 screens and sheets, on phone (dark, English), desktop (light, Arabic) and landscape (French) | 57 views compared: identical except About, where the privacy link was added |
| Pop-up sheets not in that run (player text, riwaya, text size) | identical to the original |
| Start-up, language screen, home, all screens | pass, no script errors |
| All 5 languages applied, right-to-left for Arabic, no missing text | pass |
| Surah search: "yasin", "36", "يس", "kahf", no results | pass |
| Live and Radio collections listed | pass |
| Audio plays, pauses; a failed recording shows a message | pass |
| Share links use the served address; shared recitation and shared verse links open | pass |
| Settings saved by the old version (theme, colour, language, favourites, bookmarks, resume positions) still load | pass |
| Mushaf renders with QCF fonts; Translation view; switches to French | pass (French failed on the original: bug fixed) |
| Manifest fields and icons | pass |
| Served from `/tilawat-abdulbasit-adbusamad/` like GitHub Pages: service worker registers with that scope | pass |
| Offline: app opens, splash and icons, saved Mushaf page (0 network requests), unsaved page shows its message, shared link, privacy page | pass |
| Update: new version replaces the old app cache and keeps the Mushaf cache | pass |
| 404 page sends visitors to the app | pass |

## Not tested / remaining

- Real recitation audio from archive.org/mp3quran, real Mushaf/translation downloads and YouTube were replaced by
  local copies in the tests (the test machine cannot reach those servers). Seeking inside a recording was not
  tested, because the test audio server does not support seeking.
- Not tested on a real iPhone or Android phone, and not run through Lighthouse.
- Recitation audio is not available offline. The app never had a download feature; adding one would be new work.
- An unused code path for audio embedded in the page (`resolveUrl` in `player.js`) was kept: harmless, and removing it
  would not change anything for users.
