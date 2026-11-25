#!/bin/bash
# Convert a Hugging Face Whisper model to the layout transformers.js reads (the app's models/<name>/):
#   onnx/encoder_model.onnx (+ _quantized), onnx/decoder_model_merged_quantized.onnx (8-bit), tokenizer and configs.
#   bash convert_model.sh tarteel-ai/whisper-base-ar-quran models/whisper-base-ar-quran
set -e
SRC=$1; DST=$2
pip install -q "torch==2.5.1" --index-url https://download.pytorch.org/whl/cpu
pip install -q "optimum[onnxruntime]==1.23.3" "transformers==4.46.3" "onnx==1.17.0" "onnxruntime==1.20.1"
optimum-cli export onnx --model "$SRC" --task automatic-speech-recognition-with-past _out
python3 - <<PY
from onnxruntime.quantization import quantize_dynamic, QuantType
quantize_dynamic('_out/decoder_model_merged.onnx', '_out/decoder_model_merged_quantized.onnx', weight_type=QuantType.QUInt8)
quantize_dynamic('_out/encoder_model.onnx', '_out/encoder_model_quantized.onnx', weight_type=QuantType.QUInt8)
PY
mkdir -p "$DST/onnx"
cp _out/*.json _out/merges.txt _out/vocab.json "$DST/" 2>/dev/null || true
cp _out/encoder_model.onnx _out/encoder_model_quantized.onnx _out/decoder_model_merged_quantized.onnx "$DST/onnx/"
ls -la "$DST" "$DST/onnx"
