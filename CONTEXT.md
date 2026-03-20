# RAG App — Contexto del proyecto

## Stack tecnológico
- **Backend**: Python 3.11 + FastAPI + uvicorn
- **Frontend**: React 18 + Vite + Tailwind CSS
- **LLM Chat**: Groq — modelo `llama-3.3-70b-versatile`
- **Embeddings**: Google Gemini — modelo `gemini-embedding-001` (3072 dims, API v1beta, llamada REST directa con httpx sin SDK)
- **Base de datos**: Supabase (PostgreSQL + pgvector)
- **Auth**: Supabase Auth (email + password, confirm email DESACTIVADO en dev)
- **Storage**: Supabase Storage — bucket `documents` (público)

## Estructura de archivos
```
rag-app/
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── routers/
│   │   ├── chat.py
│   │   ├── documents.py
│   │   ├── sessions.py
│   │   └── conversations.py
│   ├── services/
│   │   ├── embeddings.py      # REST directo a Google, NO usa SDK
│   │   ├── retriever.py
│   │   ├── ingestion.py
│   │   ├── ocr.py
│   │   ├── multiquery.py
│   │   ├── auth.py            # Valida JWT de Supabase
│   │   └── audit.py
│   └── db/
│       └── supabase_client.py
└── frontend/
    └── src/
        ├── App.jsx
        ├── api.js
        ├── supabase.js
        ├── context/
        │   └── AuthContext.jsx
        ├── hooks/
        │   ├── useSession.js          # sessionId = user.id
        │   ├── useDocuments.js
        │   ├── useChat.js
        │   ├── useConversations.js
        │   ├── useDocumentSelection.js
        │   └── useTheme.js
        ├── components/
        │   ├── Sidebar.jsx            # Drawer en móvil
        │   ├── ConversationList.jsx
        │   ├── ChatMessage.jsx
        │   ├── ChatInput.jsx
        │   ├── SourcesList.jsx
        │   ├── UploadZone.jsx
        │   ├── TypingIndicator.jsx
        │   ├── EmptyState.jsx
        │   └── DocIcon.jsx
        └── pages/
            └── LoginPage.jsx
```

## Decisiones importantes
- `sessionId = user.id` — cada usuario tiene una sola sesión permanente
- Embeddings usan llamada REST directa a `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent` porque las SDKs de Google no funcionaban correctamente
- El modelo de chat es Groq porque Google tenía `limit: 0` en el plan gratuito
- `conversation_id` se pasa en cada mensaje para ligar el historial a una conversación específica
- Dark/light mode con CSS variables en `index.css` y `data-theme` en el `<html>`

## Esquema de Supabase
Tablas: `documents`, `embeddings`, `chat_history`, `conversations`, `profiles`, `audit_logs`

### Columnas clave
- `embeddings.embedding` → `vector(3072)`
- `documents.user_id` → `uuid references auth.users(id)`
- `chat_history.conversation_id` → `uuid references conversations(id)`
- `profiles` → `id, first_name, last_name`

### Función RPC
`match_embeddings(query_embedding, match_session_id, match_threshold, match_count, filter_document_ids)`

## Variables de entorno
### Backend (.env)
- `GOOGLE_API_KEY` — Google AI Studio
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY` — service_role key
- `GROQ_API_KEY`
- `FRONTEND_ORIGIN=http://localhost:5173`

### Frontend (.env)
- `VITE_API_URL=http://localhost:8000`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Pendiente por implementar
1. Seguridad: vincular session_id a user_id en el backend
2. Seguridad: lista negra de IPs para URLs (anti-SSRF)
3. Seguridad: Supabase Storage privado con URLs firmadas
4. Límite de documentos por usuario
5. Limpiar mensajes al hacer logout
6. Vista de documentos mejorada
7. Deploy en Render/Railway + Vercel

## Cómo correr en local
```bash
# Backend
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm run dev
```

## Notas de bugs resueltos
- `gemini-embedding-001` requiere llamada REST directa a v1beta, no SDK
- `useSession` no puede usar `useState(() => userId)` porque userId llega undefined en primer render
- Hooks deben estar todos ANTES de cualquier return condicional en React
- CORS debe incluir `PATCH` además de GET, POST, DELETE
- `sendChat` en api.js necesita `conversationId` como parámetro explícito
```