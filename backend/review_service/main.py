# analyzer_worker.py
import os
import time
import sys
from dotenv import load_dotenv
from infrastructure.nlp_model import EmbeddingModel
from infrastructure.storage import AnalysisStorage
from application.analyze_meeting import analyze_meeting_use_case

load_dotenv()


def get_unprocessed_conversation_ids(storage) -> list:
    """Возвращает conversation_id из `phrase`, которых нет в `meeting_analysis`"""
    with storage._connect() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT DISTINCT conversation_id
                FROM phrase
                WHERE conversation_id NOT IN (
                    SELECT meeting_id FROM meeting_analysis
                )
            """)
            return [row[0] for row in cur.fetchall()]


# Расширяем AnalysisStorage для внутреннего подключения
def _connect(self):
    return psycopg2.connect(self.dsn)


import psycopg2
AnalysisStorage._connect = _connect


def main():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("❌ DATABASE_URL не задан")
        sys.exit(1)

    print("🧠 Загрузка NLP-модели...")
    model = EmbeddingModel()
    storage = AnalysisStorage(db_url)
    print("✅ Готов к работе. Начинаю мониторинг...")

    while True:
        try:
            unprocessed = get_unprocessed_conversation_ids(storage)
            if not unprocessed:
                print("⏳ Нет новых встреч. Жду 10 секунд...")
                time.sleep(10)
                continue

            for cid in unprocessed:
                print(f"🔍 Обрабатываю conversation_id: {cid}")
                utterances = storage.fetch_transcript_by_meeting_id(cid)
                if not utterances:
                    print(f"⚠️  Нет реплик для {cid}")
                    continue

                report = analyze_meeting_use_case(utterances, model)
                storage.save_analysis(cid, report)
                print(f"✅ Сохранён анализ для {cid}")

        except KeyboardInterrupt:
            print("\n🛑 Остановка анализа...")
            break
        except Exception as e:
            print(f"❌ Ошибка: {e}")
            time.sleep(5)


if __name__ == "__main__":
    main()