# backend/routers/admin.py
from fastapi import APIRouter, Depends, HTTPException, Request
from services.auth import get_current_user
from services.retriever import retrieve_context
from db.supabase_client import get_supabase_client
from config import get_settings
from limiter import limiter                          # ← NUEVO
from groq import Groq

router = APIRouter(prefix="/admin", tags=["admin"])

# ─── Límites de rate ──────────────────────────────────────────────────────────
ADMIN_CHAT_RATE  = "10/minute"    # ← NUEVO
ADMIN_WRITE_RATE = "30/minute"    # ← NUEVO
ADMIN_READ_RATE  = "60/minute"    # ← NUEVO

# Máx. documentos que /admin/chat carga en memoria (Fix 4)          # ← NUEVO
ADMIN_GLOBAL_DOC_LIMIT = 200                                         # ← NUEVO


# ─── Groq client ─────────────────────────────────────────────────────────────
def _get_groq_client():
    settings = get_settings()
    return Groq(api_key=settings.GROQ_API_KEY)


# ─── Dependencia: solo admins ─────────────────────────────────────────────────
def require_admin(current_user=Depends(get_current_user)):
    supabase = get_supabase_client()
    profile = (
        supabase.table("profiles")
        .select("role")
        .eq("id", current_user["id"])
        .single()
        .execute()
    )
    if not profile.data or profile.data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acceso restringido a administradores.")
    return current_user


# ─── Stats ────────────────────────────────────────────────────────────────────
@router.get("/stats")
@limiter.limit(ADMIN_READ_RATE)                                      # ← NUEVO
async def get_stats(request: Request, admin=Depends(require_admin)): # ← NUEVO: request: Request
    supabase = get_supabase_client()
    users_count    = supabase.table("profiles").select("id", count="exact").execute().count
    docs_count     = supabase.table("documents").select("id", count="exact").execute().count
    messages_count = supabase.table("chat_history").select("id", count="exact").execute().count
    return {
        "total_users":     users_count,
        "total_documents": docs_count,
        "total_messages":  messages_count,
    }


# ─── Usuarios ─────────────────────────────────────────────────────────────────
@router.get("/users")
@limiter.limit(ADMIN_READ_RATE)                                      # ← NUEVO
async def list_users(request: Request, admin=Depends(require_admin)): # ← NUEVO: request: Request
    supabase = get_supabase_client()
    profiles = supabase.table("profiles").select("*").execute().data
    result = []
    for p in profiles:
        doc_count = (
            supabase.table("documents")
            .select("id", count="exact")
            .eq("user_id", p["id"])
            .execute()
            .count
        )
        result.append({**p, "document_count": doc_count})
    return result


@router.patch("/users/{user_id}/deactivate")
@limiter.limit(ADMIN_WRITE_RATE)                                     # ← NUEVO
async def deactivate_user(
    request: Request,                                                 # ← NUEVO
    user_id: str,
    admin=Depends(require_admin),
):
    supabase = get_supabase_client()
    supabase.table("profiles").update({"active": False}).eq("id", user_id).execute()
    return {"message": f"Usuario {user_id} desactivado."}


@router.patch("/users/{user_id}/activate")
@limiter.limit(ADMIN_WRITE_RATE)                                     # ← NUEVO
async def activate_user(
    request: Request,                                                 # ← NUEVO
    user_id: str,
    admin=Depends(require_admin),
):
    supabase = get_supabase_client()
    supabase.table("profiles").update({"active": True}).eq("id", user_id).execute()
    return {"message": f"Usuario {user_id} activado."}


# ─── Documentos de un usuario ────────────────────────────────────────────────
@router.get("/users/{user_id}/documents")
@limiter.limit(ADMIN_READ_RATE)                                      # ← NUEVO
async def get_user_documents(
    request: Request,                                                 # ← NUEVO
    user_id: str,
    admin=Depends(require_admin),
):
    supabase = get_supabase_client()
    docs = (
        supabase.table("documents")
        .select("id, name, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
        .data
    )
    return {"documents": docs}


# ─── URL de un documento (admin) ─────────────────────────────────────────────
@router.get("/documents/{doc_id}/url")
@limiter.limit(ADMIN_READ_RATE)                                      # ← NUEVO
async def admin_get_document_url(
    request: Request,                                                 # ← NUEVO
    doc_id: str,
    admin=Depends(require_admin),
):
    supabase = get_supabase_client()
    doc = (
        supabase.table("documents")
        .select("storage_path, name, source_url, type")
        .eq("id", doc_id)
        .execute()
    )
    if not doc.data:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")
    data = doc.data[0]
    if data.get("type") == "url" and data.get("source_url"):
        return {"url": data["source_url"], "type": "url", "name": data["name"]}
    if data.get("storage_path"):
        signed = supabase.storage.from_("documents").create_signed_url(
            path=data["storage_path"],
            expires_in=3600
        )
        return {"url": signed["signedURL"], "type": "file", "name": data["name"]}
    raise HTTPException(status_code=404, detail="Este documento no tiene archivo original guardado.")


# ─── Chat RAG sobre documentos de un usuario específico ──────────────────────
@router.post("/users/{user_id}/chat")
@limiter.limit(ADMIN_CHAT_RATE)                                      # ← NUEVO
async def admin_chat_user(
    request: Request,                                                 # ← NUEVO
    user_id: str,
    body: dict,
    admin=Depends(require_admin),
):
    supabase     = get_supabase_client()
    question     = body.get("question", "").strip()
    document_ids = body.get("document_ids")

    if not question:
        raise HTTPException(status_code=400, detail="La pregunta no puede estar vacía.")

    doc_rows = (
        supabase.table("documents")
        .select("id")
        .eq("user_id", user_id)
        .execute()
        .data
    )
    user_doc_ids = [d["id"] for d in doc_rows]

    if not user_doc_ids:
        return {"answer": "Este usuario no tiene documentos.", "sources": []}

    target_doc_ids = (
        [d for d in document_ids if d in user_doc_ids]
        if document_ids else user_doc_ids
    )

    if not target_doc_ids:
        return {"answer": "Ninguno de los documentos seleccionados pertenece a este usuario.", "sources": []}

    chunks = retrieve_context(
        query=question,
        session_id="00000000-0000-0000-0000-000000000000",
        document_ids=target_doc_ids,
    )

    if not chunks:
        return {
            "answer":  "No encontré información relevante en los documentos de este usuario.",
            "sources": [],
        }

    context_lines = []
    for c in chunks:
        doc_name = c.get("document_name", "Documento")
        content  = c.get("content", "")
        context_lines.append(f"[{doc_name}]\n{content}")
    context_str = "\n\n---\n\n".join(context_lines)

    prompt = f"""Eres un asistente de análisis para administradores. Responde en español basándote EXCLUSIVAMENTE en el contexto proporcionado. No inventes datos.

CONTEXTO:
{context_str}

PREGUNTA: {question}"""

    client   = _get_groq_client()
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=2048,
        temperature=0.3,
    )
    answer  = response.choices[0].message.content.strip()
    sources = list({c.get("document_name", "") for c in chunks if c.get("document_name")})

    return {"answer": answer, "sources": sources}


# ─── Chat RAG global (todos los usuarios) ────────────────────────────────────
@router.post("/chat")
@limiter.limit(ADMIN_CHAT_RATE)                                      # ← NUEVO
async def admin_global_chat(
    request: Request,                                                 # ← NUEVO
    body: dict,
    admin=Depends(require_admin),
):
    """Admin: preguntar sobre los documentos de TODOS los usuarios a la vez."""
    supabase = get_supabase_client()
    question = body.get("question", "").strip()

    if not question:
        raise HTTPException(status_code=400, detail="La pregunta no puede estar vacía.")

    # ← NUEVO: limitar a los N documentos más recientes para evitar OOM
    all_docs = (
        supabase.table("documents")
        .select("id, name, user_id")
        .order("created_at", desc=True)
        .limit(ADMIN_GLOBAL_DOC_LIMIT)
        .execute()
        .data
    )
    if not all_docs:
        return {"answer": "No hay documentos en la plataforma.", "sources": []}

    all_doc_ids = [d["id"] for d in all_docs]

    user_ids = list({d["user_id"] for d in all_docs})
    profiles = (
        supabase.table("profiles")
        .select("id, first_name, last_name")
        .in_("id", user_ids)
        .execute()
        .data
    )
    user_map     = {p["id"]: f"{p['first_name']} {p['last_name']}".strip() for p in profiles}
    doc_user_map = {d["id"]: user_map.get(d["user_id"], "Usuario desconocido") for d in all_docs}

    chunks = retrieve_context(
        query=question,
        session_id="00000000-0000-0000-0000-000000000000",
        document_ids=all_doc_ids,
    )

    if not chunks:
        return {
            "answer":  "No encontré información relevante en ningún documento de la plataforma.",
            "sources": [],
        }

    context_lines = []
    for c in chunks:
        doc_name  = c.get("document_name", "Documento")
        doc_id    = str(c.get("document_id", ""))
        user_name = doc_user_map.get(doc_id, "Usuario desconocido")
        content   = c.get("content", "")
        context_lines.append(f"[Usuario: {user_name} | Documento: {doc_name}]\n{content}")
    context_str = "\n\n---\n\n".join(context_lines)

    prompt = f"""Eres un asistente de análisis para administradores. Tienes acceso a documentos de MÚLTIPLES usuarios de la plataforma.
Responde en español basándote EXCLUSIVAMENTE en el contexto proporcionado.
Cuando sea relevante, indica a qué usuario pertenece la información.
No inventes datos.

CONTEXTO:
{context_str}

PREGUNTA: {question}"""

    client   = _get_groq_client()
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=2048,
        temperature=0.3,
    )
    answer = response.choices[0].message.content.strip()

    sources = []
    seen    = set()
    for c in chunks:
        doc_id    = str(c.get("document_id", ""))
        doc_name  = c.get("document_name", "")
        user_name = doc_user_map.get(doc_id, "?")
        key = (user_name, doc_name)
        if key not in seen:
            seen.add(key)
            sources.append({"user": user_name, "doc": doc_name})

    return {"answer": answer, "sources": sources}


# ─── Eliminar documento ───────────────────────────────────────────────────────
@router.delete("/documents/{doc_id}")
@limiter.limit(ADMIN_WRITE_RATE)                                     # ← NUEVO
async def admin_delete_document(
    request: Request,                                                 # ← NUEVO
    doc_id: str,
    admin=Depends(require_admin),
):
    supabase = get_supabase_client()
    supabase.table("embeddings").delete().eq("document_id", doc_id).execute()
    supabase.table("documents").delete().eq("id", doc_id).execute()
    return {"message": f"Documento {doc_id} eliminado."}


# ─── Audit log ────────────────────────────────────────────────────────────────
@router.get("/audit-logs")
@limiter.limit(ADMIN_READ_RATE)                                      # ← NUEVO
async def get_audit_logs(
    request: Request,                                                 # ← NUEVO
    limit: int = 100,
    admin=Depends(require_admin),
):
    supabase = get_supabase_client()
    logs = (
        supabase.table("audit_logs")
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
        .data
    )
    return logs