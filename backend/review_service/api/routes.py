# api/routes.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from domain.models import Utterance
from application.analyze_meeting import analyze_meeting_use_case

router = APIRouter()

_embedding_model = None
_storage = None


def set_dependencies(embedding_model, storage):
    global _embedding_model, _storage
    _embedding_model = embedding_model
    _storage = storage


class ConversationCompletedRequest(BaseModel):
    meeting_id: str
    utterances: List[dict]


@router.post("/conversation_completed")
async def conversation_completed(payload: ConversationCompletedRequest):
    if _embedding_model is None or _storage is None:
        raise HTTPException(status_code=500, detail="Сервис не инициализирован")

    try:
        utterances = [Utterance(u["speaker"], u["text"]) for u in payload.utterances]
        report = analyze_meeting_use_case(utterances, _embedding_model)

        report_dict = {
            "inferred_topic": report.inferred_topic,
            "speaker_stats": report.speaker_stats,
            "off_topic_segments": report.off_topic_segments,
            "total_utterances": report.total_utterances,
            "off_topic_count": report.off_topic_count
        }
        _storage.save_analysis(payload.meeting_id, report_dict)

        return {
            "meeting_id": payload.meeting_id,
            "status": "analyzed_and_saved"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка анализа: {str(e)}")