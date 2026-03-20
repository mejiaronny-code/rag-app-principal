from typing import List, Dict, Any, Optional
import logging
from db.supabase_client import get_supabase_client
from services.embeddings import get_query_embedding
from services.multiquery import generate_query_variants
from langsmith import traceable

logger = logging.getLogger(__name__)

MATCH_THRESHOLD = 0.5
MATCH_COUNT = 5  # por variante del query

@traceable(name="search_similar_chunks")
def search_similar_chunks(
    query_embedding: List[float],
    session_id: str,
    document_ids: Optional[List[str]] = None,
    match_count: int = MATCH_COUNT,
    match_threshold: float = MATCH_THRESHOLD,
) -> List[Dict[str, Any]]:
    """Busca chunks similares en Supabase usando pgvector."""
    supabase = get_supabase_client()
    
    result = supabase.rpc(
        "match_embeddings",
        {
            "query_embedding": query_embedding,
            "match_session_id": session_id,
            "match_threshold": match_threshold,
            "match_count": match_count,
            "filter_document_ids": document_ids or [],
        },
    ).execute()
    
    return result.data or []


def deduplicate_chunks(chunks_lists: List[List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
    """Deduplica chunks de múltiples listas, manteniendo el de mayor score."""
    seen_ids = {}
    
    for chunk_list in chunks_lists:
        for chunk in chunk_list:
            chunk_id = chunk.get("id")
            if chunk_id not in seen_ids:
                seen_ids[chunk_id] = chunk
            else:
                # Mantener el de mayor similitud
                if chunk.get("similarity", 0) > seen_ids[chunk_id].get("similarity", 0):
                    seen_ids[chunk_id] = chunk
    
    # Ordenar por similitud descendente
    deduplicated = sorted(seen_ids.values(), key=lambda x: x.get("similarity", 0), reverse=True)
    return deduplicated[:10]  # Top 10 chunks únicos

@traceable(name="retrieve_context")
def retrieve_context(query: str, session_id: str, document_ids: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """
    Multi-Query Retrieval:
    1. Genera 3 variantes del query
    2. Hace retrieval de cada una
    3. Deduplica y ordena por relevancia
    """
    # Generar variantes del query
    variants = generate_query_variants(query)
    all_queries = [query] + variants  # Query original + 3 variantes
    
    all_results = []
    for q in all_queries:
        try:
            embedding = get_query_embedding(q)
            results = search_similar_chunks(
                query_embedding=embedding,
                session_id=session_id,
                document_ids=document_ids,
            )
            all_results.append(results)
            logger.info(f"Query '{q[:50]}...' → {len(results)} resultados")
        except Exception as e:
            logger.warning(f"Error en retrieval para variante '{q}': {e}")
            all_results.append([])
    
    # Deduplicar y retornar top chunks
    final_chunks = deduplicate_chunks(all_results)
    logger.info(f"Total chunks únicos recuperados: {len(final_chunks)}")
    
    return final_chunks


def format_context_for_prompt(chunks: List[Dict[str, Any]]) -> str:
    """Formatea los chunks recuperados para incluirlos en el prompt."""
    if not chunks:
        return "No se encontró contexto relevante en los documentos."
    
    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        doc_name = chunk.get("document_name", "Documento desconocido")
        content = chunk.get("content", "")
        similarity = chunk.get("similarity", 0)
        context_parts.append(
            f"[Fuente {i} - {doc_name} (relevancia: {similarity:.2%})]\n{content}"
        )
    
    return "\n\n---\n\n".join(context_parts)
