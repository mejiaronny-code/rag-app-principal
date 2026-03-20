from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
from db.supabase_client import get_supabase_client
from services.auth import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class CreateConversationRequest(BaseModel):
    session_id: str
    title: str = "Nueva conversación"


class UpdateConversationRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)


@router.get("")
async def get_conversations(user: dict = Depends(get_current_user)):
    """Lista todas las conversaciones del usuario."""
    supabase = get_supabase_client()
    result = supabase.table("conversations") \
        .select("id, title, created_at, updated_at") \
        .eq("user_id", user["id"]) \
        .order("updated_at", desc=True) \
        .limit(50) \
        .execute()
    return {"conversations": result.data or []}


@router.post("")
async def create_conversation(
    body: CreateConversationRequest,
    user: dict = Depends(get_current_user),
):
    """Crea una nueva conversación."""
    supabase = get_supabase_client()
    result = supabase.table("conversations").insert({
        "user_id": user["id"],
        "session_id": body.session_id,
        "title": body.title,
    }).execute()
    return result.data[0]


@router.patch("/{conversation_id}")
async def update_conversation_title(
    conversation_id: str,
    body: UpdateConversationRequest,
    user: dict = Depends(get_current_user),
):
    """Actualiza el título de una conversación."""
    supabase = get_supabase_client()
    result = supabase.table("conversations") \
        .update({"title": body.title}) \
        .eq("id", conversation_id) \
        .eq("user_id", user["id"]) \
        .execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Conversación no encontrada.")
    return result.data[0]


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    user: dict = Depends(get_current_user),
):
    """Elimina una conversación y su historial."""
    supabase = get_supabase_client()
    supabase.table("conversations") \
        .delete() \
        .eq("id", conversation_id) \
        .eq("user_id", user["id"]) \
        .execute()
    return {"success": True}


@router.get("/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: str,
    user: dict = Depends(get_current_user),
):
    """Obtiene los mensajes de una conversación específica."""
    supabase = get_supabase_client()

    # Verificar que pertenece al usuario
    conv = supabase.table("conversations") \
        .select("id") \
        .eq("id", conversation_id) \
        .eq("user_id", user["id"]) \
        .execute()

    if not conv.data:
        raise HTTPException(status_code=404, detail="Conversación no encontrada.")

    messages = supabase.table("chat_history") \
        .select("id, role, content, sources, created_at") \
        .eq("conversation_id", conversation_id) \
        .order("created_at", desc=False) \
        .execute()

    return {"messages": messages.data or []}