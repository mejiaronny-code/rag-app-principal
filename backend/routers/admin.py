from fastapi import APIRouter, Depends, HTTPException
from services.auth import get_current_user
from db.supabase_client import get_supabase_client

router = APIRouter(prefix="/admin", tags=["admin"])


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


@router.get("/stats")
async def get_stats(admin=Depends(require_admin)):
    supabase = get_supabase_client()
    users_count    = supabase.table("profiles").select("id", count="exact").execute().count
    docs_count     = supabase.table("documents").select("id", count="exact").execute().count
    messages_count = supabase.table("chat_history").select("id", count="exact").execute().count
    return {
        "total_users": users_count,
        "total_documents": docs_count,
        "total_messages": messages_count,
    }


@router.get("/users")
async def list_users(admin=Depends(require_admin)):
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
async def deactivate_user(user_id: str, admin=Depends(require_admin)):
    supabase = get_supabase_client()
    supabase.table("profiles").update({"active": False}).eq("id", user_id).execute()
    return {"message": f"Usuario {user_id} desactivado."}


@router.patch("/users/{user_id}/activate")
async def activate_user(user_id: str, admin=Depends(require_admin)):
    supabase = get_supabase_client()
    supabase.table("profiles").update({"active": True}).eq("id", user_id).execute()
    return {"message": f"Usuario {user_id} activado."}


@router.get("/users/{user_id}/documents")
async def get_user_documents(user_id: str, admin=Depends(require_admin)):
    supabase = get_supabase_client()
    docs = (
        supabase.table("documents")
        .select("*")
        .eq("user_id", user_id)
        .execute()
        .data
    )
    return docs


@router.delete("/documents/{doc_id}")
async def admin_delete_document(doc_id: str, admin=Depends(require_admin)):
    supabase = get_supabase_client()
    supabase.table("embeddings").delete().eq("document_id", doc_id).execute()
    supabase.table("documents").delete().eq("id", doc_id).execute()
    return {"message": f"Documento {doc_id} eliminado."}


@router.get("/audit-logs")
async def get_audit_logs(limit: int = 100, admin=Depends(require_admin)):
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