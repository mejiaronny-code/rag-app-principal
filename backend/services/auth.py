from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client
from config import get_settings
import logging

logger = logging.getLogger(__name__)
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> dict:
    settings = get_settings()
    token = credentials.credentials

    try:
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        user = client.auth.get_user(token)
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Token inválido o expirado.")
        return {"id": str(user.user.id), "email": user.user.email}
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Error validando token: {e}")
        raise HTTPException(status_code=401, detail="No autorizado.")