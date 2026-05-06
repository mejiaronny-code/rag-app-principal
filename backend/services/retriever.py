from typing import List, Dict, Any, Optional
import logging
from db.supabase_client import get_supabase_client
from services.embeddings import get_query_embedding
from services.multiquery import generate_query_variants
from langsmith import traceable

logger = logging.getLogger(__name__)

MATCH_THRESHOLD = 0.15
MATCH_COUNT = 8  # por variante del query

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
            "filter_document_ids": document_ids if document_ids else None,
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
    return deduplicated[:15]  # Top 10 chunks únicos

@traceable(name="retrieve_context")
def retrieve_context(query: str, session_id: str, document_ids: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    variants = generate_query_variants(query)
    all_queries = [query] + variants

    # Si hay documentos específicos, hacer retrieval por cada uno
    if document_ids and len(document_ids) > 0:
        all_results = []
        chunks_per_doc = max(3, 10 // len(document_ids))  # distribuir equitativamente
        
        for doc_id in document_ids:
            for q in all_queries[:2]:  # solo query original + 1 variante por doc
                try:
                    embedding = get_query_embedding(q)
                    results = search_similar_chunks(
                        query_embedding=embedding,
                        session_id=session_id,
                        document_ids=[doc_id],  # ← un doc a la vez
                        match_count=chunks_per_doc,
                        match_threshold=0.15,  # ← más bajo para no perder docs con menor similitud
                    )
                    all_results.append(results)
                    for r in results:
                        logger.info(f"  doc={doc_id[:8]} chunk='{r.get('document_name')}' sim={r.get('similarity', 0):.3f}")
                except Exception as e:
                    logger.warning(f"Error en retrieval para doc {doc_id}: {e}")
                    all_results.append([])
    else:
        # Sin selección específica — comportamiento original
        all_results = []
        for q in all_queries:
            try:
                embedding = get_query_embedding(q)
                results = search_similar_chunks(
                    query_embedding=embedding,
                    session_id=session_id,
                    document_ids=None,
                )
                all_results.append(results)
            except Exception as e:
                logger.warning(f"Error en retrieval para variante '{q}': {e}")
                all_results.append([])

    final_chunks = deduplicate_chunks(all_results)
    logger.info(f"Total chunks únicos recuperados: {len(final_chunks)}")
    return final_chunks


def format_context_for_prompt(chunks: List[Dict[str, Any]]) -> str:
    if not chunks:
        return "No se encontró contexto relevante en los documentos."

    # Agrupar chunks por documento
    docs: Dict[str, list] = {}
    for chunk in chunks:
        doc_name = chunk.get("document_name", "Documento desconocido")
        if doc_name not in docs:
            docs[doc_name] = []
        docs[doc_name].append(chunk)

    context_parts = []
    for doc_name, doc_chunks in docs.items():
        # Combinar el contenido de todos los chunks del mismo documento
        combined = "\n\n".join(
            c.get("content", "") for c in doc_chunks
        )
        best_similarity = max(c.get("similarity", 0) for c in doc_chunks)
        context_parts.append(
            f"[Documento: {doc_name} (relevancia: {best_similarity:.2%})]\n{combined}"
        )

    return "\n\n---\n\n".join(context_parts)