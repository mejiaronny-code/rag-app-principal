from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional
import os

class Settings(BaseSettings):
    # Google AI
    GOOGLE_API_KEY: str
    OPENAI_API_KEY: str
    GROQ_API_KEY: str

    #LANGCHAIN
    LANGCHAIN_TRACING_V2: str = "false"
    LANGCHAIN_API_KEY: str = ""
    LANGCHAIN_PROJECT: str = "rag-app"
    LANGCHAIN_ENDPOINT: str = "https://api.smith.langchain.com"

    # Supabase
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str

    # App
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    MAX_FILE_SIZE_MB: int = 20
    ENVIRONMENT: str = "development"

    # Rate limiting
    RATE_LIMIT_UPLOAD: str = "10/minute"
    RATE_LIMIT_CHAT: str = "30/minute"

    # ← NUEVO: Brevo
    BREVO_API_KEY:        str
    BREVO_SENDER_EMAIL:   str
    APP_NAME:             str = "Papyrus"

    MAX_DOCS_PER_USER: int = int(os.getenv("MAX_DOCS_PER_USER", "20"))

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
