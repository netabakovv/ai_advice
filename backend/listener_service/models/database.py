from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Float, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
from datetime import datetime
from utils.config import config

Base = declarative_base()


class User(Base):
    __tablename__ = "user"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    display_name = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    voice_profile = relationship("VoiceProfile", back_populates="user")
    identified_speaker = relationship("Speaker", back_populates="user")


class VoiceProfile(Base):
    __tablename__ = "voice_profile"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("user.id"))
    label = Column(String(100))  # "office_mic", "phone", "online"
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="voice_profile")
    embedding = relationship("VoiceEmbedding", back_populates="profile")


class VoiceEmbedding(Base):
    __tablename__ = "voice_embedding"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id = Column(UUID(as_uuid=True), ForeignKey("voice_profile.id"))
    embedding = Column(JSONB)  # 256-D vector from Resemblyzer
    sample_rate = Column(Integer, default=16000)
    duration = Column(Float)
    device_info = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    profile = relationship("VoiceProfile", back_populates="embedding")


class Conversation(Base):
    __tablename__ = "conversation"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255))
    status = Column(String(50), default="active")  # active, processing, completed
    media_uri = Column(String(500))  # path to audio file
    total_duration = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    phrase = relationship("Phrase", back_populates="conversation")
    speaker = relationship("Speaker", back_populates="conversation")


class Speaker(Base):
    __tablename__ = "speaker"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversation.id"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=True)
    cluster_label = Column(String(50))  # CLUSTER_0, CLUSTER_1 from diarization
    identified_name = Column(String(255), nullable=True)
    confidence = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    conversation = relationship("Conversation", back_populates="speaker")
    user = relationship("User", back_populates="identified_speaker")
    phrase = relationship("Phrase", back_populates="speaker")


class Phrase(Base):
    __tablename__ = "phrase"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversation.id"))
    speaker_id = Column(UUID(as_uuid=True), ForeignKey("speaker.id"), nullable=True)
    
    start_time = Column(Float)
    end_time = Column(Float)
    text = Column(Text)
    confidence = Column(Float, default=0.0)
    language = Column(String(10), default="ru")
    
    is_final = Column(Boolean, default=False)
    needs_merge = Column(Boolean, default=False)
    chunk_sequence = Column(Integer)

    score: float = Column(Float, default=1.0)  # 🆕 Релевантность 0-1
    off_topic_reason = Column(String(255))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    conversation = relationship("Conversation", back_populates="phrase")
    speaker = relationship("Speaker", back_populates="phrase")


engine = create_engine(config.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    Base.metadata.create_all(bind=engine)
