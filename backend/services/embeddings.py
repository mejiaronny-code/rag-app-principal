import httpx
from functools import lru_cache
from config import get_settings
from typing import List
from langsmith import traceable
import openai
import os
import logging
logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "text-embedding-3-large"
EMBEDDING_DIMS  = 3072


def _embed(text: str, task_type: str) -> List[float]:
    settings = get_settings()
    client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
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
    if not texts:
        return []
    settings = get_settings()
    client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
    
    all_embeddings = []
    batch_size = 100  # OpenAI acepta hasta 2048 inputs por llamada
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        clean_batch = [" ".join(t.split())[:1500] for t in batch]
        response = client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=clean_batch,
        )
        # Ordenar por índice para garantizar el orden correcto
        sorted_data = sorted(response.data, key=lambda x: x.index)
        all_embeddings.extend([item.embedding for item in sorted_data])
    
    return all_embeddings