from groq import Groq
from config import get_settings
from typing import List
import logging
from langsmith import traceable

logger = logging.getLogger(__name__)

MULTIQUERY_PROMPT = """Eres un asistente experto en búsqueda de información. 
Dado el siguiente query de búsqueda, genera exactamente 3 variantes alternativas 
que busquen información relacionada desde diferentes ángulos.

Query original: {query}

Genera 3 variantes, una por línea, sin numeración ni bullet points:"""

@traceable(name="generate_query_variants")
def generate_query_variants(query: str) -> List[str]:
    try:
        settings = get_settings()
        client = Groq(api_key=settings.GROQ_API_KEY)
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": MULTIQUERY_PROMPT.format(query=query)}],
            max_tokens=300,
            temperature=0.7,
        )
        raw = response.choices[0].message.content.strip()
        variants = [l.strip() for l in raw.splitlines() if l.strip()][:3]
        while len(variants) < 3:
            variants.append(query)
        return variants
    except Exception as e:
        logger.warning(f"Error generando variantes: {e}")
        return [query, query, query]