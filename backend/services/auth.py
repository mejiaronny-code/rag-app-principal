from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from db.supabase_client import get_supabase_client   # ← usa singleton, no crea cliente nuevo
from config import get_settings
import logging

logger   = logging.getLogger(__name__)
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> dict:
    settings = get_settings()
    token    = credentials.credentials

    try:
        # Validar JWT con Supabase Auth
        supabase = get_supabase_client()
        user     = supabase.auth.get_user(token)

        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Token inválido o expirado.")

        user_id = str(user.user.id)

        # ← NUEVO: verificar que el perfil existe y está activo
        profile = (
            supabase.table("profiles")
            .select("active, role")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )

        if not profile.data:
            raise HTTPException(status_code=403, detail="Perfil no encontrado.")

        if not profile.data.get("active", False):
            raise HTTPException(
                status_code=403,
                detail="Tu cuenta está pendiente de aprobación por un administrador.",
            )

        return {
            "id":    user_id,
            "email": user.user.email,
            "role":  profile.data.get("role", "user"),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Error validando token: {e}")
        raise HTTPException(status_code=401, detail="No autorizado.")