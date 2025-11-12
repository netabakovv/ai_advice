from sentence_transformers import SentenceTransformer


class EmbeddingModel:
    def __init__(self, model_name: str = 'paraphrase-multilingual-MiniLM-L12-v2'):
        print("Загрузка модели эмбеддингов...")
        self.model = SentenceTransformer(model_name)
        print("Модель загружена.")

    def encode(self, texts, **kwargs):
        return self.model.encode(texts, **kwargs)