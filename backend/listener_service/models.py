from datetime import datetime
import os

DB_PATH = "meetings.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS meetings (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        status TEXT
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audio_tracks (
        id SERIAL PRIMARY KEY,
        meeting_id INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
        track_type TEXT NOT NULL, -- 'user' или 'remote'
        file_path TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS utterances (
        id SERIAL PRIMARY KEY,
        meeting_id INTEGER NOT NULL REFERENCES meetings(id),
        track_id INTEGER REFERENCES audio_tracks(id),
        speaker_id TEXT NOT NULL,   -- 'USER' или 'REMOTE_00', 'REMOTE_01'
        start_time DOUBLE PRECISION,
        end_time DOUBLE PRECISION,
        text TEXT,
        language TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )
    """)
    conn.commit()
    conn.close()

def save_meeting(audio_path: str) -> int:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO meetings (created_at, audio_path) VALUES (?, ?)",
        (datetime.utcnow().isoformat(), audio_path)
    )
    meeting_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return meeting_id

def save_utterance(meeting_id: int, speaker_id: str, start: float, end: float, text: str, lang: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO utterances (meeting_id, speaker_id, start_time, end_time, text, language)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (meeting_id, speaker_id, start, end, text, lang))
    conn.commit()
    conn.close()