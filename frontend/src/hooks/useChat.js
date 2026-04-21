import { useState, useCallback, useEffect, useRef } from 'react'
import { sendChat } from '../api'

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
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  const currentConvIdRef = useRef(conversationId)
  const isSendingRef     = useRef(false)

  useEffect(() => {
    currentConvIdRef.current = conversationId
  }, [conversationId])

  useEffect(() => {
    if (!conversationId || !loadConversationMessages) {
      setMessages([])
      return
    }
    if (isSendingRef.current) return

    let cancelled = false
    loadConversationMessages(conversationId).then(msgs => {
      if (!cancelled && !isSendingRef.current) {
        setMessages(msgs ?? [])
      }
    })
    return () => { cancelled = true }
  }, [conversationId])

  const sendMessage = useCallback(async (query, documentIds = [], overrideConvId = null) => {
    if (!query.trim() || loading) return

    isSendingRef.current = true
    const effectiveConvId = overrideConvId || conversationId

    const userMessage = {
      id:        `user-${Date.now()}`,
      role:      'user',
      content:   query,
      sources:   [],
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setLoading(true)
    setError(null)

    const apiHistory = messages.map(m => ({ role: m.role, content: m.content }))

    try {
      const data = await sendChat(sessionId, query, apiHistory, documentIds, effectiveConvId)

      if (effectiveConvId !== currentConvIdRef.current) return

      const assistantMessage = {
        id:        `assistant-${Date.now()}`,
        role:      'assistant',
        content:   data.answer,
        sources:   data.sources || [],
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMessage])
      return assistantMessage
    } catch (e) {
      if (effectiveConvId !== currentConvIdRef.current) return
      const friendly = getFriendlyError(e)
      setError(friendly)
      setMessages(prev => prev.filter(m => m.id !== userMessage.id))
    } finally {
      setLoading(false)
      isSendingRef.current = false
    }
  }, [sessionId, conversationId, messages, loading])

  const clearMessages = useCallback(() => setMessages([]), [])

  return { messages, loading, error, clearMessages, sendMessage }
}