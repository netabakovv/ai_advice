import asyncio
import numpy as np
import torch
import hdbscan
import aiohttp
from sqlalchemy.orm import Session
from resemblyzer import VoiceEncoder, preprocess_wav
from models.database import get_db, Conversation, Phrase, Speaker, User, VoiceProfile, VoiceEmbedding
from services.transcription import transcription_service
from services.diarization import diarization_service
from utils.buffer_manager import buffer_manager
from utils.config import config
import logging
import uuid
import json
from datetime import datetime
from typing import Dict, List

logger = logging.getLogger(__name__)
encoder = VoiceEncoder(device="cuda" if torch.cuda.is_available() else "cpu")


class AudioProcessingService:
    def __init__(self):
        self.active_conversations = {}
        self.processing_tasks = {}

    async def start_conversation(self, conversation_id: str, db: Session) -> Conversation:
        """Запускает новую беседу"""
        conv = Conversation(
            id=uuid.UUID(conversation_id) if conversation_id else uuid.uuid4(),
            status="active"
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)
        
        # Инициализируем сервисы
        await transcription_service.initialize()
        await buffer_manager.start_cleanup_task()
        
        # Запускаем фоновую обработку
        self.active_conversations[str(conv.id)] = {
            'conversation': conv,
            'last_activity': datetime.utcnow(),
            'chunk_sequence': 0,
            'previous_text': ''
        }
        
        self.processing_tasks[str(conv.id)] = asyncio.create_task(
            self._process_conversation(str(conv.id))
        )
        
        logger.info(f"Started conversation {conv.id}")
        return conv

    async def process_audio_chunk(self, conversation_id: str, audio_data: bytes, timestamp: float):
        """Обрабатывает входящий аудио чанк"""
        if conversation_id not in self.active_conversations:
            logger.warning(f"Audio for inactive conversation {conversation_id}")
            return
            
        audio_buffer = buffer_manager.get_buffer(conversation_id)
        
        if audio_buffer.add_audio_chunk(audio_data, timestamp):
            conv_info = self.active_conversations[conversation_id]
            conv_info['last_activity'] = datetime.utcnow()
            conv_info['chunk_sequence'] += 1

    async def _process_conversation(self, conversation_id: str):
        """Основной цикл обработки беседы"""
        logger.info(f"Processing loop started for {conversation_id}")
        
        while conversation_id in self.active_conversations:
            try:
                await self._process_next_chunk(conversation_id)
                await asyncio.sleep(0.25)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Processing error for {conversation_id}: {e}")
                await asyncio.sleep(0.5)

    async def _process_next_chunk(self, conversation_id: str):
        """Обрабатывает следующий доступный аудио чанк"""
        audio_buffer = buffer_manager.get_buffer(conversation_id)
        conv_info = self.active_conversations[conversation_id]
        
        audio_chunk, chunk_start, chunk_end = audio_buffer.get_processing_chunk()
        if audio_chunk is None or len(audio_chunk) == 0:
            return
        
        '''
        # Детекция голосовой активности
        voice_segments = audio_buffer.detect_voice_activity(audio_chunk)
        if not voice_segments:
            return
        '''
        sr = audio_buffer.sample_rate
        segment_duration = len(audio_chunk) / sr

        # Обрабатываем каждый голосовой сегмент
        await self._process_voice_segment(
                conversation_id, audio_chunk, chunk_start, 0.0, segment_duration
        )

    async def _process_voice_segment(self, conversation_id: str, audio_chunk: np.ndarray,
                                   chunk_start: float, segment_start: float, segment_end: float):
        """Обрабатывает голосовой сегмент"""
        conv_info = self.active_conversations[conversation_id]
        
        # Извлекаем аудио сегмент
        sr = 16000
        start_sample = int(segment_start * sr)
        end_sample = int(segment_end * sr)
        segment_audio = audio_chunk[start_sample:end_sample]
        
        if len(segment_audio) < 1600:
            return
            
        # Транскрибация
        transcription_results = await transcription_service.transcribe_with_context(
            segment_audio, 
            previous_text=conv_info['previous_text']
        )
        
        if not transcription_results:
            return
            
        # Сохранение в БД (без определения спикера)
        await self._store_transcription_results(
            conversation_id, transcription_results, 
            chunk_start, conv_info['chunk_sequence'], segment_audio
        )
        
        # Обновляем контекст
        for text, _, _, _ in transcription_results:
            conv_info['previous_text'] += ' ' + text
            
        if len(conv_info['previous_text']) > 200:
            conv_info['previous_text'] = conv_info['previous_text'][-200:]

    def _get_diarization_segments(self, audio_data: np.ndarray, sample_rate: int = 16000):
        try:
            wav = preprocess_wav(audio_data, source_sr=sample_rate)
            window_duration = 0.8
            step = 0.4
            slices, times = [], []
            t = 0.0

            while t + window_duration < len(wav) / sample_rate:
                start = int(t * sample_rate)
                end = int((t + window_duration) * sample_rate)
                slices.append(wav[start:end])
                times.append((t, t + window_duration))
                t += step

            if not slices:
                return [(0, len(wav) / sample_rate, 0)]

            embeds = np.stack([encoder.embed_utterance(s) for s in slices])
            clusterer = hdbscan.HDBSCAN(min_cluster_size=3, metric="euclidean")
            labels = clusterer.fit_predict(embeds)
            if np.all(labels == -1):
                labels[:] = 0

            diarization_segments = []
            for i, label in enumerate(labels):
                start, end = times[i]
                diarization_segments.append((start, end, int(label if label >= 0 else 0)))

            return diarization_segments

        except Exception as e:
            logger.warning(f"Диаризация не удалась: {e}")
            return [(0, len(audio_data) / sample_rate, 0)]

    async def _store_transcription_results(self, conversation_id: str, transcription_results: List,
                                         segment_start_time: float, chunk_sequence: int, audio_data: np.ndarray = None, sample_rate: int = 16000):
        """Сохраняет результаты транскрибации в БД"""
        db = next(get_db())
        
        try:
            audio_buffer = buffer_manager.get_buffer(conversation_id)

            '''
            if audio_data is not None:
                diarization_segments = self._get_diarization_segments(audio_data, sample_rate)
            else:
                diarization_segments = [(0, 9999, 0)]
            '''

            merged_segments = []
            current = None
            
            for (text, rel_start, rel_end, confidence) in transcription_results:
                abs_start = segment_start_time + rel_start
                abs_end = segment_start_time + rel_end
                text = text.strip()
                
                '''
                mid = (rel_start + rel_end) / 2.0
                spk = 0
                for (s, e, sid) in diarization_segments:
                    if s <= mid <= e:
                        spk = sid
                        break
                '''
                if not current:
                    current = dict(
                        start=abs_start,
                        end=abs_end,
                        text=text,
                        confidence=confidence
                    )
                    continue

                #same_speaker = spk == current["speaker_id"]
                short_pause = abs_start - current["end"] < 0.4

            # Если пауза между фразами меньше 0.4 с → объединяем
                if short_pause:
                    current["end"] = abs_end
                    current["text"] = (current["text"] + " " + text).strip()
                    current["confidence"] = (current["confidence"] + confidence) / 2
                else:
                    merged_segments.append(current)
                    current = dict(
                        start=abs_start,
                        end=abs_end,
                        text=text,
                        confidence=confidence
                    )

            if current:
                merged_segments.append(current)

        # Записываем каждую итоговую фразу отдельно
            for seg in merged_segments:
                phrase = Phrase(
                    conversation_id=uuid.UUID(conversation_id),
                    text=seg["text"],
                    start_time=seg["start"],
                    end_time=seg["end"],
                    confidence=seg["confidence"],
                    chunk_sequence=chunk_sequence,
                    language="ru",
                    is_final=False,
                    needs_merge=False,
                    speaker_id=None,  # заполним позже через pyannote
                )

                db.add(phrase)
                db.commit()
                audio_buffer.last_phrase_end_time = seg["end"]
                
        except Exception as e:
            db.rollback()
            logger.error(f"Error storing transcription: {e}")
        finally:
            db.close()

    async def end_conversation(self, conversation_id: str, db: Session):
        """Завершает беседу и запускает оффлайн обработку"""
        if conversation_id not in self.active_conversations:
            return
            
        # Останавливаем обработку
        if conversation_id in self.processing_tasks:
            self.processing_tasks[conversation_id].cancel()
            del self.processing_tasks[conversation_id]
            
        # Сохраняем полную запись
        audio_buffer = buffer_manager.get_buffer(conversation_id)
        media_path = audio_buffer.save_full_recording()
        
        # Обновляем беседу
        conv = db.query(Conversation).filter(
            Conversation.id == uuid.UUID(conversation_id)
        ).first()
        
        if conv and media_path:
            conv.status = "processing"
            conv.media_uri = media_path
            conv.total_duration = len(audio_buffer.full_recording) / audio_buffer.sample_rate
            db.commit()
            
            # Запускаем оффлайн диаризацию
            asyncio.create_task(self._perform_offline_diarization(conversation_id, media_path))
        
        # Очистка
        buffer_manager.remove_buffer(conversation_id)
        if conversation_id in self.active_conversations:
            del self.active_conversations[conversation_id]
            
        logger.info(f"Conversation {conversation_id} ended, offline processing started")

    async def _perform_offline_diarization(self, conversation_id: str, media_path: str):
        """Выполняет оффлайн диаризацию и сопоставление с эталонными голосами"""
        db = next(get_db())
        
        try:
            logger.info(f"Starting offline diarization for {conversation_id}")
            
            # Инициализируем сервис диаризации
            await diarization_service.initialize()
            
            # Выполняем диаризацию
            segments = await diarization_service.perform_offline_diarization(media_path, conversation_id)
            
            if not segments:
                logger.warning(f"No diarization segments for {conversation_id}")
                return
                
            # Вычисляем эмбеддинги кластеров
            cluster_embeddings = await asyncio.get_event_loop().run_in_executor(
                None, diarization_service.compute_cluster_embeddings, media_path, segments
            )
            
            # Загружаем эталонные голоса
            reference_embeddings = await self._load_reference_embeddings(db)
            
            # Сопоставляем кластеры с пользователями
            cluster_matches = diarization_service.match_clusters_to_users(
                cluster_embeddings, reference_embeddings
            )
            
            # Создаем спикеров в БД
            speakers_map = {}
            for cluster, (user_id, confidence) in cluster_matches.items():
                speaker = Speaker(
                    conversation_id=uuid.UUID(conversation_id),
                    user_id=uuid.UUID(user_id) if user_id else None,
                    cluster_label=cluster,
                    confidence=confidence
                )
                
                if user_id:
                    user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
                    if user:
                        speaker.identified_name = user.display_name
                
                db.add(speaker)
                db.flush()
                speakers_map[cluster] = speaker.id
            
            # Обновляем фразы с информацией о спикерах
            await self._assign_speakers_to_phrases(db, conversation_id, segments, speakers_map)
            
            # Финальная склейка фраз одного спикера
            await self._final_phrase_merge(db, conversation_id)
            
            # Помечаем беседу как завершенную
            conv = db.query(Conversation).filter(
                Conversation.id == uuid.UUID(conversation_id)
            ).first()
            if conv:
                conv.status = "completed"
                db.commit()
                
            logger.info(f"Offline diarization completed for {conversation_id}")

            await self._notify_external_service(conversation_id)
            
        except Exception as e:
            logger.error(f"Offline diarization failed for {conversation_id}: {e}")
            db.rollback()
        finally:
            db.close()

    async def _notify_external_service(self, conversation_id: str):
        url = config.EXTERNAL_CALLBACK_URL
        payload = {"conversation_id": conversation_id}

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload, timeout=5) as resp:
                    if resp.status == 200:
                        logger.info(f"Successfully notified external service for {conversation_id}")
                    else:
                        logger.warning(f"External service responded with {resp.status} for {conversation_id}")
        except Exception as e:
            logger.error(f"Failed to notify external service for {conversation_id}: {e}")

    async def _load_reference_embeddings(self, db: Session) -> Dict[str, List[np.ndarray]]:
        """Загружает эталонные эмбеддинги пользователей"""
        reference_embeddings = {}
        
        embeddings = db.query(VoiceEmbedding).join(VoiceProfile).join(User).all()
        
        for emb in embeddings:
            user_id = str(emb.profile.user_id)
            embedding_value = emb.embedding

            if isinstance(embedding_value, str):
                try:
                    embedding_value = json.loads(embedding_value)
                except Exception as e:
                    logger.warning(f"Failed to parse embedding JSON for user {user_id}: {e}")
                    continue

            embedding_vector = np.array(embedding_value, dtype=np.float32)
            
            if user_id not in reference_embeddings:
                reference_embeddings[user_id] = []
            reference_embeddings[user_id].append(embedding_vector)
            
        return reference_embeddings

    async def _assign_speakers_to_phrases(self, db: Session, conversation_id: str, 
                                        segments: List, speakers_map: Dict[str, uuid.UUID]):
        """Присваивает спикеров фразам на основе временных интервалов"""
        phrases = db.query(Phrase).filter(
            Phrase.conversation_id == uuid.UUID(conversation_id)
        ).order_by(Phrase.start_time).all()
        
        for phrase in phrases:
            # Находим пересекающийся сегмент
            for start_time, end_time, cluster, _ in segments:
                if (phrase.start_time < end_time and phrase.end_time > start_time):
                    if cluster in speakers_map:
                        phrase.speaker_id = speakers_map[cluster]
                    break
                    
            phrase.is_final = True
            
        db.commit()

    async def _final_phrase_merge(self, db: Session, conversation_id: str):
        """Финальная склейка фраз одного спикера"""
        phrases = db.query(Phrase).filter(
            Phrase.conversation_id == uuid.UUID(conversation_id)
        ).order_by(Phrase.start_time).all()
        
        i = 0
        while i < len(phrases) - 1:
            current = phrases[i]
            next_phrase = phrases[i + 1]
            
            # Проверяем условия склейки
            if (current.speaker_id == next_phrase.speaker_id and
                current.speaker_id is not None and
                next_phrase.start_time - current.end_time < 2.0):  # Пауза < 2 сек
                
                # Склеиваем
                current.text = (current.text + " " + next_phrase.text).strip()
                current.end_time = next_phrase.end_time
                current.updated_at = datetime.utcnow()
                
                db.delete(next_phrase)
                phrases.pop(i + 1)
                
            else:
                i += 1
                
        db.commit()


audio_processing_service = AudioProcessingService()
