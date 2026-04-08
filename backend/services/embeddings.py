import httpx
from functools import lru_cache
from config import get_settings
from typing import List
from langsmith import traceable
import openai
import logging
logger = logging.getLogger(__name__)

EMBEDDING_DIMS  = 3072


def _embed(text: str, task_type: str) -> List[float]:
    settings = get_settings()
    client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.embeddings.create(
        model="text-embedding-3-large",
        input=text,
    )
    return response.data[0].embedding


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