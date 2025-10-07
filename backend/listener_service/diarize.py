from pyannote.audio import Pipeline
import torch
from config import config

_pipeline = None
_model_name = config["models"]["diarization_model"]

def load_diarization_pipeline():
    global _pipeline
    if _pipeline is None:
        _pipeline = Pipeline.from_pretrained(_model_name)
        if torch.cuda.is_available():
            _pipeline = _pipeline.to(torch.device("cuda"))
    return _pipeline

def diarize_audio(audio_path: str):
    pipeline = load_diarization_pipeline()
    diarization = pipeline(audio_path)
    return diarization