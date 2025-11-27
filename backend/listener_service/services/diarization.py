import numpy as np
import asyncio
import json
import soundfile as sf
import torch
from typing import List, Tuple, Dict, Optional
from resemblyzer import VoiceEncoder
from pathlib import Path
from utils.config import config
import logging

logger = logging.getLogger(__name__)


class DiarizationService:
    def __init__(self):
        self.voice_encoder = None
        self.pyannote_pipeline = None
        self.is_initialized = False

    async def initialize(self):
        if self.is_initialized:
            return
            
        await asyncio.get_event_loop().run_in_executor(None, self._load_models)
        self.is_initialized = True
        logger.info("Diarization models initialized")

    def _load_models(self):
        # Загружаем Resemblyzer для эмбеддингов
        device = "cuda" if torch.cuda.is_available() else "cpu"
        self.voice_encoder = VoiceEncoder(device=device)
        logger.info(f"Resemblyzer loaded on {device}")

        # Загружаем Pyannote для диаризации
        if config.HUGGINGFACE_TOKEN:
            try:
                from pyannote.audio import Pipeline
                self.pyannote_pipeline = Pipeline.from_pretrained(
                    "pyannote/speaker-diarization-3.1",
                    token=config.HUGGINGFACE_TOKEN
                )
                if torch.cuda.is_available():
                    self.pyannote_pipeline.to(torch.device("cuda"))
                logger.info("Pyannote pipeline loaded")
            except Exception as e:
                logger.warning(f"Could not load Pyannote: {e}")
        else:
            logger.warning("No HuggingFace token provided, Pyannote unavailable")

    async def perform_offline_diarization(self, audio_path: str, conversation_id: str) -> List[Tuple[float, float, str, float]]:
        """Выполняет оффлайн диаризацию всей записи"""
        if not self.is_initialized:
            await self.initialize()
            
        if not self.pyannote_pipeline:
            logger.error("Pyannote pipeline not available")
            return []
            
        try:
            return await asyncio.get_event_loop().run_in_executor(
                None, self._diarize_offline, audio_path, conversation_id
            )
        except Exception as e:
            logger.error(f"Offline diarization error: {e}")
            return []

    def _diarize_offline(self, audio_path: str, conversation_id: str) -> List[Tuple[float, float, str, float]]:
        """Синхронная оффлайн диаризация"""
        try:
            # Запускаем диаризацию
            audio_np, sr = sf.read(audio_path, always_2d=False, dtype="float32")

            if audio_np.ndim == 2:
                audio_np = np.mean(audio_np, axis=1)
        # ресемпл, если нужно (у вас уже 16 кГц, тогда блок можно опустить)
            if sr != 16000:
                import librosa
                audio_np = librosa.resample(audio_np, orig_sr=sr, target_sr=16000)
                sr = 16000

        # 2) добавляем ось канала -> (1, T)
            if audio_np.ndim == 1:
                audio_np = np.expand_dims(audio_np, 0)

            waveform = torch.from_numpy(audio_np)
            diarization = self.pyannote_pipeline({"waveform": waveform, "sample_rate": sr})

            if hasattr(diarization, "speaker_diarization"):
                annotation = diarization.speaker_diarization  # новый формат (DiarizeOutput)
            else:
                annotation = diarization  # старый формат (Annotation)
            
            # Конвертируем результат в список интервалов
            segments = []
            for turn, _, speaker in annotation.itertracks(yield_label=True):
                segments.append((
                    turn.start,
                    turn.end, 
                    f"CLUSTER_{speaker}",
                    1.0  # confidence from pyannote
                ))
                
            logger.info(f"Diarization completed: {len(segments)} segments, {len(set([s[2] for s in segments]))} speakers")
            return segments
            
        except Exception as e:
            logger.error(f"Pyannote diarization failed: {e}")
            return []

    def extract_speaker_embedding(self, audio_data: np.ndarray) -> Optional[np.ndarray]:
        """Извлекает эмбеддинг говорящего из аудио сегмента"""
        if not self.is_initialized or self.voice_encoder is None:
            return None
            
        try:
            if len(audio_data) < 1600:  # Минимум для Resemblyzer
                return None
                
            embedding = self.voice_encoder.embed_utterance(audio_data)
            return embedding
            
        except Exception as e:
            logger.error(f"Error extracting embedding: {e}")
            return None

    def compute_cluster_embeddings(self, audio_path: str, segments: List[Tuple[float, float, str, float]]) -> Dict[str, np.ndarray]:
        """Вычисляет эмбеддинги для каждого кластера"""
        try:
            audio_data, sr = sf.read(audio_path)

            if audio_data.ndim == 2:
                audio_data = np.mean(audio_data, axis=1)

            if sr != config.SAMPLE_RATE:
                import librosa
                audio_data = librosa.resample(audio_data, orig_sr=sr, target_sr=config.SAMPLE_RATE)
                
            cluster_embeddings = {}
            
            for start_time, end_time, cluster, _ in segments:
                start_sample = int(start_time * config.SAMPLE_RATE)
                end_sample = int(end_time * config.SAMPLE_RATE)
                
                segment_audio = audio_data[start_sample:end_sample]
                
                if len(segment_audio) > 1600:  # Минимум для эмбеддинга
                    embedding = self.extract_speaker_embedding(segment_audio)
                    if embedding is not None:
                        if cluster not in cluster_embeddings:
                            cluster_embeddings[cluster] = []
                        cluster_embeddings[cluster].append(embedding)
            
            # Усредняем эмбеддинги каждого кластера
            averaged_embeddings = {}
            for cluster, embeddings in cluster_embeddings.items():
                if embeddings:
                    averaged_embeddings[cluster] = np.mean(embeddings, axis=0)
                    
            return averaged_embeddings
            
        except Exception as e:
            logger.error(f"Error computing cluster embeddings: {e}")
            return {}

    def compare_embeddings(self, emb1: np.ndarray, emb2: np.ndarray) -> float:
        """Вычисляет косинусное сходство между эмбеддингами"""
        try:
            return float(np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2)))
        except:
            return 0.0

    def match_clusters_to_users(
        self, 
        cluster_embeddings: Dict[int, np.ndarray], 
        reference_embeddings: Dict[str, List[np.ndarray]]
    ) -> Dict[str, Tuple[Optional[str], float]]:
        """
        Сравнивает эмбеддинги кластеров с эталонными эмбеддингами юзеров.
        
        Возвращает словарь:
        {
            '0': ('user_uuid_string', 0.85),  # Кластер 0 - это User A с уверенностью 85%
            '1': (None, 0.0)                  # Кластер 1 - неизвестный
        }
        """
        matches = {}
        threshold = 0.70  # Порог уверенности (косинусное сходство)

        for cluster_id, cluster_emb in cluster_embeddings.items():
            best_user = None
            best_score = -1.0

            # Нормализуем вектор кластера (resemblyzer обычно выдает уже норм., но на всякий случай)
            cluster_emb = cluster_emb / np.linalg.norm(cluster_emb)

            # Перебираем всех юзеров из БД
            for user_id, user_embs_list in reference_embeddings.items():
                if not user_embs_list:
                    continue

                # Сравниваем с каждым эмбеддингом юзера (или со средним)
                # user_embs_list - это список векторов. Превращаем в матрицу.
                ref_matrix = np.array(user_embs_list)
                
                # Матричное умножение (dot product) для косинусного сходства
                # (т.к. векторы нормализованы, dot == cosine similarity)
                scores = np.inner(cluster_emb, ref_matrix)
                
                # Берем максимальное совпадение по всем семплам юзера
                current_score = np.max(scores)

                if current_score > best_score:
                    best_score = current_score
                    best_user = user_id

            # Проверяем порог
            if best_score >= threshold:
                matches[str(cluster_id)] = (best_user, float(best_score))
            else:
                matches[str(cluster_id)] = (None, 0.0)

        return matches

    async def shutdown(self):
        if self.voice_encoder:
            del self.voice_encoder
            self.voice_encoder = None
        if self.pyannote_pipeline:
            del self.pyannote_pipeline
            self.pyannote_pipeline = None
        self.is_initialized = False


diarization_service = DiarizationService()
