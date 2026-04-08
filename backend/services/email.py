# backend/services/email.py
import httpx
import logging
from config import get_settings

logger = logging.getLogger(__name__)

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


def send_approval_email(to_email: str, first_name: str) -> bool:
    """
    Envía email de aprobación de cuenta via Brevo.
    Retorna True si se envió, False si falló (no lanza excepción
    para no romper el flujo de activación).
    """
    settings = get_settings()

    if not settings.BREVO_API_KEY:
        logger.warning("BREVO_API_KEY no configurada — email de aprobación no enviado.")
        return False

    payload = {
        "sender": {
            "name":  settings.APP_NAME,
            "email": settings.BREVO_SENDER_EMAIL,
        },
        "to": [{"email": to_email, "name": first_name}],
        "subject": f"¡Tu cuenta en {settings.APP_NAME} fue aprobada! 🎉",
        "htmlContent": f"""
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0f0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#111a12;border:1px solid #1f3324;border-radius:16px;overflow:hidden;">

          <!-- Header verde -->
          <tr>
            <td style="background:linear-gradient(135deg,#0d1f14,#1a3a20);padding:32px;text-align:center;border-bottom:1px solid #1f3324;">
              <div style="display:inline-block;width:56px;height:56px;background:rgba(34,201,122,0.15);border:1.5px solid #22c97a;border-radius:14px;line-height:56px;font-size:26px;margin-bottom:16px;">✨</div>
              <h1 style="margin:0;color:#22c97a;font-size:22px;font-weight:700;">{settings.APP_NAME}</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 12px;color:#f0fdf4;font-size:18px;font-weight:600;">
                ¡Hola, {first_name}! 👋
              </h2>
              <p style="margin:0 0 20px;color:#9ca3af;font-size:15px;line-height:1.6;">
                Tu cuenta ha sido <strong style="color:#22c97a;">aprobada</strong> felicidades.
                Ya puedes iniciar sesión y empezar a chatear con tus documentos.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:28px 0;">
                <tr>
                  <td style="background:linear-gradient(135deg,#16a34a,#22c97a);border-radius:10px;padding:14px 32px;text-align:center;">
                    <a href="{settings.FRONTEND_ORIGIN}"
                       style="color:#fff;text-decoration:none;font-weight:600;font-size:15px;">
                      Iniciar sesión →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
                Si no solicitaste esta cuenta, puedes ignorar este correo.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #1f3324;text-align:center;">
              <p style="margin:0;color:#4b5563;font-size:12px;">{settings.APP_NAME} · Todos los derechos reservados</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        """,
    }

    try:
        response = httpx.post(
            BREVO_API_URL,
            json=payload,
            headers={
                "api-key":     settings.BREVO_API_KEY.strip(),
                "accept": "application/json", # Agrega esta línea por si acaso
                "content-type": "application/json",
            },
            timeout=10.0,
        )
        response.raise_for_status()
        logger.info(f"Email de aprobación enviado a {to_email}")
        return True
    except Exception as e:
        logger.warning(f"No se pudo enviar email de aprobación a {to_email}: {e}")
        return False