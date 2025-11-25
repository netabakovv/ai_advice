# api/routes.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from application.analyze_meeting import analyze_meeting_use_case

router = APIRouter()

_embedding_model = None
_storage = None


def set_dependencies(embedding_model, storage):
    global _embedding_model, _storage
    _embedding_model = embedding_model
    _storage = storage


class AnalyzeRequest(BaseModel):
    meeting_id: str


@router.post("/conversation_completed")
async def conversation_completed(payload: AnalyzeRequest):
    if _embedding_model is None or _storage is None:
        raise HTTPException(status_code=500, detail="Сервис не инициализирован")

    try:
        # 🔸 Теперь текст НЕ приходит в теле — мы читаем его из БД
        utterances = _storage.fetch_transcript_by_meeting_id(payload.meeting_id)

        if not utterances:
            raise HTTPException(status_code=404, detail=f"Транскрипт для meeting_id={payload.meeting_id} не найден")

        report = analyze_meeting_use_case(utterances, _embedding_model)

        # Сохраняем результат анализа
        _storage.save_analysis(payload.meeting_id, report)

        return {
            "meeting_id": payload.meeting_id,
            "status": "analyzed_and_saved",
            "utterances_analyzed": len(utterances)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка анализа: {str(e)}")