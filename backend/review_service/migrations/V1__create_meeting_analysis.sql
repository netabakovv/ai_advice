CREATE TABLE IF NOT EXISTS meeting_analysis (
    meeting_id UUID PRIMARY KEY,
    analyzed_at TIMESTAMP DEFAULT NOW(),
    data JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_meeting_analysis_offtopic ON meeting_analysis USING GIN ((data->'off_topic_segments'));