# Tilawat Abdul Basit Abdul Samad

A phone app (installable web app) for the recitations of Sheikh Abdul Basit Abdul Samad:
114 surahs (Murattal and Mujawwad), Mushaf, translation, khatmas and 1,700+ recordings by country.

## Put it online (GitHub Pages)
Settings → Pages → Source: "Deploy from a branch" → pick the branch and `/ (root)` → Save.
After a minute the app is at `https://<username>.github.io/tilawat-abdulbasit-adbusamad/`.

## Install it on a phone
- **Android (Chrome):** open the link → menu ⋮ → **Install app** (or "Add to Home screen").
- **iPhone (Safari):** open the link → Share → **Add to Home Screen**.

It then opens full screen from its own icon, and the app itself works offline.
Streaming recitations still needs an internet connection.

## Files
- `index.html` – the app
- `audio/` – the two built-in recordings (Khatmat al-Arbaʿ, quarters 1–2)
- `manifest.webmanifest`, `icons/` – app name and home-screen icon
- `sw.js` – keeps the app on the phone for offline use

## Mushaf reader
The Mushaf shows the Madinah Mushaf pages with their exact 15-line layout, scrolling continuously, plus a
verse-by-verse Translation view. Tap an ayah to play it (Abdul Basit, Murattal or Mujawwad), play on from there with
the ayah highlighted, copy, share or bookmark it. Jump by surah, juz, page or bookmark from the list button.

## Credits
- Mushaf pages: [quran-qcf4](https://github.com/MohamadHajjRabee/quran-qcf4) (page data MIT). The QCF4 font
  (Madinah Mushaf 1441 AH, calligraphy by Uthman Taha, King Fahd Complex; web version by Ahmad ElGharib) is loaded
  from the package on jsDelivr for Quran rendering only and is not copied into this repository.
- Translations: [quran-json](https://github.com/risan/quran-json) (CC BY 4.0) — Saheeh International (English),
  Hamidullah (French), Diyanet (Turkish).
- Ayah audio: Sheikh Abdul Basit Abdul Samad, from verses.quran.com, with everyayah.com as a fallback.
