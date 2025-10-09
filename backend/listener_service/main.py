from fastapi import FastAPI, BackgroundTasks, HTTPException, File, UploadFile
from pydantic import BaseModel
from db import SessionLocal, Meeting, AudioTrack, Utterance
from audio_recorder import DualTrackRecorder
from transcribe import transcribe_audio
from diarize import diarize_audio
from config import config
from logger import setup_logger
import tempfile
import os

app = FastAPI(title="Listener Service", version="1.1.0")
recorder = DualTrackRecorder()

DEFAULT_DURATION = config["audio"]["default_duration_sec"]

class StartRecordRequest(BaseModel):
    duration_sec: int = DEFAULT_DURATION


@app.post("/process/file")
async def process_uploaded_file(file: UploadFile = File(...), background_tasks: BackgroundTasks = BackgroundTasks()):
    """
    Обработать загруженный аудиофайл: транскрибация + диаризация → сохранить в БД.
    Поддерживаются: .wav, .mp3, .m4a и др. (всё, что поддерживает whisper)
    """
    # 1. Сохранить файл во временную папку
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    # 2. Создать запись о встрече
    db = SessionLocal()
    meeting = Meeting(status="processing")
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    db.close()

    # 3. Запустить обработку в фоне
    background_tasks.add_task(process_uploaded_file_task, tmp_path, meeting.id)
    return {"meeting_id": meeting.id, "status": "processing started"}

@app.post("/record/start")
async def start_recording(req: StartRecordRequest, background_tasks: BackgroundTasks):
    if recorder.is_recording:
        raise HTTPException(status_code=400, detail="Already recording")

    db = SessionLocal()
    meeting = Meeting(status="recording")
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    db.close()

    background_tasks.add_task(process_recording, req.duration_sec, meeting.id)
    return {"meeting_id": meeting.id, "status": "recording started"}

@app.post("/record/stop")
async def stop_recording():
    if not recorder.is_recording:
        raise HTTPException(status_code=400, detail="Not recording")
    recorder.stop()
    return {"status": "stop requested"}

def process_uploaded_file_task(audio_path: str, meeting_id: int):
    db = SessionLocal()
    try:
        # Сохраняем трек в БД (тип 'uploaded')
        track = AudioTrack(meeting_id=meeting_id, track_type="uploaded", file_path=audio_path)
        db.add(track)
        db.commit()
        db.refresh(track)

        # Транскрибация
        transcription = transcribe_audio(audio_path)
        lang = transcription.get("language", "en")

        # Диаризация
        diarization = diarize_audio(audio_path)

        # Сохраняем реплики
        for seg in transcription["segments"]:
            text = seg["text"].strip()
            if not text:
                continue

            speaker_label = "UNKNOWN"
            for turn, _, spk in diarization.itertracks(yield_label=True):
                if turn.start <= seg["start"] <= turn.end or turn.start <= seg["end"] <= turn.end:
                    speaker_label = spk
                    break

            utterance = Utterance(
                meeting_id=meeting_id,
                track_id=track.id,
                speaker_id=f"FILE_{speaker_label}",
                start_time=seg["start"],
                end_time=seg["end"],
                text=text,
                language=lang
            )
            db.add(utterance)

        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        meeting.status = "completed"
        db.commit()

    except Exception as e:
        logger = setup_logger("main")
        logger.exception(f"Ошибка обработки файла {audio_path}")
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if meeting:
            meeting.status = "failed"
            db.commit()
    finally:
        db.close()
        # Удаляем временный файл
        try:
            os.unlink(audio_path)
        except:
            pass

def save_utterances_from_transcript(db, meeting_id, track_id, transcription, speaker_prefix=""):
    lang = transcription.get("language", "en")
    for seg in transcription["segments"]:
        text = seg["text"].strip()
        if not text:
            continue
        utterance = Utterance(
            meeting_id=meeting_id,
            track_id=track_id,
            speaker_id=speaker_prefix,
            start_time=seg["start"],
            end_time=seg["end"],
            text=text,
            language=lang
        )
        db.add(utterance)

def process_recording(duration_sec: int, meeting_id: int):
    db = SessionLocal()
    try:
        user_path, remote_path = recorder.start_recording(duration_sec=duration_sec)

        user_track = AudioTrack(meeting_id=meeting_id, track_type="user", file_path=user_path)
        remote_track = AudioTrack(meeting_id=meeting_id, track_type="remote", file_path=remote_path)
        db.add(user_track)
        db.add(remote_track)
        db.commit()
        db.refresh(user_track)
        db.refresh(remote_track)

        # Твой голос → USER
        user_transcript = transcribe_audio(user_path)
        save_utterances_from_transcript(db, meeting_id, user_track.id, user_transcript, speaker_prefix="USER")

        # Удалённые → REMOTE_XX
        remote_diarization = diarize_audio(remote_path)
        remote_transcript = transcribe_audio(remote_path)
        lang = remote_transcript.get("language", "en")

        for seg in remote_transcript["segments"]:
            text = seg["text"].strip()
            if not text:
                continue

            speaker_label = "UNKNOWN"
            for turn, _, spk in remote_diarization.itertracks(yield_label=True):
                if turn.start <= seg["start"] <= turn.end or turn.start <= seg["end"] <= turn.end:
                    speaker_label = spk
                    break

            utterance = Utterance(
                meeting_id=meeting_id,
                track_id=remote_track.id,
                speaker_id=f"REMOTE_{speaker_label}",
                start_time=seg["start"],
                end_time=seg["end"],
                text=text,
                language=lang
            )
            db.add(utterance)

        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        meeting.status = "completed"
        db.commit()

    except Exception as e:
        logger = setup_logger("main")
        logger.exception("Ошибка в process_recording")  # <- это запишет полный traceback
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if meeting:
            meeting.status = "failed"
            db.commit()
    finally:
        db.close()

@app.get("/health")
def health():
    return {"status": "ok", "recording": recorder.is_recording}

if __name__ == "__main__":
    import uvicorn
    server_cfg = config["server"]
    uvicorn.run(app, host=server_cfg["host"], port=server_cfg["port"])