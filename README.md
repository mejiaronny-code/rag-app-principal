# RAG App — Chat con tus documentos

Aplicación completa de **Retrieval-Augmented Generation (RAG)** que te permite subir documentos (PDF, DOCX, TXT, imágenes escaneadas, URLs) y hacerles preguntas en lenguaje natural. Impulsada por **Gemini 1.5 Flash**, **pgvector en Supabase** y Multi-Query Retrieval para respuestas precisas.

---

## ✨ Características principales

- **Múltiples formatos**: PDF (con OCR si está escaneado), DOCX, TXT, Markdown, imágenes (JPG/PNG), URLs
- **Multi-Query Retrieval**: genera 3 variantes de cada pregunta para mayor precisión en la búsqueda
- **Embeddings semánticos**: `text-embedding-004` (768 dims) via Google AI Studio
- **Chat con historial**: contexto de conversación incluido en cada respuesta
- **Panel de fuentes**: muestra los fragmentos usados con porcentaje de similitud
- **Sesiones aisladas**: cada sesión tiene sus propios documentos y chat
- **Rate limiting** y validación de tipos de archivo por magic bytes
- **OCR integrado**: pytesseract para imágenes y PDFs escaneados
- **Diseño oscuro** inspirado en Claude.ai

---

## 📋 Requisitos previos

- Python 3.11+
- Node.js 18+
- Cuenta gratuita en [Google AI Studio](https://aistudio.google.com)
- Cuenta gratuita en [Supabase](https://supabase.com)
- `tesseract-ocr` instalado en el sistema (para OCR)
- `poppler-utils` instalado en el sistema (para pdf2image)

---

## 🔧 Instalación de dependencias del sistema

### macOS
```bash
brew install tesseract poppler
```

### Ubuntu / Debian
```bash
sudo apt-get update
sudo apt-get install -y tesseract-ocr tesseract-ocr-spa poppler-utils
```

### Windows
- Tesseract: https://github.com/UB-Mannheim/tesseract/wiki
- Poppler: https://github.com/oschwartz10612/poppler-windows/releases

---

## 🗄️ Configurar Supabase

### 1. Crear proyecto

1. Ve a [supabase.com](https://supabase.com) → **New Project**
2. Elige un nombre, región y contraseña para la base de datos
3. Espera 1-2 minutos a que el proyecto esté listo

### 2. Crear el esquema

1. En el dashboard de Supabase: **SQL Editor** → **New Query**
2. Copia y pega **todo** el contenido de `supabase_schema.sql`
3. Haz clic en **Run** (▶)
4. Verifica que las tablas `documents`, `embeddings` y `chat_history` aparezcan en **Table Editor**
5. Verifica que la función `match_embeddings` aparezca en **Database → Functions**

### 3. Obtener las credenciales

1. Ve a **Settings** → **API**
2. Copia:
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** (¡mantenla secreta!) → `SUPABASE_SERVICE_KEY`

> ⚠️ Usa `service_role`, no `anon`. La service_role bypasea RLS y permite al backend gestionar todas las sesiones.

---

## 🤖 Obtener API Key de Google AI Studio

1. Ve a [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Crea un proyecto o selecciona uno existente
3. Haz clic en **Create API Key**
4. Copia la key → `GOOGLE_API_KEY`

> El plan gratuito incluye cuota suficiente para desarrollo y uso personal.

---

## 🚀 Correr en local

### 1. Clonar / descomprimir el proyecto

```bash
cd rag-app
```

### 2. Configurar el backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Copiar y editar variables de entorno
cp .env.example .env
```

Edita `backend/.env`:
```env
GOOGLE_API_KEY=tu_google_api_key
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_KEY=tu_service_role_key
FRONTEND_ORIGIN=http://localhost:5173
```

### 3. Iniciar el backend

```bash
# Desde backend/ con el venv activo
uvicorn main:app --reload --port 8000
```

El backend estará en: `http://localhost:8000`  
Documentación automática: `http://localhost:8000/docs`

### 4. Configurar el frontend

```bash
cd ../frontend

# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env
```

`frontend/.env` (opcional, el proxy de Vite ya apunta al backend):
```env
VITE_API_URL=http://localhost:8000
```

### 5. Iniciar el frontend

```bash
npm run dev
```

La app estará en: `http://localhost:5173`

---

## 📖 Uso básico

1. Abre `http://localhost:5173`
2. En el panel izquierdo, **arrastra un PDF** o haz clic para seleccionarlo
3. Espera a que se indexe (verás el progreso)
4. Escribe una pregunta en el chat y pulsa **Enter**
5. El asistente responderá en español citando los fragmentos relevantes
6. Expande las **fuentes** bajo cada respuesta para ver los fragmentos usados

---

## 🏗️ Arquitectura

```
Usuario → Frontend (React/Vite)
                ↓
         FastAPI Backend
         ┌─────────────────────────────────┐
         │  /documents/upload              │
         │    → Extrae texto (PDF/OCR/URL) │
         │    → Chunking (LangChain)       │
         │    → Embeddings (Gemini)        │
         │    → Guarda en Supabase         │
         │                                 │
         │  /chat                          │
         │    → Multi-Query (Gemini)       │
         │    → pgvector similarity search │
         │    → Build prompt + contexto   │
         │    → Gemini 1.5 Flash          │
         │    → Retorna respuesta+fuentes  │
         └─────────────────────────────────┘
                ↓
          Supabase (PostgreSQL + pgvector)
          ├── documents
          ├── embeddings (vector 768d)
          └── chat_history
```

---

## 🌐 Deploy en producción

### Opción A: Render (recomendado para backend Python)

1. Conecta tu repositorio en [render.com](https://render.com)
2. **New Web Service** → selecciona el repo
3. Configuración:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Agrega las variables de entorno en el dashboard de Render
5. Para OCR en Render, añade en **Build Command**:
   ```
   apt-get install -y tesseract-ocr poppler-utils && pip install -r requirements.txt
   ```

### Opción B: Railway

1. Instala Railway CLI: `npm i -g @railway/cli`
2. `railway login && railway init`
3. Desde `backend/`: `railway up`
4. Configura las variables en el dashboard de Railway

### Frontend: Vercel o Netlify

```bash
cd frontend
npm run build
# Sube la carpeta dist/ a Vercel/Netlify
```

Recuerda actualizar `FRONTEND_ORIGIN` en el backend con la URL de producción del frontend.

---

## 📁 Estructura del proyecto

```
rag-app/
├── backend/
│   ├── main.py              # FastAPI app + CORS + rate limiting
│   ├── config.py            # Pydantic settings
│   ├── routers/
│   │   ├── chat.py          # Endpoint /chat con RAG completo
│   │   ├── documents.py     # Upload e indexación de documentos
│   │   └── sessions.py      # CRUD de sesiones
│   ├── services/
│   │   ├── embeddings.py    # Embeddings con text-embedding-004
│   │   ├── retriever.py     # Multi-query + búsqueda vectorial
│   │   ├── ingestion.py     # Extracción de texto y chunking
│   │   ├── ocr.py           # pytesseract + pdf2image
│   │   └── multiquery.py    # Generación de variantes del query
│   ├── db/
│   │   └── supabase_client.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx       # Panel lateral con documentos
│   │   │   ├── UploadZone.jsx    # Drag & drop + URL input
│   │   │   ├── ChatMessage.jsx   # Burbuja de chat con Markdown
│   │   │   ├── ChatInput.jsx     # Textarea con auto-resize
│   │   │   ├── SourcesList.jsx   # Tarjetas de fuentes colapsables
│   │   │   ├── TypingIndicator.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   └── DocIcon.jsx
│   │   ├── hooks/
│   │   │   ├── useSession.js     # Gestión de session_id (sessionStorage)
│   │   │   ├── useDocuments.js   # Upload, lista y borrado
│   │   │   └── useChat.js        # Mensajes y envío al backend
│   │   ├── api.js                # Cliente axios
│   │   ├── App.jsx               # Componente raíz
│   │   └── index.css             # Tailwind + prose-rag styles
│   └── package.json
├── supabase_schema.sql       # Tablas + pgvector + RLS + función RPC
└── README.md
```

---

## 🔐 Seguridad

- **CORS**: solo el origen del frontend definido en `FRONTEND_ORIGIN`
- **Validación de archivos**: magic bytes (no solo extensión)
- **Tamaño máximo**: 20MB por archivo
- **Rate limiting**: 10 uploads/min, 30 chats/min por IP
- **Sanitización de URLs**: no se ejecuta JS, sin redirects maliciosos
- **Claves API**: solo en variables de entorno, nunca en el código
- **Supabase RLS**: el backend usa service_role que gestiona todo de forma segura

---

## 🐛 Solución de problemas

**Error: `tesseract not found`**  
→ Instala tesseract-ocr para tu sistema operativo (ver arriba)

**Error: `poppler not found`**  
→ Instala poppler-utils para tu sistema operativo

**Error: `GOOGLE_API_KEY invalid`**  
→ Verifica que copiaste la key correctamente desde AI Studio

**Error en búsqueda vectorial: `function match_embeddings does not exist`**  
→ Ejecuta el SQL completo en Supabase SQL Editor

**Frontend no conecta con el backend**  
→ Verifica que el backend está corriendo en puerto 8000  
→ Verifica `VITE_API_URL` en `frontend/.env`

---

## 📝 Licencia

MIT — úsalo libremente.
