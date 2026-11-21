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
