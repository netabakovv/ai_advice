import asyncio
import numpy as np
from faster_whisper import WhisperModel
from utils.config import config
import logging

logger = logging.getLogger(__name__)

class TranscriptionService:
    def __init__(self):
        self.model = None
        self.model_lock = asyncio.Lock()
        self.is_initialized = False

    async def initialize(self):
        if self.is_initialized:
            return
            
        async with self.model_lock:
            if not self.is_initialized:
                await asyncio.get_event_loop().run_in_executor(None, self._load_model)
                self.is_initialized = True
                logger.info(f"Whisper {config.WHISPER_MODEL_SIZE} initialized for RU")

    def _load_model(self):
        self.model = WhisperModel(
            config.WHISPER_MODEL_SIZE,
            device=config.WHISPER_DEVICE,
            compute_type=config.WHISPER_COMPUTE_TYPE
        )

    async def transcribe_with_context(self, audio_data: np.ndarray, previous_text: str = ""):
        if not self.is_initialized:
            await self.initialize()
            
        try:
            return await asyncio.get_event_loop().run_in_executor(
                None, self._transcribe_sync, audio_data, previous_text
            )
        except Exception as e:
            logger.error(f"Transcription error: {e}")
            return []
    
    def _transcribe_sync(self, audio_data: np.ndarray, previous_text: str):
        initial_prompt = previous_text[-80:].strip()
            
        segments, info = self.model.transcribe(
            audio_data,
            language=config.WHISPER_LANGUAGE,
            initial_prompt=initial_prompt,
            word_timestamps=True,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=600)
        )
        
        results = []
        for seg in segments:
            conf = 0.0
            if hasattr(seg, "words") and seg.words:
                probs = [getattr(w, "probability", 0.0) for w in seg.words if hasattr(w, "probability")]
                conf = float(np.mean(probs)) if probs else 0.0
                
            results.append((seg.text.strip(), float(seg.start), float(seg.end), conf))
            
        return results

    async def shutdown(self):
        if self.model:
            del self.model
            self.model = None
            self.is_initialized = False

transcription_service = TranscriptionService()
