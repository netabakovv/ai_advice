import re
from collections import defaultdict
from typing import List, Tuple, Dict
from sklearn.cluster import AgglomerativeClustering
import numpy as np
from domain.models import Utterance, MeetingReport
from infrastructure.nlp_model import EmbeddingModel


def analyze_meeting_use_case(
    utterances: List[Utterance],
    embedding_model: EmbeddingModel,
    distance_threshold: float = 0.75
) -> MeetingReport:
    if not utterances:
        return MeetingReport(
            inferred_topic="Встреча пуста",
            speaker_stats={},
            off_topic_segments=[],
            total_utterances=0,
            off_topic_count=0
        )

    def is_too_short(text: str, min_words=3) -> bool:
        return len(text.split()) < min_words

    def is_offtopic_heuristic(text: str) -> bool:
        low = text.lower()
        return any(p in low for p in ['анекдот', 'сериал', 'фильм', 'вчера в', 'а вы знали', 'кстати,', 'история про'])

    speaker_stats = defaultdict(lambda: {"words": 0, "utterances": 0})
    raw_texts = []
    for u in utterances:
        word_count = len(re.findall(r'\S+', u.text))
        speaker_stats[u.speaker]["words"] += word_count
        speaker_stats[u.speaker]["utterances"] += 1
        raw_texts.append(u.text.strip())

    embeddings = embedding_model.encode(raw_texts, show_progress_bar=False)
    clustering = AgglomerativeClustering(n_clusters=None, distance_threshold=distance_threshold, linkage='average')
    cluster_labels = clustering.fit_predict(embeddings)

    unique, counts = np.unique(cluster_labels, return_counts=True)
    cluster_sizes = dict(zip(unique, counts))

    off_topic_segments = []
    main_topic_texts = []

    if max(cluster_sizes.values()) == 1:
        # fallback на эвристику
        for u in utterances:
            if is_offtopic_heuristic(u.text):
                off_topic_segments.append({"speaker": u.speaker, "text": u.text})
            else:
                main_topic_texts.append(u.text)
    else:
        main_cluster = unique[np.argmax(counts)]
        for i, u in enumerate(utterances):
            if cluster_labels[i] != main_cluster:
                off_topic_segments.append({"speaker": u.speaker, "text": u.text})
            else:
                if not is_too_short(u.text):
                    main_topic_texts.append(u.text)

    inferred_topic = " | ".join(main_topic_texts[:3])
    if len(inferred_topic) > 300:
        inferred_topic = inferred_topic[:300] + "..."

    return MeetingReport(
        inferred_topic=inferred_topic or "Не удалось определить тему",
        speaker_stats=dict(speaker_stats),
        off_topic_segments=off_topic_segments,
        total_utterances=len(utterances),
        off_topic_count=len(off_topic_segments)
    )
