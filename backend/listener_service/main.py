import io
from typing import Optional
from fastapi import FastAPI, File, Form, UploadFile, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import librosa
from sqlalchemy.orm import Session
import json
import uuid
import logging
from datetime import datetime
from pathlib import Path
import soundfile as sf
import numpy as np

from models.database import VoiceEmbedding, VoiceProfile, get_db, create_tables, Conversation, Phrase, Speaker, User
from services.audio_processing import audio_processing_service
from services.transcription import transcription_service
from services.diarization import diarization_service
from utils.buffer_manager import buffer_manager
from resemblyzer import VoiceEncoder

from utils.config import config
from dotenv import load_dotenv

TARGET_SR = 16000
encoder = VoiceEncoder()

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Создание FastAPI приложения
app = FastAPI(
    title="Russian Transcription & Offline Diarization Microservice",
    description="Потоковая транскрибация на ч   русском языке с оффлайн диаризацией через Pyannote",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Настройте для продакшна
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Инициализация при запуске"""
    create_tables()
    
    # Создаем директорию для медиа файлов
    Path(config.MEDIA_STORAGE_PATH).mkdir(exist_ok=True)
    
    logger.info("Application started successfully")

@app.on_event("shutdown")
async def shutdown_event():
    """Очистка при остановке"""
    await transcription_service.shutdown()
    await diarization_service.shutdown()
    buffer_manager.stop_cleanup_task()
    logger.info("Application shutdown completed")

# REST API Endpoints

@app.post("/conversations/")
async def create_conversation(db: Session = Depends(get_db)):
    """Создает новую беседу"""
    conv = await audio_processing_service.start_conversation(str(uuid.uuid4()), db)
    return {
        "id": str(conv.id),
        "status": conv.status,
        "created_at": conv.created_at.isoformat()
    }

@app.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str, db: Session = Depends(get_db)):
    """Получает информацию о беседе"""
    conv = db.query(Conversation).filter(
        Conversation.id == uuid.UUID(conversation_id)
    ).first()
    
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return {
        "id": str(conv.id),
        "title": conv.title,
        "status": conv.status,
        "total_duration": conv.total_duration,
        "created_at": conv.created_at.isoformat(),
        "updated_at": conv.updated_at.isoformat()
    }

@app.get("/conversations/{conversation_id}/phrases")
async def get_conversation_phrases(conversation_id: str, db: Session = Depends(get_db)):
    """Получает все фразы беседы"""
    phrases = db.query(Phrase).filter(
        Phrase.conversation_id == uuid.UUID(conversation_id)
    ).order_by(Phrase.start_time).all()
    
    result = []
    for phrase in phrases:
        speaker_name = None
        if phrase.speaker and phrase.speaker.identified_name:
            speaker_name = phrase.speaker.identified_name
        elif phrase.speaker:
            speaker_name = phrase.speaker.cluster_label
            
        result.append({
            "id": str(phrase.id),
            "text": phrase.text,
            "start_time": phrase.start_time,
            "end_time": phrase.end_time,
            "confidence": phrase.confidence,
            "speaker_name": speaker_name,
            "is_final": phrase.is_final
        })
    
    return result

@app.get("/conversations/{conversation_id}/speakers")
async def get_conversation_speakers(conversation_id: str, db: Session = Depends(get_db)):
    """Получает всех спикеров беседы"""
    speakers = db.query(Speaker).filter(
        Speaker.conversation_id == uuid.UUID(conversation_id)
    ).all()
    
    result = []
    for speaker in speakers:
        result.append({
            "id": str(speaker.id),
            "cluster_label": speaker.cluster_label,
            "identified_name": speaker.identified_name,
            "confidence": speaker.confidence,
            "user_id": str(speaker.user_id) if speaker.user_id else None
        })
    
    return result

@app.post("/conversations/{conversation_id}/end")
async def end_conversation(conversation_id: str, db: Session = Depends(get_db)):
    """Завершает беседу и запускает оффлайн обработку"""
    await audio_processing_service.end_conversation(conversation_id, db)
    return {
        "status": "conversation_ended",
        "conversation_id": conversation_id,
        "message": "Offline diarization started"
    }

@app.get("/health")
async def health_check():
    """Проверка состояния сервиса"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }

@app.get("/stats")
async def get_stats(db: Session = Depends(get_db)):
    """Статистика системы"""
    total_conversations = db.query(Conversation).count()
    active_conversations = db.query(Conversation).filter(
        Conversation.status == "active"
    ).count()
    processing_conversations = db.query(Conversation).filter(
        Conversation.status == "processing"
    ).count()
    completed_conversations = db.query(Conversation).filter(
        Conversation.status == "completed"
    ).count()
    total_phrases = db.query(Phrase).count()
    total_users = db.query(User).count()
    
    return {
        "conversations": {
            "total": total_conversations,
            "active": active_conversations,
            "processing": processing_conversations,
            "completed": completed_conversations
        },
        "total_phrases": total_phrases,
        "total_users": total_users,
        "active_buffers": len(buffer_manager.buffers)
    }

# Управление пользователями и эталонными голосами
def _load_audio_to_float32_mono_16k(file_bytes: bytes):
    # пробуем через soundfile
    data, sr = sf.read(io.BytesIO(file_bytes), always_2d=False, dtype="float32")
    if data.ndim == 2:
        data = data.mean(axis=1)
    if sr != TARGET_SR:
        data = librosa.resample(data, orig_sr=sr, target_sr=TARGET_SR)
        sr = TARGET_SR
    return data.astype(np.float32, copy=False), sr

@app.post("/enroll-voice")
def enroll_voice(
    user_id: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    display_name: Optional[str] = Form(None),
    label: str = Form("default"),
    device_info: Optional[str] = Form(None),
    audio: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    try:
         # 0) найти/создать пользователя
        user = None
        if user_id and user_id.strip():
            try:
                uid = uuid.UUID(user_id)
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid user_id format")
            user = db.query(User).get(uid)
            if user is None:
                raise HTTPException(status_code=404, detail="User not found")
        else:
            if not email:
                raise HTTPException(status_code=400, detail="Missing email for new user")
            user = User(email=email, display_name=display_name)
            db.add(user)
            db.flush()  # теперь user.id установлен
        uid = user.id  # используем UUID из БД, НЕ парсим снова
        # 1) читаем файл
        file_bytes = audio.file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Empty audio")

        # 2) нормализация аудио
        wav, sr = _load_audio_to_float32_mono_16k(file_bytes)
        if wav.size < TARGET_SR * 1.0:
            raise HTTPException(status_code=400, detail="Too short audio (>=1s)")

        # 3) эмбеддинг (256-D)
        emb = encoder.embed_utterance(wav).astype(np.float32).tolist()

        # 4) получаем/создаем профиль
        uid = uuid.UUID(user_id)
        profile = db.query(VoiceProfile).filter(
            VoiceProfile.user_id == uid, VoiceProfile.label == label
        ).first()
        if profile is None:
            profile = VoiceProfile(user_id=uid, label=label)
            db.add(profile)
            db.flush()

        # 5) сохраняем embedding
        ve = VoiceEmbedding(
            profile_id=profile.id,
            embedding=emb,                 # JSONB список 256 float
            sample_rate=sr,
            duration=float(len(wav) / sr),
            device_info=device_info
        )
        db.add(ve)
        db.commit()
        return {"status": "ok", "voice_embedding_id": str(ve.id), "profile_id": str(profile.id)}

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Enroll failed: {e}")

@app.post("/users/")
async def create_user(email: str, display_name: str, db: Session = Depends(get_db)):
    """Создает нового пользователя"""
    user = User(email=email, display_name=display_name)
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return {
        "id": str(user.id),
        "email": user.email,
        "display_name": user.display_name
    }

@app.get("/users/")
async def list_users(db: Session = Depends(get_db)):
    """Список всех пользователей"""
    users = db.query(User).all()
    return [
        {
            "id": str(user.id),
            "email": user.email,
            "display_name": user.display_name,
            "created_at": user.created_at.isoformat()
        }
        for user in users
    ]

# WebSocket для потокового аудио

@app.websocket("/ws/{conversation_id}")
async def websocket_endpoint(websocket: WebSocket, conversation_id: str):
    """WebSocket эндпоинт для потокового аудио"""
    await websocket.accept()
    db = next(get_db())
    
    try:
        # Проверяем/создаем беседу
        conv = db.query(Conversation).filter(
            Conversation.id == uuid.UUID(conversation_id)
        ).first()
        
        if not conv:
            conv = await audio_processing_service.start_conversation(conversation_id, db)
            logger.info(f"Created new conversation {conversation_id}")
        
        logger.info(f"WebSocket connected for conversation {conversation_id}")
        
        while True:
            message = await websocket.receive()
            
            if message["type"] == "websocket.receive":
                if "bytes" in message:
                    # Обрабатываем аудио данные
                    audio_data = message["bytes"]
                    timestamp = datetime.utcnow().timestamp()
                    
                    await audio_processing_service.process_audio_chunk(
                        conversation_id, audio_data, timestamp
                    )
                    
                elif "text" in message:
                    # Обрабатываем текстовые команды
                    try:
                        data = json.loads(message["text"])
                        await handle_text_command(conversation_id, data, websocket, db)
                    except json.JSONDecodeError:
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "message": "Invalid JSON format"
                        }))
                        
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for conversation {conversation_id}")
    except Exception as e:
        logger.error(f"WebSocket error for {conversation_id}: {e}")
        try:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": str(e)
            }))
        except:
            pass
    finally:
        db.close()

async def handle_text_command(conversation_id: str, data: dict, websocket: WebSocket, db: Session):
    """Обрабатывает текстовые команды через WebSocket"""
    command = data.get("type")
    
    if command == "end_conversation":
        await audio_processing_service.end_conversation(conversation_id, db)
        await websocket.send_text(json.dumps({
            "type": "conversation_ended",
            "conversation_id": conversation_id
        }))
        
    elif command == "get_status":
        conv = db.query(Conversation).filter(
            Conversation.id == uuid.UUID(conversation_id)
        ).first()
        
        if conv:
            phrase_count = db.query(Phrase).filter(
                Phrase.conversation_id == conv.id
            ).count()
            
            await websocket.send_text(json.dumps({
                "type": "status",
                "conversation_id": conversation_id,
                "status": conv.status,
                "phrase_count": phrase_count,
                "duration": conv.total_duration
            }))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
