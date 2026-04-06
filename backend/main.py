from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from config import get_settings
from routers import chat, documents, sessions
from limiter import limiter 
import os
from starlette.middleware.base import BaseHTTPMiddleware
from dotenv import load_dotenv
from routers import chat, documents, sessions, conversations, admin  # agregar conversations

# 1. Carga las variables del .env al entorno del sistema
load_dotenv()
settings = get_settings()

os.environ["LANGCHAIN_TRACING_V2"] = settings.LANGCHAIN_TRACING_V2
os.environ["LANGCHAIN_API_KEY"] = settings.LANGCHAIN_API_KEY
os.environ["LANGCHAIN_PROJECT"] = settings.LANGCHAIN_PROJECT
os.environ["LANGCHAIN_ENDPOINT"] = settings.LANGCHAIN_ENDPOINT

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="RAG API",
    description="API de Retrieval-Augmented Generation con Gemini y Supabase",
    version="1.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Agrega esta clase antes de la definición de `app`
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"]  = "nosniff"
        response.headers["X-Frame-Options"]          = "DENY"
        response.headers["X-XSS-Protection"]         = "1; mode=block"
        response.headers["Referrer-Policy"]           = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"]        = "camera=(), microphone=(), geolocation=()"
        if settings.ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


# CORS — solo permite el origen del frontend
app.add_middleware(SecurityHeadersMiddleware)
origins = [o.strip() for o in os.getenv("FRONTEND_ORIGIN", "http://localhost:5173").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization"],
)

# Routers
app.include_router(documents.router, prefix="/documents", tags=["documents"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
app.include_router(conversations.router, prefix="/conversations", tags=["conversations"])
app.include_router(admin.router, tags=["admin"])

@app.get("/health")
async def health():
    checks = {"api": "ok", "environment": settings.ENVIRONMENT}

    # Verificar que Supabase responde realmente
    try:
        from db.supabase_client import get_supabase_client
        supabase = get_supabase_client()
        supabase.table("profiles").select("id").limit(1).execute()
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {str(e)}"

    status_code = 200 if all(v == "ok" or k == "environment" for k, v in checks.items()) else 503
    return JSONResponse(content=checks, status_code=status_code)


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Error interno del servidor: {str(exc)}"},
    )
