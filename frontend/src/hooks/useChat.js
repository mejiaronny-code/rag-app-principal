import { useState, useCallback, useEffect } from 'react'
import { sendChat } from '../api'

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
      const msg = e.response?.data?.detail || 'Error obteniendo respuesta.'
      setError(msg)
      setMessages(prev => prev.filter(m => m.id !== userMessage.id))
      throw e
    } finally {
      setLoading(false)
    }
  }, [sessionId, conversationId, messages, loading])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return { messages, loading, error, clearMessages, sendMessage }
}