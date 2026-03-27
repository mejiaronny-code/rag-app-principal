from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
import uuid as uuid_lib
import logging
from typing import Optional
import time
import asyncio
from functools import partial

from config import get_settings
from db.supabase_client import get_supabase_client
from services.ingestion import process_document, extract_text_from_url
from services.embeddings import get_embeddings_batch
from services.auth import get_current_user
from services.audit import log_event

logger = logging.getLogger(__name__)
settings = get_settings()
limiter = Limiter(key_func=get_remote_address)

router = APIRouter()

MAX_FILE_SIZE    = settings.MAX_FILE_SIZE_MB * 1024 * 1024
MAX_DOCS_PER_USER = settings.MAX_DOCS_PER_USER

ALLOWED_EXTENSIONS = {
    "pdf", "docx", "doc", "txt", "md", "markdown",
    "jpg", "jpeg", "png", "gif", "webp", "xlsx", "xls"
}


async def check_document_limit(user_id: str, supabase):
    """Lanza 429 si el usuario alcanzó su límite."""
    settings = get_settings()
    result = (
        supabase.table("documents")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .execute()
    )
    count = result.count or 0
    if count >= MAX_DOCS_PER_USER:
        raise HTTPException(
            status_code=429,
            detail=f"Límite alcanzado: máximo {MAX_DOCS_PER_USER} documentos por usuario. "
                   f"Elimina alguno antes de subir otro."
        )


# ← NUEVO: valida que session_id no pertenezca a otro usuario
async def check_session_owner(session_id: str, user_id: str, supabase):
    """
    Si el session_id ya tiene documentos, verifica que sean del mismo usuario.
    Evita que un usuario suba documentos a la sesión de otro.
    """
    existing = (
        supabase.table("documents")
        .select("user_id")
        .eq("session_id", session_id)
        .limit(1)
        .execute()
    )
    if existing.data and existing.data[0]["user_id"] != user_id:
        raise HTTPException(
            status_code=403,
            detail="No tienes acceso a esta sesión."
        )


@router.post("/upload")
@limiter.limit("10/minute")
async def upload_document(
    request: Request,
    session_id: str = Form(...),
    file: Optional[UploadFile] = File(None),
    url: Optional[str] = Form(None),
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase_client()
    logger.info(f"DEBUG session_id='{session_id}' user_id='{user['id']}'")

    await check_document_limit(user["id"], supabase)
    await check_session_owner(session_id, user["id"], supabase)  # ← NUEVO

    if not file and not url:
        raise HTTPException(status_code=400, detail="Debes proveer un archivo o una URL.")
    if file and url:
        raise HTTPException(status_code=400, detail="Provee solo un archivo O una URL, no ambos.")

    # --- Procesar URL ---
    if url:
        try:
            text = await extract_text_from_url(url)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"No se pudo scrapear la URL: {e}")

        doc_name = url[:100]
        doc_type = "url"

        from langchain.text_splitter import RecursiveCharacterTextSplitter
        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = splitter.split_text(text)

        doc_id = await asyncio.to_thread(
            partial(
                _save_and_embed,
                supabase, session_id, doc_name, doc_type, chunks,
                source_url=url,
                user_id=user["id"],
            )
        )
        log_event(user["id"], "upload", {"document_name": doc_name, "type": doc_type})
        return JSONResponse({
            "success": True,
            "document_id": str(doc_id),
            "name": doc_name,
            "type": doc_type,
            "chunks_created": len(chunks),
            "session_id": session_id,
        })

    # --- Procesar archivo ---
    filename  = file.filename or "archivo"
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Tipo de archivo no permitido: .{extension}. Permitidos: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    content = await file.read()

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Archivo demasiado grande. Máximo permitido: {settings.MAX_FILE_SIZE_MB}MB"
        )

    if not content:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")

    try:
        _, chunks, doc_type = await process_document(filename, content, extension)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.exception(f"Error procesando documento {filename}")
        raise HTTPException(status_code=500, detail=f"Error procesando el documento: {e}")

    doc_id = await asyncio.to_thread(
        partial(
            _save_and_embed,
            supabase, session_id, filename, doc_type, chunks,
            file_bytes=content,
            file_extension=extension,
            user_id=user["id"],
        )
    )
    log_event(user["id"], "upload", {"document_name": filename, "type": doc_type})

    return JSONResponse({
        "success": True,
        "document_id": str(doc_id),
        "name": filename,
        "type": doc_type,
        "chunks_created": len(chunks),
        "session_id": session_id,
    })


def _save_and_embed(
    supabase,
    session_id: str,
    name: str,
    doc_type: str,
    chunks: list,
    source_url: Optional[str] = None,
    file_bytes: Optional[bytes] = None,
    file_extension: Optional[str] = None,
    user_id: Optional[str] = None,
) -> str:
    storage_path = None
    doc_id       = None   # ← NUEVO: necesario para el cleanup

    # ── 1. Subir archivo a Storage ─────────────────────────────────────────
    if file_bytes and file_extension:
        try:
            storage_path = f"{session_id}/{uuid_lib.uuid4()}.{file_extension}"
            supabase.storage.from_("documents").upload(
                path=storage_path,
                file=file_bytes,
                file_options={"content-type": _get_mime_type(file_extension)},
            )
        except Exception as e:
            logger.warning(f"No se pudo subir a Storage: {e}")
            storage_path = None

    # ── 2. Insertar documento en DB ────────────────────────────────────────
    try:
        doc_result = supabase.table("documents").insert({
            "session_id":   session_id,
            "user_id":      user_id,
            "name":         name,
            "type":         doc_type,
            "source_url":   source_url,
            "storage_path": storage_path,
        }).execute()
        doc_id = doc_result.data[0]["id"]
    except Exception as e:
        # Si no se pudo insertar el documento, limpiar Storage y abortar
        if storage_path:
            try:
                supabase.storage.from_("documents").remove([storage_path])
            except Exception:
                pass
        raise HTTPException(status_code=500, detail=f"Error guardando el documento: {e}")

    # ── 3. Generar embeddings con retry por chunk ──────────────────────────
    logger.info(f"Generando embeddings para {len(chunks)} chunks de '{name}'...")

    embedding_rows = []
    failed_chunks  = []

    for i, chunk in enumerate(chunks):
        emb = _embed_with_retry(chunk, max_retries=3, wait_seconds=2.0)
        if emb is None:
            failed_chunks.append(i)
        else:
            embedding_rows.append({
                "document_id": str(doc_id),
                "session_id":  session_id,
                "user_id":     user_id,
                "content":     chunk,
                "embedding":   emb,
                "chunk_index": i,
            })

    # Si más de la mitad de los chunks fallaron, abortar con cleanup total
    if len(failed_chunks) > len(chunks) / 2:
        logger.error(
            f"Demasiados chunks fallidos ({len(failed_chunks)}/{len(chunks)}) "
            f"para '{name}'. Haciendo cleanup."
        )
        _cleanup_document(supabase, doc_id, storage_path)
        raise HTTPException(
            status_code=500,
            detail="Error generando embeddings. El documento no fue indexado. Intenta de nuevo."
        )

    if failed_chunks:
        logger.warning(
            f"'{name}': {len(failed_chunks)} chunks no pudieron indexarse "
            f"(índices: {failed_chunks}). El documento se guardó parcialmente."
        )

    # ── 4. Insertar embeddings en lotes ────────────────────────────────────
    if not embedding_rows:
        _cleanup_document(supabase, doc_id, storage_path)
        raise HTTPException(
            status_code=500,
            detail="No se pudo generar ningún embedding. El documento no fue indexado."
        )

    try:
        batch_size = 50
        for i in range(0, len(embedding_rows), batch_size):
            supabase.table("embeddings").insert(
                embedding_rows[i:i + batch_size]
            ).execute()
    except Exception as e:
        logger.error(f"Error insertando embeddings para '{name}': {e}. Haciendo cleanup.")
        _cleanup_document(supabase, doc_id, storage_path)
        raise HTTPException(
            status_code=500,
            detail="Error guardando los embeddings. El documento no fue indexado."
        )

    logger.info(f"Documento '{name}' indexado con {len(embedding_rows)} chunks.")
    return doc_id


def _embed_with_retry(text: str, max_retries: int = 3, wait_seconds: float = 2.0):
    """Intenta generar el embedding hasta max_retries veces. Retorna None si falla todo."""
    from services.embeddings import get_embedding
    for attempt in range(max_retries):
        try:
            return get_embedding(text)
        except Exception as e:
            if attempt < max_retries - 1:
                logger.warning(
                    f"Embedding falló (intento {attempt + 1}/{max_retries}): {e}. "
                    f"Reintentando en {wait_seconds}s..."
                )
                time.sleep(wait_seconds)
            else:
                logger.error(f"Embedding falló después de {max_retries} intentos: {e}")
    return None


def _cleanup_document(supabase, doc_id: str, storage_path: Optional[str]):
    """Elimina documento, sus embeddings y el archivo en Storage."""
    try:
        supabase.table("embeddings").delete().eq("document_id", str(doc_id)).execute()
    except Exception as e:
        logger.warning(f"Cleanup embeddings falló para doc {doc_id}: {e}")
    try:
        supabase.table("documents").delete().eq("id", str(doc_id)).execute()
    except Exception as e:
        logger.warning(f"Cleanup documento falló para doc {doc_id}: {e}")
    if storage_path:
        try:
            supabase.storage.from_("documents").remove([storage_path])
        except Exception as e:
            logger.warning(f"Cleanup Storage falló para {storage_path}: {e}")

def _get_mime_type(extension: str) -> str:
    mime_types = {
        "pdf":  "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "txt":  "text/plain",
        "md":   "text/markdown",
        "jpg":  "image/jpeg",
        "jpeg": "image/jpeg",
        "png":  "image/png",
        "gif":  "image/gif",
        "webp": "image/webp",
    }
    return mime_types.get(extension, "application/octet-stream")


@router.get("/{doc_id}/url")
async def get_document_url(
    doc_id:     str,
    session_id: str,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase_client()

    doc = (
        supabase.table("documents")
        .select("storage_path, name, source_url, type")
        .eq("id",         doc_id)
        .eq("session_id", session_id)
        .eq("user_id",    user["id"])
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