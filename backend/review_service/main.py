# main.py
from fastapi import FastAPI
from infrastructure.nlp_model import EmbeddingModel
from infrastructure.storage import AnalysisStorage
from api.routes import router, set_dependencies
from infrastructure.db_init import init_db
from dotenv import load_dotenv
import os
import sys

load_dotenv()

db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("Переменная окружения DATABASE_URL не задана")
    sys.exit(1)

try:
    print("Инициализация базы данных...")
    init_db()
except Exception as e:
    print(f"Ошибка при инициализации БД: {e}")
    sys.exit(1)

try:
    print("Загрузка NLP-модели...")
    embedding_model = EmbeddingModel()
    print("Модель загружена")
except Exception as e:
    print(f"Ошибка загрузки модели: {e}")
    sys.exit(1)

try:
    storage = AnalysisStorage(db_url)
    print("Storage готов")
except Exception as e:
    print(f"Ошибка инициализации storage: {e}")
    sys.exit(1)

set_dependencies(embedding_model=embedding_model, storage=storage)

app = FastAPI(title="Meeting Analyzer Service", version="1.0")
app.include_router(router)


@app.get("/health")
async def health():
    return {"status": "ok", "component": "meeting-analyzer"}