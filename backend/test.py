import httpx

# REEMPLAZA ESTOS 3 DATOS MANUALMENTE AQUÍ MISMO:
API_KEY = "" 
SENDER_EMAIL = "micorreo@gmail.com"
TEST_RECEIVER = "micorreo+test@gmail.com"

url = "https://api.brevo.com/v3/smtp/email"

headers = {
    "api-key": API_KEY.strip(),
    "content-type": "application/json",
    "accept": "application/json"
}

payload = {
    "sender": {"name": "Test Papyrus", "email": SENDER_EMAIL},
    "to": [{"email": TEST_RECEIVER}],
    "subject": "Prueba de Choque",
    "htmlContent": "<html><body><h1>Si lees esto, el código no era el problema</h1></body></html>"
}

with httpx.Client() as client:
    print("--- ENVIANDO PETICIÓN ---")
    response = client.post(url, json=payload, headers=headers)
    
    print(f"STATUS CODE: {response.status_code}")
    print("--- RESPUESTA DETALLADA DE BREVO ---")
    print(response.text) # ESTO ES LO QUE NECESITAMOS VER