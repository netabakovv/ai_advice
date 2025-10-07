import whisper
from config import config

_model = None
_model_name = config["models"]["whisper_model"]

def load_model():
    global _model
    if _model is None:
        _model = whisper.load_model(_model_name)
    return _model

def transcribe_audio(audio_path: str):
    model = load_model()
    result = model.transcribe(audio_path, language=None, fp16=False)
    return result