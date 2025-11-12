from typing import List, Dict, Optional


class Utterance:
    def __init__(self, speaker: str, text: str):
        self.speaker = speaker
        self.text = text


class MeetingReport:
    def __init__(
        self,
        inferred_topic: str,
        speaker_stats: Dict[str, Dict[str, int]],
        off_topic_segments: List[Dict[str, str]],
        total_utterances: int,
        off_topic_count: int
    ):
        self.inferred_topic = inferred_topic
        self.speaker_stats = speaker_stats
        self.off_topic_segments = off_topic_segments
        self.total_utterances = total_utterances
        self.off_topic_count = off_topic_count