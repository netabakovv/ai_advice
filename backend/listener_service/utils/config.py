import os
from dataclasses import dataclass
from typing import Optional
from dotenv import load_dotenv
load_dotenv()


@dataclass
class Config:
    DATABASE_URL: str = os.getenv("DATABASE_URL")

  # Audio storage
    MEDIA_STORAGE_PATH: str = os.getenv("MEDIA_STORAGE_PATH", "./media")
    
    # Audio processing
    SAMPLE_RATE: int = 16000
    CHUNK_DURATION: float = 8.0
    BUFFER_DURATION: float = 90.0
    OVERLAP_DURATION: float = 1.0
    
    # Whisper
    WHISPER_MODEL_SIZE: str = os.getenv("WHISPER_MODEL_SIZE", "base")
    WHISPER_DEVICE: str = os.getenv("WHISPER_DEVICE", "cpu")
    WHISPER_COMPUTE_TYPE: str = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
    WHISPER_LANGUAGE: str = "ru"
    
    # Diarization
    HUGGINGFACE_TOKEN: Optional[str] = os.getenv("HUGGINGFACE_TOKEN")
    SPEAKER_SIMILARITY_THRESHOLD: float = 0.82
    
    # VAD
    VAD_AGGRESSIVENESS: int = 2
    
    # WebSocket
    MAX_CONNECTIONS: int = 100
    CONNECTION_TIMEOUT: int = 300

    EXTERNAL_CALLBACK_URL: str = os.getenv("EXTERNAL_CALLBACK_URL", "http://localhost:8001/conversation_completed")


config = Config()