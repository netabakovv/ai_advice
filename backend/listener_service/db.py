from sqlalchemy import create_engine, Column, Integer, String, Float, Text, ForeignKey, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
from config import config

db_cfg = config["database"]
DATABASE_URL = f"postgresql://{db_cfg['user']}:{db_cfg['password']}@{db_cfg['host']}:{db_cfg['port']}/{db_cfg['name']}"

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Meeting(Base):
    __tablename__ = "meetings"
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="recording")

class AudioTrack(Base):
    __tablename__ = "audio_tracks"
    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"))
    track_type = Column(String, index=True)
    file_path = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    meeting = relationship("Meeting", back_populates="tracks")

Meeting.tracks = relationship("AudioTrack", order_by=AudioTrack.id, back_populates="meeting", cascade="all, delete-orphan")

class Utterance(Base):
    __tablename__ = "utterances"
    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"))
    track_id = Column(Integer, ForeignKey("audio_tracks.id", ondelete="SET NULL"), nullable=True)
    speaker_id = Column(String, index=True)
    start_time = Column(Float)
    end_time = Column(Float)
    text = Column(Text)
    language = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)