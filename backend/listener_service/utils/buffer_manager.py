import itertools
import aiohttp
import json
import numpy as np
import asyncio
import webrtcvad
import soundfile as sf
from collections import deque
from pathlib import Path
from utils.config import config
from typing import Dict
import logging

logger = logging.getLogger(__name__)

class AudioBuffer:
    def __init__(self, conversation_id: str):
        self.conversation_id = conversation_id
        self.sample_rate = config.SAMPLE_RATE
        self.chunk_duration = config.CHUNK_DURATION
        self.buffer_duration = config.BUFFER_DURATION
        self.overlap_duration = config.OVERLAP_DURATION
        
        # Audio data storage
        self.audio_buffer = deque()
        self.full_recording = []  # Сохраняем всю запись для оффлайн обработки
        self.total_samples = 0
        self.start_time = 0.0

        self.prev_chunk_tail = np.array([], dtype=np.float32)
        
        # VAD
        self.vad = webrtcvad.Vad(config.VAD_AGGRESSIVENESS)
        self.last_phrase_end_time = 0.0
        
        # Buffer management
        self.chunk_size = int(self.sample_rate * self.chunk_duration)
        self.max_buffer_size = int(self.sample_rate * self.buffer_duration)
        self.overlap_size = int(self.sample_rate * self.overlap_duration)

        self.last_processed_end_time = 0.0

        self.is_finished = False

    def mark_finished(self):
        self.is_finished = True
    
    def is_empty(self):
        return len(self.audio_buffer) < self.chunk_size

    def add_audio_chunk(self, audio_data: bytes, timestamp: float) -> bool:
        if self.is_finished:
            return
        
        try:
            audio_array = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0
            
            # Add to processing buffer
            self.audio_buffer.extend(audio_array)
            
            # Add to full recording
            self.full_recording.extend(audio_array)
            
            self.total_samples += len(audio_array)

            return len(self.audio_buffer) >= self.chunk_size
            
        except Exception as e:
            logger.error(f"Error adding audio chunk: {e}")
            return False

    def get_processing_chunk(self):
        buffer_len = len(self.audio_buffer)

        if buffer_len < self.chunk_size and not self.is_finished:
            return None, 0.0, 0.0
        
        if buffer_len == 0:
            return None, 0.0, 0.0
        
        take_size = min(buffer_len, self.chunk_size)

        new_data = np.array(list(itertools.islice(self.audio_buffer, 0, take_size)), dtype=np.float32)
        
        for _ in range(take_size):
            self.audio_buffer.popleft()
        
        processing_audio = np.concatenate([self.prev_chunk_tail, new_data])

        chunk_start_time = self.last_processed_end_time 
        chunk_end_time = chunk_start_time + (len(new_data) / self.sample_rate)

        audio_start_absolute = chunk_start_time - (len(self.prev_chunk_tail) / self.sample_rate)

        self.last_processed_end_time = chunk_end_time

        if len(processing_audio) >= self.overlap_size:
            self.prev_chunk_tail = processing_audio[-self.overlap_size:]
        else:
            self.prev_chunk_tail = processing_audio # Если данных очень мало, сохраняем всё

        return processing_audio, audio_start_absolute, chunk_end_time

    def should_merge_with_previous(self, current_text: str, time_gap: float) -> bool:
        return time_gap < 0.5


    def save_full_recording(self) -> str:
        """Сохраняет полную запись в файл для оффлайн обработки"""
        if not self.full_recording:
            return None
            
        media_dir = Path(config.MEDIA_STORAGE_PATH)
        media_dir.mkdir(exist_ok=True)
        
        filename = f"{self.conversation_id}.wav"
        filepath = media_dir / filename
        
        audio_array = np.array(self.full_recording, dtype=np.float32)
        sf.write(filepath, audio_array, self.sample_rate)
        
        return str(filepath)

    def cleanup_old_data(self):
        '''
        max_samples = int(self.sample_rate * self.buffer_duration * 2)
        if len(self.audio_buffer) > max_samples:
            excess = len(self.audio_buffer) - max_samples
            for _ in range(excess):
                self.audio_buffer.popleft()
        '''
        pass

class BufferManager:
    def __init__(self):
        self.buffers: Dict[str, AudioBuffer] = {}
        self.latest_scores: Dict[str, dict] = {}
        self.phrase_cache: Dict[str, dict] = {}
        self.cleanup_task = None

    def get_buffer(self, conversation_id: str) -> AudioBuffer:
        if conversation_id not in self.buffers:
            self.buffers[conversation_id] = AudioBuffer(conversation_id)
        return self.buffers[conversation_id]

    def remove_buffer(self, conversation_id: str):
        if conversation_id in self.buffers:
            del self.buffers[conversation_id]

    async def start_cleanup_task(self):
        if self.cleanup_task is None:
            self.cleanup_task = asyncio.create_task(self._cleanup_loop())

    async def _cleanup_loop(self):
        while True:
            try:
                await asyncio.sleep(60)
                for buffer in self.buffers.values():
                    buffer.cleanup_old_data()
            except asyncio.CancelledError:
                break

    def stop_cleanup_task(self):
        if self.cleanup_task:
            self.cleanup_task.cancel()
            self.cleanup_task = None

    def has_pending_chunks(self, conversation_id: str) -> bool:
        """Есть ли чанки в обработке"""
        if conversation_id not in self.buffers:
            return False
        
        buffer_data = self.buffers[conversation_id]
        if hasattr(buffer_data, 'audio_buffer'):
            return len(buffer_data.audio_buffer) > 0
        return False


    async def analyze_realtime(self, conversation_id: str, text_chunk: str, agenda: str = "") -> dict:
        """Ollama реал-тайм анализ оффтопа + КЭШ + ЭВРИСТИКА"""
        if not text_chunk.strip() or not agenda:
            return {"score": 1.0, "offtopic": False, "reason": "empty"}
        
        # 🆕 КЭШ по тексту (мгновенно!)
        cache_key = text_chunk[:50].lower()
        if hasattr(self, 'phrase_cache') and cache_key in self.phrase_cache:
            return self.phrase_cache[cache_key]
        
        # 🆕 МОЛНИЕНОСНАЯ ЭВРИСТИКА (0.01мс)
        text_lower = text_chunk.lower()
        
        # 🚨 МАТ (0.1)
        bad_words = ['бля', 'пиздец', 'хуй', 'пизда', 'нахуй', 'ебать', 'ёбан']
        if any(word in text_lower for word in bad_words):
            result = {"score": 0.1, "offtopic": True, "reason": "мат"}
            if not hasattr(self, 'phrase_cache'):
                self.phrase_cache = {}
            self.phrase_cache[cache_key] = result
            return result
        
        # ✅ AGENDA (0.95)
        agenda_words = ['продаж', 'бюджет', 'q4', 'задач', 'план']
        if any(word in text_lower for word in agenda_words):
            result = {"score": 0.95, "offtopic": False, "reason": "agenda_match"}
            if not hasattr(self, 'phrase_cache'):
                self.phrase_cache = {}
            self.phrase_cache[cache_key] = result
            return result
        
        # 🗣️ Small talk (0.3)
        small_talk = ['привет', 'как дела', 'погода', 'анекдот', 'что делаешь']
        if any(st in text_lower for st in small_talk):
            result = {"score": 0.3, "offtopic": True, "reason": "small_talk"}
            if not hasattr(self, 'phrase_cache'):
                self.phrase_cache = {}
            self.phrase_cache[cache_key] = result
            return result
        
        # 🆕 OLLAMA (если эвристика не сработала)
        prompt = f"""Agenda: {agenda}
    Последние 10 сек: {text_chunk}

    Верни ТОЛЬКО JSON:
    {{"score": 0.7, "offtopic": true, "reason": "1-2 слова"}}"""
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{config.OLLAMA_URL}/api/generate",
                    json={
                        "model": config.OLLAMA_MODEL,
                        "prompt": prompt,
                        "stream": False,
                        "format": "json",
                        "options": {"temperature": 0.1}
                    },
                    timeout=aiohttp.ClientTimeout(total=8)
                ) as resp:
                    if resp.status != 200:
                        logger.error(f"Ollama HTTP {resp.status}")
                        return {"score": 0.5, "offtopic": True, "reason": "ollama_unavailable"}
                    
                    result = await resp.json()
                    response_text = result.get("response", "{}")
                    
                    try:
                        score_data = json.loads(response_text)
                        logger.info(f"🤖 OLLAMA: '{text_chunk[:30]}...' → score={score_data['score']:.2f}")
                        
                        # Кэшируем OLLAMA результат
                        if not hasattr(self, 'phrase_cache'):
                            self.phrase_cache = {}
                        self.phrase_cache[cache_key] = score_data
                        return score_data
                    except json.JSONDecodeError:
                        logger.warning(f"Ollama не JSON: {response_text[:50]}")
                        return {"score": 0.5, "offtopic": True, "reason": "json_error"}
                        
        except asyncio.TimeoutError:
            logger.warning("Ollama timeout")
            return {"score": 0.5, "offtopic": True, "reason": "timeout"}
        except Exception as e:
            logger.error(f"Ollama error: {e}")
            return {"score": 0.5, "offtopic": True, "reason": "ollama_error"}

    
    def get_latest_score(self, conversation_id: str) -> dict:
        """Для /ws/live модератора"""
        score = self.latest_scores.get(conversation_id, {"score": 1.0, "offtopic": False, "reason": "no_analysis"})
        logger.debug(f"📊 LIVE CHECK: {conversation_id[:8]} score={score['score']:.2f}")
        return score

buffer_manager = BufferManager()
