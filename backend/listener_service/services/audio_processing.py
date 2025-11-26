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
            'previous_text': '',
            'last_saved_end_time': 0.0
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
        
        while True:
            try:
                if conversation_id not in self.active_conversations:
                    break
                
                audio_buffer = buffer_manager.get_buffer(conversation_id)

                if len(audio_buffer.audio_buffer) == 0 and audio_buffer.is_finished:
                    logger.info(f"Buffer drained for {conversation_id}.")
                    break

                chunk_data_tuple = audio_buffer.get_processing_chunk()
                audio_chunk, abs_start_time, abs_end_time = chunk_data_tuple

                if audio_chunk is None:
                    if audio_buffer.is_finished and len(audio_buffer.audio_buffer) == 0:
                        logger.info(f"Buffer drained for {conversation_id}.")
                        break
                    await asyncio.sleep(0.1)
                    continue

                await self._process_voice_segment(conversation_id, audio_chunk, abs_start_time)
                
                await asyncio.sleep(0.01)

            except asyncio.CancelledError:
                logger.info(f"Task cancelled for {conversation_id}")
                break
            except Exception as e:
                logger.error(f"Processing error for {conversation_id}: {e}")
                await asyncio.sleep(0.5)

        await self._finalize_conversation(conversation_id)

    async def _process_next_chunk(self, conversation_id: str):
        """Обрабатывает следующий доступный аудио чанк"""
        audio_buffer = buffer_manager.get_buffer(conversation_id)
        conv_info = self.active_conversations[conversation_id]
        
        audio_chunk, chunk_start, chunk_end = audio_buffer.get_processing_chunk()
        if audio_chunk is None or len(audio_chunk) == 0:
            return
        
        # Обрабатываем каждый голосовой сегмент
        await self._process_voice_segment(conversation_id, audio_chunk, chunk_start, chunk_start, chunk_end)

    async def _process_voice_segment(self, conversation_id: str, segment_audio: np.ndarray,
                                   segment_abs_start_time: float):
        """Обрабатывает голосовой сегмент"""
        conv_info = self.active_conversations[conversation_id]
        
        # Извлекаем аудио сегмент
        sr = 16000
        segment_duration = len(segment_audio) / sr
        
        if len(segment_audio) < 1600:
            return
            
        # Транскрибация
        transcription_results = await transcription_service.transcribe_with_context(
            segment_audio, 
            previous_text=conv_info['previous_text']
        )
        
        if not transcription_results:
            return
    
        clean_results = []
        max_end_time_in_batch = conv_info['last_saved_end_time']

        for res in transcription_results:
            text, rel_start, rel_end, conf = res

            abs_phrase_start = segment_abs_start_time + rel_start
            abs_phrase_end = segment_abs_start_time + rel_end
        
        # 1. Отсекаем фразы из зоны оверлапа (те, что уже были в прошлом чанке)
        # Если фраза заканчивается внутри зоны перекрытия - это 100% дубль.
        # Если начинается в перекрытии, но уходит дальше - берем, но аккуратно.
        # Самое надежное: игнорировать все, что начинается раньше, чем закончился оверлап + маленький буфер (0.1с)
            if abs_phrase_end <= (conv_info['last_saved_end_time'] + 0.1):
                continue
            
            if abs_phrase_start < conv_info['last_saved_end_time'] - 0.5:
                 # Если текст совпадает с контекстом, можно скипнуть, но пока просто пишем
                 pass
        # 2. Фильтр фантомов Whisper
        # Whisper может галлюцинировать на тишине.
        # Обычно такие галлюцинации имеют низкую уверенность или повторяющийся паттерн.
            if conf < 0.4: # Если уверенность ниже 40%, лучше пропустить
                continue
            
            clean_results.append((text, abs_phrase_start, abs_phrase_end, conf))
            max_end_time_in_batch = max(max_end_time_in_batch, abs_phrase_end)

        if not clean_results:
            return
  
        # Сохранение в БД (без определения спикера)
        await self._store_transcription_results(
            conversation_id, clean_results, conv_info['chunk_sequence']
        )
        
        conv_info['last_saved_end_time'] = max_end_time_in_batch

        # Обновляем контекст
        current_text = " ".join([t[0] for t in clean_results])
        conv_info['previous_text'] += ' ' + current_text
        if len(conv_info['previous_text']) > 400:
            conv_info['previous_text'] = conv_info['previous_text'][-400:]

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

    async def _store_transcription_results(self, conversation_id: str, results: List, chunk_sequence: int):
        """Сохраняет результаты транскрибации в БД"""
        db = next(get_db())
        try:
            for (text, abs_start, abs_end, confidence) in results:
                phrase = Phrase(
                    conversation_id=uuid.UUID(conversation_id),
                    text=text,
                    start_time=abs_start,
                    end_time=abs_end,
                    confidence=confidence,
                    chunk_sequence=chunk_sequence,
                    language="ru",
                    is_final=False,
                    speaker_id=None
                )
                db.add(phrase)
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Error storing transcription: {e}")
        finally:
            db.close()

    async def end_conversation(self, conversation_id: str, db: Session):
        """Завершает беседу и запускает оффлайн обработку"""
        if conversation_id not in self.active_conversations:
            return
        
        logger.info(f"Signal to end conversation {conversation_id} received.")

        audio_buffer = buffer_manager.get_buffer(conversation_id)
        audio_buffer.mark_finished()

        conv = db.query(Conversation).filter(Conversation.id == uuid.UUID(conversation_id)).first()
        if conv:
            conv.status = "processing"
            db.commit()

        return
        
    async def _finalize_conversation(self, conversation_id: str):
        """Вызывается когда буфер пуст и поток завершен"""
        logger.info(f"Finalizing conversation {conversation_id}...")
        
        # Получаем данные перед удалением из словарей
        if conversation_id not in self.active_conversations:
            logger.error(f"Context lost during finalize {conversation_id}")
            return

        db = next(get_db())
        try:
            # Сохраняем полную запись
            audio_buffer = buffer_manager.get_buffer(conversation_id)
            media_path = audio_buffer.save_full_recording()
            
            # Обновляем беседу в БД
            conv = db.query(Conversation).filter(
                Conversation.id == uuid.UUID(conversation_id)
            ).first()
            
            if conv and media_path:
                conv.media_uri = media_path
                conv.total_duration = len(audio_buffer.full_recording) / audio_buffer.sample_rate
                db.commit()
                
                # Запускаем тяжелую оффлайн диаризацию
                # Важно: запускаем это как отдельную таску, так как текущая таска (_process_conversation) сейчас завершится
                asyncio.create_task(self._perform_offline_diarization(conversation_id, media_path))
            
        except Exception as e:
            logger.error(f"Error during finalization {conversation_id}: {e}")
        finally:
            # Чистка ресурсов
            buffer_manager.remove_buffer(conversation_id)
            if conversation_id in self.active_conversations:
                del self.active_conversations[conversation_id]
            if conversation_id in self.processing_tasks:
                del self.processing_tasks[conversation_id]
            db.close()
            logger.info(f"Conversation {conversation_id} removed from active memory.")

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
                # Даже если диаризации нет, помечаем как completed
                conv = db.query(Conversation).filter(Conversation.id == uuid.UUID(conversation_id)).first()
                if conv:
                    conv.status = "completed"
                    db.commit()
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
            #await self._final_phrase_merge(db, conversation_id)
            
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
        ).all()
        
        for phrase in phrases:
            phrase_start = phrase.start_time
            phrase_end = phrase.end_time
            phrase_center = phrase_start + (phrase_end - phrase_start) / 2
        
            assigned_speaker_id = None
        
        # Стратегия 1: Кто говорит в центре фразы? (Самая точная для коротких реплик)
            for start_time, end_time, cluster, _ in segments:
                if start_time <= phrase_center <= end_time:
                    if cluster in speakers_map:
                        assigned_speaker_id = speakers_map[cluster]
                        break # Нашли владельца центра
        
        # Стратегия 2 (Fallback): Если центр попал в паузу диаризации (такое бывает),
        # берем того, у кого максимальное перекрытие.
            if not assigned_speaker_id:
                best_overlap = 0
                for start_time, end_time, cluster, _ in segments:
                    overlap_start = max(phrase_start, start_time)
                    overlap_end = min(phrase_end, end_time)
                    overlap = max(0, overlap_end - overlap_start)
                
                    if overlap > best_overlap:
                        best_overlap = overlap
                        if cluster in speakers_map:
                            assigned_speaker_id = speakers_map[cluster]

            if assigned_speaker_id:
                phrase.speaker_id = assigned_speaker_id
        
            phrase.is_final = True
            
        db.commit()

    async def _final_phrase_merge(self, db: Session, conversation_id: str):
        """Финальная склейка фраз одного спикера"""
        phrases = db.query(Phrase).filter(
            Phrase.conversation_id == uuid.UUID(conversation_id)
        ).order_by(Phrase.start_time).all()
        
        if not phrases:
            return

        i = 0
        while i < len(phrases) - 1:
            current = phrases[i]
            next_phrase = phrases[i + 1]
            
            # Параметры склейки
            same_speaker = (current.speaker_id == next_phrase.speaker_id and current.speaker_id is not None)
            short_pause = (next_phrase.start_time - current.end_time) < 1.0 # Пауза до 1 сек
            
            # ВАЖНО: Лимит длины. Не склеиваем, если фраза уже длиннее 15 секунд (примерно абзац)
            current_duration = current.end_time - current.start_time
            not_too_long = current_duration < 15.0 

            if same_speaker and short_pause and not_too_long:
                # Склеиваем
                current.text = (current.text + " " + next_phrase.text).strip()
                current.end_time = next_phrase.end_time
                current.updated_at = datetime.utcnow()
                # Усредняем уверенность
                current.confidence = (current.confidence + next_phrase.confidence) / 2
                
                db.delete(next_phrase)
                phrases.pop(i + 1)
                # i не увеличиваем, пробуем склеить current со следующим (бывшим i+2)
            else:
                i += 1
                
        db.commit()

audio_processing_service = AudioProcessingService()
