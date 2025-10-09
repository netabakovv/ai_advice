from pyannote.audio import Pipeline
import torch
import os
hf_token = "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"

_pipeline = None
_model_name = "pyannote/speaker-diarization-3.1"

def load_diarization_pipeline():
    global _pipeline
    if _pipeline is None:
        if not hf_token:
            raise RuntimeError(
                "Токен Hugging Face не найден. Установите переменную HUGGINGFACE_HUB_TOKEN "
                "или добавьте token в config.yaml"
            )

        _pipeline = Pipeline.from_pretrained(
            _model_name,
            token=hf_token  # ← КЛЮЧЕВОЙ момент
        )
        if torch.cuda.is_available():
            _pipeline = _pipeline.to(torch.device("cuda"))
            print("✅ Диаризация будет использовать GPU")
        else:
            print("⚠️ Диаризация на CPU (медленно)")
    return _pipeline

def diarize_audio(audio_path: str):
    pipeline = load_diarization_pipeline()
    diarization = pipeline(audio_path)
    return diarization