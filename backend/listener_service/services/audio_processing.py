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
import time
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

        loaded_profiles = await self._load_reference_embeddings(db)
        
        # Запускаем фоновую обработку
        self.active_conversations[str(conv.id)] = {
            'conversation': conv,
            'last_activity': datetime.utcnow(),
            'chunk_sequence': 0,
            'previous_text': '',
            'last_saved_end_time': 0.0,
            'voice_profiles': loaded_profiles,
            'speaker_buffer': [],
            'speaker_map': {}
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
        
        identified_user_id = None
        if conv_info['voice_profiles']:
             # Запускаем в executor, так как encoder блокирует поток
             identified_user_id = await asyncio.get_event_loop().run_in_executor(
                None, 
                self._identify_speaker_online, 
                segment_audio, 
                conv_info['voice_profiles']
             )
    
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
            conversation_id, clean_results, conv_info['chunk_sequence'], identified_user_id
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

    async def _store_transcription_results(self, conversation_id: str, results: List, chunk_sequence: int, identified_user_id: str):
        """Сохраняет результаты транскрибации в БД"""
        db = next(get_db())

        conv_info = self.active_conversations.get(conversation_id)
        agenda = conv_info.get('agenda', 'продажи Q4, бюджет') if conv_info else ''
        logger.info(f"🔍 CHUNK #{chunk_sequence}: {len(results)} phrases | agenda='{agenda[:30]}...'")

        try:
            # 1. Определяем Speaker UUID
            final_speaker_id = None
            
            if identified_user_id:
                conv_info = self.active_conversations.get(conversation_id)
                
                # Проверяем кэш в памяти
                if conv_info and identified_user_id in conv_info['speaker_map']:
                    final_speaker_id = conv_info['speaker_map'][identified_user_id]
                else:
                    # Проверяем БД или создаем нового
                    # Ищем существующего спикера для этого юзера в этой беседе
                    existing_speaker = db.query(Speaker).filter(
                        Speaker.conversation_id == uuid.UUID(conversation_id),
                        Speaker.user_id == uuid.UUID(identified_user_id)
                    ).first()
                    
                    if existing_speaker:
                        final_speaker_id = existing_speaker.id
                    else:
                        # Создаем спикера "Онлайн"
                        user = db.query(User).filter(User.id == uuid.UUID(identified_user_id)).first()
                        new_speaker = Speaker(
                            id=uuid.uuid4(),
                            conversation_id=uuid.UUID(conversation_id),
                            user_id=uuid.UUID(identified_user_id),
                            identified_name=user.display_name if user else "Unknown",
                            cluster_label=None, # Пока нет кластера, это онлайн
                            confidence=0.8,     # Условная уверенность онлайна
                            created_at=datetime.utcnow()
                        )
                        db.add(new_speaker)
                        db.commit() # Важно закоммитить, чтобы получить ID
                        final_speaker_id = new_speaker.id
                    
                    # Обновляем кэш
                    if conv_info:
                        conv_info['speaker_map'][identified_user_id] = final_speaker_id

            # 2. Сохраняем фразы
            for i, (text, abs_start, abs_end, confidence) in enumerate(results):
                logger.info(f"  📝 Phrase {i+1}: '{text[:40]}...' [{abs_start:.1f}-{abs_end:.1f}s]")
                
                # 🆕 АНАЛИЗ ОФФТОПА
                score_data = await buffer_manager.analyze_realtime(conversation_id, text, agenda)
                logger.info(f"  ✅ SCORE: {score_data['score']:.2f} | {score_data['reason']}")
                
                # 🆕 GLOBAL CACHE
                buffer_manager.latest_scores[conversation_id] = score_data
                
                phrase = Phrase(
                    conversation_id=uuid.UUID(conversation_id),
                    text=text,
                    start_time=abs_start,
                    end_time=abs_end,
                    confidence=confidence,
                    chunk_sequence=chunk_sequence,
                    language="ru",
                    is_final=False,
                    speaker_id=final_speaker_id,
                    score=score_data["score"],           # 🆕
                    off_topic_reason=score_data["reason"] # 🆕
                )
                db.add(phrase)
            
            db.commit()
            logger.info(f"✅ CHUNK #{chunk_sequence} SAVED ({len(results)} phrases)")
            
        except Exception as e:
            db.rollback()
            logger.error(f"❌ CHUNK #{chunk_sequence} ERROR: {e}")
        finally:
            db.close()

    async def end_conversation(self, conversation_id: str, db: Session):
        """Завершает беседу + дожидается Whisper (30s max)"""
        if conversation_id not in self.active_conversations:
            return
        
        logger.info(f"🛑 END {conversation_id[:8]}... (drain buffer +30s max)")
        
        audio_buffer = buffer_manager.get_buffer(conversation_id)
        audio_buffer.mark_finished()
        
        conv = db.query(Conversation).filter(Conversation.id == uuid.UUID(conversation_id)).first()
        if conv:
            conv.status = "processing"
            db.commit()
        
        # 🆕 ДОЖДАТЬСЯ Whisper (30s max!)
        try:
            logger.info(f"⏳ DRAINING buffer {conversation_id[:8]}...")
            await asyncio.wait_for(self._drain_remaining_buffer(conversation_id), timeout=30.0)
            logger.info(f"✅ BUFFER DRAINED: {conversation_id[:8]}")
        except asyncio.TimeoutError:
            logger.warning(f"⏰ BUFFER TIMEOUT 30s: {conversation_id[:8]} (Whisper still works)")
        
        logger.info(f"🎉 END COMPLETE: {conversation_id[:8]}")

    async def _drain_remaining_buffer(self, conversation_id: str):
        """Дожидается обработки оставшихся чанков Whisper"""
        max_wait = 30  # сек
        start_time = time.time()
        
        while time.time() - start_time < max_wait:
            buffer = buffer_manager.get_buffer(conversation_id)
            if buffer.is_empty() and not buffer_manager.has_pending_chunks(conversation_id):
                logger.info(f"📭 Buffer EMPTY: {conversation_id[:8]}")
                break
            
            logger.debug(f"⏳ Buffer {conversation_id[:8]}: {len(buffer.audio_buffer)} samples left")
            await asyncio.sleep(1)
        
        logger.info(f"📊 Drain complete: {time.time() - start_time:.1f}s waited")

        
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
        """
        Выполняет оффлайн диаризацию, сопоставление с эталонными голосами 
        и синхронизацию с таблицей Speaker.
        """
        db = next(get_db())
        
        try:
            logger.info(f"Starting offline diarization for {conversation_id}")
            
            # 1. Инициализируем сервис и выполняем диаризацию
            await diarization_service.initialize()
            
            # segments: список кортежей (start, end, cluster_id[int])
            segments = await diarization_service.perform_offline_diarization(media_path, conversation_id)
            
            if not segments:
                logger.warning(f"No diarization segments for {conversation_id}")
                conv = db.query(Conversation).filter(Conversation.id == uuid.UUID(conversation_id)).first()
                if conv:
                    conv.status = "completed"
                    db.commit()
                return
                
            # 2. Вычисляем эмбеддинги для найденных кластеров
            # Возвращает dict {cluster_id_int: np.array}
            cluster_embeddings = await asyncio.get_event_loop().run_in_executor(
                None, diarization_service.compute_cluster_embeddings, media_path, segments
            )
            
            # 3. Загружаем эталоны и ищем совпадения
            reference_embeddings = await self._load_reference_embeddings(db)
            
            # Возвращает dict { "0": ("user_uuid", 0.95), "1": (None, 0.0) }
            # Ключи здесь строки, так как JSON часто делает ключи строками, но cluster_id у нас int
            cluster_matches = diarization_service.match_clusters_to_users(
                cluster_embeddings, reference_embeddings
            )
            
            # 4. СИНХРОНИЗАЦИЯ СПИКЕРОВ (Самая важная часть)
            # Нам нужно составить карту: ID кластера (int) -> UUID спикера в БД
            cluster_to_speaker_id: Dict[int, uuid.UUID] = {}

            # Предзагружаем всех спикеров, которых мог создать онлайн-режим
            existing_speakers = db.query(Speaker).filter(
                Speaker.conversation_id == uuid.UUID(conversation_id)
            ).all()
            
            # Хелпер для быстрого поиска: {user_uuid: SpeakerObject}
            existing_speakers_map = {s.user_id: s for s in existing_speakers if s.user_id is not None}
            
            # Получаем список уникальных кластеров из сегментов
            unique_clusters = set(s[2] for s in segments)

            for cluster_id in unique_clusters:
                str_cluster = str(cluster_id)
                
                # Смотрим, кого нашла матчинг-функция
                match_info = cluster_matches.get(str_cluster)
                matched_user_id_str = match_info[0] if match_info else None
                matched_conf = match_info[1] if match_info else 0.0
                
                target_speaker = None
                
                if matched_user_id_str:
                    # Сценарий А: Кластер принадлежит известному Юзеру
                    matched_user_uuid = uuid.UUID(matched_user_id_str)
                    
                    if matched_user_uuid in existing_speakers_map:
                        # Этот юзер уже был обнаружен в онлайне!
                        target_speaker = existing_speakers_map[matched_user_uuid]
                        # Обновляем ему данные (теперь мы знаем его кластер и точную уверенность)
                        target_speaker.cluster_label = str_cluster
                        target_speaker.confidence = max(target_speaker.confidence or 0, matched_conf)
                        logger.info(f"Sync: Updated existing speaker {target_speaker.id} for user {matched_user_id_str}")
                    else:
                        # Юзер известен, но онлайн его пропустил. Создаем нового.
                        user = db.query(User).filter(User.id == matched_user_uuid).first()
                        target_speaker = Speaker(
                            id=uuid.uuid4(),
                            conversation_id=uuid.UUID(conversation_id),
                            user_id=matched_user_uuid,
                            cluster_label=str_cluster,
                            identified_name=user.display_name if user else "Unknown User",
                            confidence=matched_conf,
                            created_at=datetime.utcnow()
                        )
                        db.add(target_speaker)
                        logger.info(f"Sync: Created new speaker for user {matched_user_id_str}")

                else:
                    # Сценарий Б: Неизвестный гость
                    # Создаем спикера-гостя
                    target_speaker = Speaker(
                        id=uuid.uuid4(),
                        conversation_id=uuid.UUID(conversation_id),
                        user_id=None,
                        cluster_label=str_cluster,
                        identified_name=f"Спикер {cluster_id + 1}", # Человекочитаемый номер
                        confidence=0.0,
                        created_at=datetime.utcnow()
                    )
                    db.add(target_speaker)
                    logger.info(f"Sync: Created guest speaker for cluster {cluster_id}")
                
                # Важно сделать flush, чтобы получить ID, но не коммитить транзакцию целиком
                db.flush()
                cluster_to_speaker_id[cluster_id] = target_speaker.id

            # Фиксируем спикеров
            db.commit()
            
            # 5. Присваиваем спикеров фразам
            # Передаем нашу карту маппинга
            await self._assign_speakers_to_phrases(db, conversation_id, segments, cluster_to_speaker_id)
            
            # 6. Финальная склейка (Опционально, если нужно объединять короткие фразы подряд)
            # await self._final_phrase_merge(db, conversation_id)
            
            # 7. Завершаем беседу
            conv = db.query(Conversation).filter(
                Conversation.id == uuid.UUID(conversation_id)
            ).first()
            if conv:
                conv.status = "completed"
                db.commit()
                
            logger.info(f"Offline diarization completed for {conversation_id}")

            # 8. Уведомляем бэкенд
            await self._notify_external_service(conversation_id)
            
        except Exception as e:
            logger.error(f"Offline diarization failed for {conversation_id}: {e}", exc_info=True)
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

    def _identify_speaker_online(self, audio_chunk: np.ndarray, profiles: Dict[str, List[np.ndarray]]) -> str:
        """
        Возвращает user_id или None, если уверенности нет.
        """
        if len(audio_chunk) < 3000: # На слишком коротких кусках (<0.2с) лучше не гадать
            return None

        try:
            # 1. Создаем эмбеддинг текущего куска (быстро)
            # preprocess_wav уже делает нормализацию, но encoder ожидает свой формат
            # encoder.embed_utterance сам делает препроцессинг, если передать массив
            curr_embed = encoder.embed_utterance(audio_chunk)
            
            best_score = 0.0
            best_user_id = None
            
            # 2. Сравниваем со всеми известными профилями
            for user_id, ref_embeds in profiles.items():
                # ref_embeds - это список векторов. Можно взять средний или сравнить со всеми
                # Сравнение матричное (сразу со всеми семплами пользователя)
                ref_matrix = np.array(ref_embeds)
                
                # Косинусное сходство: dot product нормированных векторов
                # Resemblyzer выдает уже нормированные векторы (L2 norm)
                scores = np.inner(curr_embed, ref_matrix)
                max_score_for_user = np.max(scores)
                
                if max_score_for_user > best_score:
                    best_score = max_score_for_user
                    best_user_id = user_id

            # 3. Порог уверенности (Resemblyzer обычно требует 0.7-0.8)
            if best_score > 0.75:
                return best_user_id
            
        except Exception as e:
            logger.error(f"Online identification error: {e}")
            
        return None

audio_processing_service = AudioProcessingService()
