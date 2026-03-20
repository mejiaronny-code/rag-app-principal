import { useState, useCallback, useEffect } from 'react'
import { sendChat } from '../api'

// Mapa de errores HTTP → mensajes amigables
const ERROR_MESSAGES = {
  401: "Tu sesión expiró. Por favor vuelve a iniciar sesión.",
  403: "No tienes permiso para realizar esta acción.",
  413: "El mensaje es demasiado largo. Intenta con uno más corto.",
  429: "Límite alcanzado. Espera un momento antes de enviar otro mensaje.",
  503: "El servicio de IA está temporalmente no disponible. Intenta en unos minutos.",
  500: "Error interno del servidor. Intenta de nuevo más tarde.",
}

const getFriendlyError = (e) => {
  if (!navigator.onLine) return "Sin conexión a internet. Revisa tu red e intenta de nuevo."
  
  const status = e.response?.status
  const detail = e.response?.data?.detail

  if (status && ERROR_MESSAGES[status]) return ERROR_MESSAGES[status]
  if (detail) return detail
  return "Algo salió mal. Intenta de nuevo o contacta soporte si el problema persiste."
}

export function useChat(sessionId, conversationId, loadConversationMessages) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!conversationId || !loadConversationMessages) {
      setMessages([])
      return
    }
    loadConversationMessages(conversationId).then(setMessages)
  }, [conversationId])

  const sendMessage = useCallback(async (query, documentIds = [], overrideConvId = null) => {
    if (!query.trim() || loading) return

    const effectiveConvId = overrideConvId || conversationId

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      sources: [],
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setLoading(true)
    setError(null)

    const apiHistory = messages.map(m => ({ role: m.role, content: m.content }))

    try {
      const data = await sendChat(sessionId, query, apiHistory, documentIds, effectiveConvId)
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        sources: data.sources || [],
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMessage])
      return assistantMessage
    } catch (e) {
      // ← ÚNICO CAMBIO: reemplaza las 3 líneas del catch anterior
      const friendly = getFriendlyError(e)
      setError(friendly)
      setMessages(prev => prev.filter(m => m.id !== userMessage.id))
      // No relanzamos el error — el componente lo muestra via `error`
    } finally {
      setLoading(false)
    }
  }, [sessionId, conversationId, messages, loading])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return { messages, loading, error, clearMessages, sendMessage }
}