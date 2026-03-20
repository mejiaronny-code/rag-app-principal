from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

models = client.models.list()

print("=== MODELOS DISPONIBLES EN GROQ ===")
for model in models.data:
    print(model.id)