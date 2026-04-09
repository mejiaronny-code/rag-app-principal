import axios from 'axios'
import { supabase } from './supabase'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 300000,
})

// Interceptor de REQUEST — agrega el token JWT en cada request
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})

// ← NUEVO: Interceptor de RESPONSE — maneja 401 globalmente
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido — limpiar sesión y redirigir al login
      await supabase.auth.signOut()
      // Redirigir sin depender de React Router (funciona desde cualquier contexto)
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ── Documents ──────────────────────────────────────────────────────────────

export async function uploadFile(sessionId, file, onProgress) {
  const formData = new FormData()
  formData.append('session_id', sessionId)
  formData.append('file', file)

  const response = await api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    },
  })
  return response.data
}

export async function uploadUrl(sessionId, url) {
  const formData = new FormData()
  formData.append('session_id', sessionId)
  formData.append('url', url)

  const response = await api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

// ── Chat ───────────────────────────────────────────────────────────────────

export async function sendChat(sessionId, query, chatHistory, documentIds = [], conversationId = null) {
  const response = await api.post('/chat', {
    query,
    session_id: sessionId,
    chat_history: chatHistory,
    document_ids: documentIds,
    conversation_id: conversationId,
  })
  return response.data
}

// ── Sessions ───────────────────────────────────────────────────────────────

export async function getSessionDocuments(sessionId) {
  const response = await api.get(`/sessions/${sessionId}/documents`)
  return response.data
}

export async function deleteDocument(sessionId, docId) {
  const response = await api.delete(`/sessions/${sessionId}/documents/${docId}`)
  return response.data
}

export async function getDocumentUrl(docId, sessionId) {
  const response = await api.get(`/documents/${docId}/url`, {
    params: { session_id: sessionId },
  })
  return response.data
}

export async function getChatHistory(sessionId) {
  const response = await api.get(`/sessions/${sessionId}/history`)
  return response.data
}

export async function deleteSession(sessionId) {
  const response = await api.delete(`/sessions/${sessionId}`)
  return response.data
}

// ── Conversations ──────────────────────────────────────────────────────────

export async function getConversations() {
  const response = await api.get('/conversations')
  return response.data
}

export async function createConversation(sessionId, title = 'Nueva conversación') {
  const response = await api.post('/conversations', {
    session_id: sessionId,
    title,
  })
  return response.data
}

export async function updateConversationTitle(conversationId, title) {
  const response = await api.patch(`/conversations/${conversationId}`, { title })
  return response.data
}

export async function deleteConversation(conversationId) {
  const response = await api.delete(`/conversations/${conversationId}`)
  return response.data
}

export async function getConversationMessages(conversationId) {
  const response = await api.get(`/conversations/${conversationId}/messages`)
  return response.data
}

export default api