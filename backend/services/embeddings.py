import httpx
from config import get_settings
from typing import List
from langsmith import traceable

EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMS = 3072   
BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

def _embed(text: str, task_type: str) -> List[float]:
    settings = get_settings()
    url = f"{BASE_URL}/{EMBEDDING_MODEL}:embedContent?key={settings.GOOGLE_API_KEY}"
    payload = {
        "model": f"models/{EMBEDDING_MODEL}",
        "content": {"parts": [{"text": text}]},
        "taskType": task_type,
    }
    response = httpx.post(url, json=payload, timeout=30.0)
    response.raise_for_status()
    return response.json()["embedding"]["values"]


def get_embedding(text: str) -> List[float]:
    return _embed(text, "RETRIEVAL_DOCUMENT")

@traceable(name="get_query_embedding")
def get_query_embedding(text: str) -> List[float]:
    return _embed(text, "RETRIEVAL_QUERY")


def get_embeddings_batch(texts: List[str]) -> List[List[float]]:
    return [get_embedding(t) for t in texts]