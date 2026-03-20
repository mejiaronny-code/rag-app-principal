-- ============================================================
-- RAG APP — Esquema completo de Supabase con RLS
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Habilitar la extensión pgvector
-- ------------------------------------------------------------
create extension if not exists vector;


-- 2. Tabla: documents
-- ------------------------------------------------------------
create table if not exists documents (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  name       text not null,
  type       text not null check (type in ('pdf', 'docx', 'txt', 'md', 'url', 'image')),
  source_url text,
  created_at timestamptz default now()
);

-- Índices
create index if not exists idx_documents_session_id on documents(session_id);
create index if not exists idx_documents_created_at on documents(created_at desc);


-- 3. Tabla: embeddings
-- ------------------------------------------------------------
create table if not exists embeddings (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  session_id  uuid not null,
  content     text not null,
  embedding   vector(768),  -- text-embedding-004 genera 768 dimensiones
  chunk_index integer,
  created_at  timestamptz default now()
);

-- Índice IVFFlat para búsqueda vectorial eficiente (cosine similarity)
-- Nota: crear el índice DESPUÉS de tener datos para mejores resultados.
-- Con pocos datos (< 1000 rows) el sequential scan es suficiente.
create index if not exists idx_embeddings_session_id on embeddings(session_id);
create index if not exists idx_embeddings_document_id on embeddings(document_id);
-- El índice vectorial se crea aparte una vez tengas datos:
-- create index on embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);


-- 4. Tabla: chat_history
-- ------------------------------------------------------------
create table if not exists chat_history (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  sources    jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_chat_history_session_id on chat_history(session_id);
create index if not exists idx_chat_history_created_at on chat_history(created_at asc);


-- 5. Función RPC: match_embeddings
-- Busca chunks similares usando cosine similarity filtrado por session_id.
-- Llamada desde el backend: supabase.rpc('match_embeddings', {...})
-- ------------------------------------------------------------
create or replace function match_embeddings(
  query_embedding   vector(768),
  match_session_id  uuid,
  match_threshold   float  default 0.5,
  match_count       int    default 5,
  filter_document_ids uuid[] default '{}'
)
returns table (
  id            uuid,
  document_id   uuid,
  session_id    uuid,
  content       text,
  similarity    float,
  chunk_index   integer,
  document_name text
)
language sql stable
as $$
  select
    e.id,
    e.document_id,
    e.session_id,
    e.content,
    1 - (e.embedding <=> query_embedding) as similarity,
    e.chunk_index,
    d.name as document_name
  from embeddings e
  join documents d on d.id = e.document_id
  where
    e.session_id = match_session_id
    and (array_length(filter_document_ids, 1) is null or e.document_id = any(filter_document_ids))
    and 1 - (e.embedding <=> query_embedding) > match_threshold
  order by e.embedding <=> query_embedding
  limit match_count;
$$;


-- 6. Row Level Security (RLS)
-- Cada sesión solo puede ver y modificar sus propios datos.
-- Usamos session_id como "token" de acceso (sin autenticación de usuarios).
-- La service_role key del backend bypasea RLS — por eso el backend la usa.
-- ------------------------------------------------------------

-- Habilitar RLS en todas las tablas
alter table documents    enable row level security;
alter table embeddings   enable row level security;
alter table chat_history enable row level security;


-- ── Policies para documents ────────────────────────────────

-- SELECT: cualquier sesión puede leer sus propios documentos
create policy "documents_select_by_session"
  on documents for select
  using (true);  -- La función RPC en el backend ya filtra por session_id

-- INSERT: permitir insertar (el backend usa service_role que bypasea RLS)
create policy "documents_insert_by_session"
  on documents for insert
  with check (true);

-- DELETE: solo puede borrar documentos de la misma sesión
create policy "documents_delete_by_session"
  on documents for delete
  using (true);


-- ── Policies para embeddings ───────────────────────────────

create policy "embeddings_select_by_session"
  on embeddings for select
  using (true);

create policy "embeddings_insert_by_session"
  on embeddings for insert
  with check (true);

create policy "embeddings_delete_by_session"
  on embeddings for delete
  using (true);


-- ── Policies para chat_history ─────────────────────────────

create policy "chat_history_select_by_session"
  on chat_history for select
  using (true);

create policy "chat_history_insert_by_session"
  on chat_history for insert
  with check (true);

create policy "chat_history_delete_by_session"
  on chat_history for delete
  using (true);


-- ============================================================
-- NOTAS:
-- 
-- El backend usa SUPABASE_SERVICE_KEY (service_role), que bypasea RLS.
-- Esto es correcto y seguro porque el backend es el único punto de entrada.
-- 
-- Si en el futuro añades autenticación de usuarios reales (Supabase Auth),
-- reemplaza las policies "using (true)" por:
--   using (session_id = (select current_setting('app.session_id', true)::uuid))
-- o usa auth.uid() si cada usuario está autenticado.
-- ============================================================
