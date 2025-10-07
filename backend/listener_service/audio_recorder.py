# audio_recorder.py
import pyaudio
import wave
import threading
import os
import time
from logger import setup_logger

logger = setup_logger("audio_recorder")

class DualTrackRecorder:
    def __init__(self, output_dir="recordings"):
        self.output_dir = output_dir
        self.is_recording = False
        os.makedirs(output_dir, exist_ok=True)
        self.p = pyaudio.PyAudio()
        self.sample_rate = 16000
        self.channels = 1
        self.chunk = 1024

    def find_input_device(self):
        try:
            default = self.p.get_default_input_device_info()
            logger.info(f"Микрофон по умолчанию: [{default['index']}] {default['name']}")
            return default['index']
        except Exception as e:
            logger.error(f"Не удалось найти микрофон: {e}")
            raise

    def find_loopback_device(self):
        logger.info("🔍 Поиск loopback-устройства с поддержкой 16000 Гц...")

        try:
            wasapi_info = self.p.get_host_api_info_by_type(pyaudio.paWASAPI)
            wasapi_index = wasapi_info['index']
            logger.info(f"WASAPI доступен (индекс: {wasapi_index})")
        except OSError:
            logger.warning("WASAPI не поддерживается")
            return None

        candidate = None
        for i in range(self.p.get_device_count()):
            dev = self.p.get_device_info_by_index(i)
            if dev['hostApi'] != wasapi_index:
                continue
            if dev['maxInputChannels'] <= 0:
                continue

            name = dev['name']
            name_lower = name.lower()

            # Пропускаем явные микрофоны (даже с битой кодировкой)
            mic_indicators = ['microphone', 'mic', 'input', 'вход']
            if any(ind in name_lower for ind in mic_indicators):
                logger.debug(f"Пропущено (микрофон): [{i}] '{name}'")
                continue

            # Проверяем, поддерживает ли устройство 16000 Гц
            try:
                supported = self.p.is_format_supported(
                    rate=16000,
                    input_device=i,
                    input_channels=1,
                    input_format=pyaudio.paInt16
                )
                if supported:
                    logger.info(f"✅ НАЙДЕНО loopback: [{i}] '{name}' (поддерживает 16000 Гц)")
                    return i
                else:
                    logger.debug(f"Пропущено (не поддерживает 16000 Гц): [{i}] '{name}'")
            except Exception as e:
                logger.debug(f"Не удалось проверить частоту для [{i}] '{name}': {e}")

            # Запоминаем первое подходящее по имени устройство как fallback
            loopback_indicators = ['loopback', 'stereo', 'mix', 'воспроизведение', 'output', 'playback', 'headphones', 'динамики']
            if any(ind in name_lower for ind in loopback_indicators):
                candidate = i
                candidate_name = name

        if candidate is not None:
            logger.warning(f"⚠️ Используем fallback loopback (без проверки 16000 Гц): [{candidate}] '{candidate_name}'")
            return candidate

        logger.error("❌ Не найдено loopback-устройство, поддерживающее 16000 Гц")
        return None

    def save_wav(self, frames, filename):
        path = os.path.join(self.output_dir, filename)
        with wave.open(path, 'wb') as wf:
            wf.setnchannels(self.channels)
            wf.setsampwidth(self.p.get_sample_size(pyaudio.paInt16))
            wf.setframerate(self.sample_rate)
            wf.writeframes(b''.join(frames))
        logger.info(f"💾 Аудиофайл сохранён: {path}")
        return path

    def start_recording(self, duration_sec):
        if self.is_recording:
            raise RuntimeError("Already recording")

        mic_index = self.find_input_device()
        loopback_index = self.find_loopback_device()

        if loopback_index is None:
            raise RuntimeError(
                "Не найдено устройство для записи системного звука. "
                "Включите 'Stereo Mix' или установите VB-Cable."
            )

        mic_stream = self.p.open(
            format=pyaudio.paInt16,
            channels=self.channels,
            rate=self.sample_rate,
            input=True,
            input_device_index=mic_index,
            frames_per_buffer=self.chunk
        )

        loopback_stream = self.p.open(
            format=pyaudio.paInt16,
            channels=self.channels,
            rate=self.sample_rate,
            input=True,
            input_device_index=loopback_index,
            frames_per_buffer=self.chunk
        )

        self.is_recording = True
        user_frames = []
        remote_frames = []

        start_time = time.time()
        while self.is_recording and (time.time() - start_time) < duration_sec:
            try:
                mic_data = mic_stream.read(self.chunk, exception_on_overflow=False)
                lb_data = loopback_stream.read(self.chunk, exception_on_overflow=False)
                user_frames.append(mic_data)
                remote_frames.append(lb_data)
            except Exception as e:
                logger.error(f"Ошибка записи: {e}")
                break

        mic_stream.stop_stream()
        mic_stream.close()
        loopback_stream.stop_stream()
        loopback_stream.close()

        timestamp = int(time.time())
        user_path = self.save_wav(user_frames, f"user_{timestamp}.wav")
        remote_path = self.save_wav(remote_frames, f"remote_{timestamp}.wav")

        self.is_recording = False
        return user_path, remote_path

    def stop(self):
        self.is_recording = False
        logger.info("⏹️ Запись остановлена по запросу")