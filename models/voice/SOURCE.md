# Voice model (Step 7 of the recognition engine)

- **Model:** CAM++ speaker embedding, `iic/speech_campplus_sv_zh_en_16k-common_advanced` from the 3D-Speaker project
  (Alibaba DAMO / ModelScope), licensed under the Apache License 2.0.
- **ONNX file:** the sherpa-onnx export `3dspeaker_speech_campplus_sv_zh_en_16k-common_advanced.onnx` (k2-fsa/sherpa-onnx
  release "speaker-recongition-models", Apache License 2.0).
- **This copy:** 8-bit weights (`onnxruntime.quantization.quantize_dynamic`, QUInt8), 8.6 MB instead of 28 MB. This is the
  same conversion that was measured in `.github/workflows/engine-voice.yml`.
- **Input:** 80-band Kaldi filterbank at 16 kHz, mean-normalised (`VOICE.fbank` in `js/engine/voice.js`). **Output:** a
  192-dimensional vector.
- **reference.json:** 4 k-means centroids of the vectors of 495 Abdul Basit samples from 180 archive recordings
  (1950s–1980s), plus the threshold. It is built by `tools/engine/eval/voice_score.py --export`. The measurements are in
  `docs/RECOGNITION-VOICE.md`.
