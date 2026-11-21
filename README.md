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
- `data/quran-uthmani.txt` – the Quran text (one ayah per line), used by the Recitation Finder

## Recitation Finder
Tap **Find a recitation** on the home screen, then the microphone, and hold the phone near a recitation
for 10–15 seconds. The phone's speech recognition (Chrome on Android, Safari on iPhone) turns the clip into
Arabic text, and the app matches it against the Quran text on the phone to find the surah and ayah.
You can then play the full surah, start near that ayah, or open it in the Mushaf.
You can also tap the **video button** to choose a clip from your camera roll, or (on Android, with the app
installed) share a video or voice note to the app from the Share menu. Saved clips are recognised on the phone
by a Quran speech model (downloaded once, about 63 MB). Links to audio or video files work too; TikTok,
Instagram and YouTube links can't be opened by other apps, so save those videos first and upload them.
You can also type requests such as "play Surah Al-Kahf mujawwad" or paste part of a verse.

## Credits
Speech model: [tarteel-ai/whisper-tiny-ar-quran](https://huggingface.co/tarteel-ai/whisper-tiny-ar-quran) (Apache 2.0),
browser version from [Sharjeelbaig/whisper-tiny-ar-quran-onnx](https://huggingface.co/Sharjeelbaig/whisper-tiny-ar-quran-onnx),
run with [Transformers.js](https://github.com/huggingface/transformers.js). Stored in `models/`.
Quran text: Uthmani text from The Noble Qur'an Encyclopedia (quranenc.com), via the
[quran-json](https://github.com/risan/quran-json) package by Risan Bagja Pradana, licensed CC BY 4.0.
