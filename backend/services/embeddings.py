import httpx
from functools import lru_cache
from config import get_settings
from typing import List
from langsmith import traceable
import logging
logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMS  = 3072
BASE_URL        = "https://generativelanguage.googleapis.com/v1beta/models"


def _embed(text: str, task_type: str) -> List[float]:
    settings = get_settings()
    url = f"{BASE_URL}/{EMBEDDING_MODEL}:embedContent?key={settings.GOOGLE_API_KEY}"
    payload = {
        "model": f"models/{EMBEDDING_MODEL}",
        "content": {"parts": [{"text": text}]},
        "taskType": task_type,
    }
    response = httpx.post(url, json=payload, timeout=30.0)
    if response.status_code != 200:
        logger.error(f"Gemini error body: {response.text}")
    response.raise_for_status()
    return response.json()["embedding"]["values"]


# ← NUEVO: mismo texto = mismo embedding siempre → lru_cache es seguro aquí
# maxsize=512 ≈ 2MB de RAM máximo (cada embedding es ~24KB)
@lru_cache(maxsize=512)
def _embed_cached(text: str, task_type: str) -> tuple:
    """Versión cacheada de _embed. Retorna tuple (hashable) para que lru_cache funcione."""
    return tuple(_embed(text, task_type))


def get_embedding(text: str) -> List[float]:
    clean = " ".join(text.split())[:1500]
    if not clean:
        raise ValueError("Texto vacío para embedding")
    return list(_embed_cached(clean, "RETRIEVAL_DOCUMENT"))


@traceable(name="get_query_embedding")
def get_query_embedding(text: str) -> List[float]:
    # Sanitizar: limpiar saltos de línea extras y truncar si es muy largo
    clean = " ".join(text.split())[:1500]
    if not clean:
        raise ValueError("Texto vacío para embedding")
    return list(_embed_cached(clean, "RETRIEVAL_QUERY"))


def get_embeddings_batch(texts: List[str]) -> List[List[float]]:
    return [get_embedding(t) for t in texts]