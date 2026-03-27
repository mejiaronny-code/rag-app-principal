from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from slowapi import Limiter
from slowapi.util import get_remote_address
import logging
import json
from groq import Groq
from config import get_settings
from db.supabase_client import get_supabase_client
from services.retriever import retrieve_context, format_context_for_prompt
from services.auth import get_current_user
from services.audit import log_event
from langsmith import traceable

logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)
router = APIRouter()

# ← NUEVO: timeout para Groq (segundos)
GROQ_TIMEOUT = 30.0

@traceable(name="rag_pipeline")
def _run_rag_pipeline(query, session_id, chat_history, document_ids, conversation_id, user_id):
    pass

def _get_client():
    settings = get_settings()
    return Groq(
        api_key=settings.GROQ_API_KEY,
        timeout=GROQ_TIMEOUT,    # ← NUEVO
    )


class ChatMessage(BaseModel):
    role: str
    content: str

# ← ELIMINADA la definición duplicada de ChatRequest que había antes
class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    session_id: str = Field(..., min_length=1)
    chat_history: List[ChatMessage] = Field(default_factory=list)
    document_ids: List[str] = Field(default_factory=list)
    conversation_id: Optional[str] = None

class SourceCard(BaseModel):
    document_name: str
    chunk_content: str
    similarity_score: float
    document_id: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceCard]
    session_id: str


RAG_SYSTEM_PROMPT = """Eres un asistente inteligente y útil. Tu función es responder preguntas 
basándote EXCLUSIVAMENTE en el contexto proporcionado por los documentos del usuario.

REGLAS IMPORTANTES:
1. Responde SIEMPRE en español, sin importar el idioma de la pregunta.
2. Usa SOLO la información del contexto para responder. No inventes datos.
3. Si la información no está en el contexto, dilo claramente: "No encontré información sobre esto en los documentos proporcionados."
4. Cita las fuentes relevantes de forma natural en tu respuesta.
5. Sé conciso pero completo. Usa markdown cuando sea apropiado.
6. Si el contexto es insuficiente, sugiere qué tipo de documento podría responder mejor la pregunta.

CONTEXTO DE LOS DOCUMENTOS:
{context}

HISTORIAL DE CONVERSACIÓN:
{history}"""


@router.post("", response_model=ChatResponse)
@limiter.limit("30/minute")
async def chat(
    request: Request,
    body: ChatRequest,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase_client()

    try:
        retrieved_chunks = retrieve_context(body.query, body.session_id, body.document_ids)
    except Exception as e:
        logger.exception("Error en retrieval")
        raise HTTPException(status_code=500, detail=f"Error buscando contexto: {e}")

    context_str = format_context_for_prompt(retrieved_chunks)
    history_str = _format_chat_history(body.chat_history)

    full_prompt = RAG_SYSTEM_PROMPT.format(
        context=context_str,
        history=history_str or "Sin historial previo.",
    ) + f"\n\nPREGUNTA ACTUAL: {body.query}"

    try:
        client = _get_client()
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": full_prompt}],
            max_tokens=2048,
            temperature=0.3,
        )
        answer = response.choices[0].message.content.strip()
    except Exception as e:
        logger.exception("Error generando respuesta con Groq")
        raise HTTPException(status_code=500, detail=f"Error del modelo: {e}")

    sources = _build_source_cards(retrieved_chunks)

    try:
        supabase.table("chat_history").insert([
            {
                "session_id": body.session_id,
                "user_id": user["id"],
                "role": "user",
                "content": body.query,
                "conversation_id": body.conversation_id,
            },
            {
                "session_id": body.session_id,
                "user_id": user["id"],
                "role": "assistant",
                "content": answer,
                "sources": json.dumps([s.dict() for s in sources]),
                "conversation_id": body.conversation_id,
            },
        ]).execute()
    except Exception as e:
        logger.warning(f"No se pudo guardar el historial: {e}")

    log_event(
        user["id"],
        "chat",
        {"query": body.query[:100], "session_id": body.session_id},
    )

    return ChatResponse(answer=answer, sources=sources, session_id=body.session_id)


def _format_chat_history(history: List[ChatMessage]) -> str:
    if not history:
        return ""
    lines = []
    for msg in history[-6:]:
        role_label = "Usuario" if msg.role == "user" else "Asistente"
        lines.append(f"{role_label}: {msg.content}")
    return "\n".join(lines)


def _build_source_cards(chunks: List[Dict[str, Any]]) -> List[SourceCard]:
    sources = []
    seen = set()
    for chunk in chunks:
        doc_name = chunk.get("document_name", "Desconocido")
        content  = chunk.get("content", "")
        key = (doc_name, content[:100])
        if key in seen:
            continue
        seen.add(key)
        sources.append(SourceCard(
            document_name=doc_name,
            chunk_content=content[:300],
            similarity_score=round(chunk.get("similarity", 0.0), 4),
            document_id=chunk.get("document_id"),
        ))
    return sources[:5]