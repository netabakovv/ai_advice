import numpy as np
import asyncio
import webrtcvad
import soundfile as sf
from collections import deque
from pathlib import Path
from utils.config import config
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
        
        # VAD
        self.vad = webrtcvad.Vad(config.VAD_AGGRESSIVENESS)
        self.last_phrase_end_time = 0.0
        
        # Buffer management
        self.chunk_size = int(self.sample_rate * self.chunk_duration)
        self.max_buffer_size = int(self.sample_rate * self.buffer_duration)
        self.overlap_size = int(self.sample_rate * self.overlap_duration)

        self.last_processed_time = 0.0

    def add_audio_chunk(self, audio_data: bytes, timestamp: float) -> bool:
        try:
            audio_array = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0
            
            # Add to processing buffer
            self.audio_buffer.extend(audio_array)
            
            # Add to full recording
            self.full_recording.extend(audio_array)
            
            self.total_samples += len(audio_array)
            '''
            ready = False
            if len(self.audio_buffer) >= self.chunk_size + self.overlap_size:
                ready = True
            return ready
            '''

            return len(self.audio_buffer) >= self.chunk_size
            
        except Exception as e:
            logger.error(f"Error adding audio chunk: {e}")
            return False

    def get_processing_chunk(self):
        if len(self.audio_buffer) < self.chunk_size:
            return None, 0.0, 0.0
        
        chunk_start = self.last_processed_time
        chunk_end = chunk_start + self.chunk_duration

        '''
        total_size = self.chunk_size + self.overlap_size
        if len(self.audio_buffer) < total_size:
            total_size = len(self.audio_buffer)
        '''

        chunk_data = np.array(list(self.audio_buffer)[:self.chunk_size])

        for _ in range(self.chunk_size):
            self.audio_buffer.popleft()

        self.last_processed_time = chunk_end

        return chunk_data, chunk_start, chunk_end

        '''
        if self.start_time == 0:
            chunk_data = np.array(list(self.audio_buffer)[:self.chunk_size])
            chunk_start = 0.0
            chunk_end = self.chunk_duration

            for _ in range(self.chunk_size):
                self.audio_buffer.popleft()
            self.start_time = chunk_end - self.overlap_duration
        else:
            total_size = self.chunk_size + self.overlap_size
            if len(self.audio_buffer) < total_size:
                return None, self.start_time, self.start_time + self.chunk_duration
            chunk_data = np.array(list(self.audio_buffer)[:total_size])
            chunk_start = self.start_time
            chunk_end = chunk_start + self.chunk_duration

            for _ in range(self.chunk_size):
                self.audio_buffer.popleft()
            self.start_time = chunk_end - self.overlap_duration
        
        return chunk_data, chunk_start, chunk_end
        
        
        chunk_start = self.start_time
        chunk_end = chunk_start + self.chunk_duration

        if self.start_time > 0:
            chunk_data = np.array(list(self.audio_buffer)[:self.chunk_size + self.overlap_size])
            actual_start = max(0, chunk_start - self.overlap_duration)
        else:
            chunk_data = np.array(list(self.audio_buffer)[:self.chunk_size])
            actual_start = chunk_start

        samples_to_remove = max(1, self.chunk_size - self.overlap_size)
        for _ in range(min(samples_to_remove, len(self.audio_buffer))):
            self.audio_buffer.popleft()

        self.start_time = chunk_end - self.overlap_duration
        return chunk_data, actual_start, chunk_end
        '''

    '''
    def detect_voice_activity(self, audio_chunk):
        if len(audio_chunk) == 0:
            return []
            
        frame_duration = 30
        frame_size = int(self.sample_rate * frame_duration / 1000)
        voice_segments = []
        current_segment_start = None

        for i in range(0, len(audio_chunk) - frame_size + 1, frame_size):
            frame = audio_chunk[i:i + frame_size]
            frame_pcm = (frame * 32768.0).astype(np.int16).tobytes()
            
            try:
                is_speech = self.vad.is_speech(frame_pcm, self.sample_rate)
                timestamp = i / self.sample_rate
                
                if is_speech and current_segment_start is None:
                    current_segment_start = timestamp
                elif not is_speech and current_segment_start is not None:
                    voice_segments.append((current_segment_start, timestamp))
                    current_segment_start = None
                    
            except Exception as e:
                logger.warning(f"VAD error: {e}")
                continue

        if current_segment_start is not None:
            voice_segments.append((current_segment_start, len(audio_chunk) / self.sample_rate))

        return voice_segments
    '''

    def should_merge_with_previous(self, current_text: str, time_gap: float) -> bool:
        return time_gap < 0.5

    '''
    def is_incomplete_sentence(self, text: str) -> bool:
        t = text.strip().lower()
        return any([
            t and t[0].islower(),
            t and t[-1] not in '.!?',
            len(t.split()) < 3,
            any(t.startswith(w) for w in ['и', 'но', 'а', 'также', 'то', 'затем'])
        ])
    '''

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
        max_samples = int(self.sample_rate * self.buffer_duration * 2)
        if len(self.audio_buffer) > max_samples:
            excess = len(self.audio_buffer) - max_samples
            for _ in range(excess):
                self.audio_buffer.popleft()

class BufferManager:
    def __init__(self):
        self.buffers = {}
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

buffer_manager = BufferManager()
