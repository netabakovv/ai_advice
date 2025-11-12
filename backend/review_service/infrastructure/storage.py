import json
from typing import Optional, Dict, Any
import psycopg2
from psycopg2.extras import Json
from domain.models import MeetingReport


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