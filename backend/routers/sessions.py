from fastapi import APIRouter, HTTPException, Depends
from db.supabase_client import get_supabase_client
import logging
from services.auth import get_current_user
from services.audit import log_event

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/{session_id}/documents")
async def get_session_documents(session_id: str, user: dict = Depends(get_current_user)):
    """Lista todos los documentos de una sesión."""
    supabase = get_supabase_client()
    result = supabase.table("documents") \
        .select("id, name, type, source_url, created_at") \
        .eq("session_id", session_id) \
        .eq("user_id", user["id"]) \
        .order("created_at", desc=False) \
        .execute()

    return {"documents": result.data or [], "session_id": session_id}


@router.delete("/{session_id}/documents/{doc_id}")
async def delete_document(
    session_id: str,
    doc_id: str,
    user: dict = Depends(get_current_user),
):
    """Elimina un documento y sus embeddings (cascade)."""
    supabase = get_supabase_client()

    # Verificar que el documento pertenece a la sesión
    existing = supabase.table("documents") \
        .select("id") \
        .eq("id", doc_id) \
        .eq("session_id", session_id) \
        .eq("user_id", user["id"]) \
        .execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Documento no encontrado en esta sesión.")

    supabase.table("documents").delete().eq("id", doc_id).eq("user_id", user["id"]).execute()
    log_event(
        user["id"],
        "delete_doc",
        {"document_id": doc_id, "session_id": session_id},
    )
    return {"success": True, "deleted_document_id": doc_id}


@router.get("/{session_id}/history")
async def get_chat_history(session_id: str, limit: int = 50, user: dict = Depends(get_current_user)):
    """Obtiene el historial de chat de una sesión."""
    supabase = get_supabase_client()
    result = supabase.table("chat_history") \
        .select("id, role, content, sources, created_at") \
        .eq("session_id", session_id) \
        .eq("user_id", user["id"]) \
        .order("created_at", desc=False) \
        .limit(limit) \
        .execute()

    return {"history": result.data or [], "session_id": session_id}


@router.delete("/{session_id}")
async def delete_session(session_id: str, user: dict = Depends(get_current_user)):
    """
    Elimina completamente una sesión:
    - Documentos y sus embeddings (cascade)
    - Historial de chat
    """
    supabase = get_supabase_client()

    # Eliminar documentos (embeddings se eliminan en cascade)
    supabase.table("documents").delete().eq("session_id", session_id).eq("user_id", user["id"]).execute()

    # Eliminar historial de chat
    supabase.table("chat_history").delete().eq("session_id", session_id).eq("user_id", user["id"]).execute()

    logger.info(f"Sesión {session_id} eliminada completamente.")
    log_event(
        user["id"],
        "delete_session",
        {"session_id": session_id},
    )
    return {"success": True, "deleted_session_id": session_id}
