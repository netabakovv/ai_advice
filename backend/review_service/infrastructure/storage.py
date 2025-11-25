import json
from typing import Optional, Dict, Any, List
import psycopg2
from psycopg2.extras import Json, RealDictCursor
from domain.models import MeetingReport
from domain.models import Utterance


class AnalysisStorage:
    def __init__(self, dsn: str):
        self.dsn = dsn

    def save_analysis(self, meeting_id: str, report: MeetingReport) -> None:
        data = {
            "inferred_topic": report.inferred_topic,
            "speaker_stats": report.speaker_stats,
            "off_topic_segments": report.off_topic_segments,
            "total_utterances": report.total_utterances,
            "off_topic_count": report.off_topic_count
        }

        with psycopg2.connect(self.dsn) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO meeting_analysis (meeting_id, data)
                    VALUES (%s, %s)
                    ON CONFLICT (meeting_id)
                    DO UPDATE SET data = EXCLUDED.data, analyzed_at = NOW();
                    """,
                    (meeting_id, Json(data))
                )

    def get_analysis(self, meeting_id: str) -> Optional[Dict[str, Any]]:
        with psycopg2.connect(self.dsn) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT data FROM meeting_analysis WHERE meeting_id = %s;",
                    (meeting_id,)
                )
                row = cur.fetchone()
                if row:
                    return row[0]
                return None

    def fetch_transcript_by_meeting_id(self, meeting_id: str) -> List[Utterance]:
        """
        Читает реплики из общей таблицы транскрипций.
        Предполагается, что таблица называется `transcripts` и имеет колонки:
        - meeting_id
        - speaker (или speaker_id)
        - text
        """
        with psycopg2.connect(self.dsn) as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT speaker, text
                    FROM phrase
                    WHERE conversation_id = %s
                    ORDER BY id  -- или timestamp, если есть
                    """,
                    (meeting_id,)
                )
                rows = cur.fetchall()
                return [Utterance(row["speaker"], row["text"]) for row in rows]