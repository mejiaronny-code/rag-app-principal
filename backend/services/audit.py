import logging
from typing import Any, Dict, Optional

from db.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


def log_event(user_id: str, event: str, metadata: Optional[Dict[str, Any]] = None) -> None:
    """Registra un evento de auditoría en `audit_logs`."""
    try:
        supabase = get_supabase_client()
        supabase.table("audit_logs").insert(
            {
                "user_id": user_id,
                "event": event,
                "metadata": metadata or {},
            }
        ).execute()
    except Exception as e:
        logger.warning(f"No se pudo registrar audit log: {e}")

