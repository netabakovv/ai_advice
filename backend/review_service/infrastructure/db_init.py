import psycopg2
import os


def init_db():
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur = conn.cursor()

    with open("migrations/V1__create_meeting_analysis.sql", "r", encoding="utf-8") as f:
        cur.execute(f.read())

    conn.commit()
    cur.close()
    conn.close()
    print("✅ База данных инициализирована")