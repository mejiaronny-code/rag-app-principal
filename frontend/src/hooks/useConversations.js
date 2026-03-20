import { useState, useCallback, useEffect } from 'react'
import {
  getConversations,
  createConversation,
  updateConversationTitle,
  deleteConversation,
  getConversationMessages,
} from '../api'

export function useConversations(sessionId) {
  const [conversations, setConversations] = useState([])
  const [activeConversationId, setActiveConversationId] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!sessionId) return
    fetchConversations()
  }, [sessionId])

  const fetchConversations = useCallback(async () => {
    try {
      const data = await getConversations()
      setConversations(data.conversations || [])
      // Activar la más reciente automáticamente
      if (data.conversations?.length > 0 && !activeConversationId) {
        setActiveConversationId(data.conversations[0].id)
      }
    } catch (e) {
      console.error('Error cargando conversaciones:', e)
    }
  }, [activeConversationId])

  const startNewConversation = useCallback(async () => {
    if (!sessionId) return null
    setLoading(true)
    try {
      const conv = await createConversation(sessionId, 'Nueva conversación')
      setConversations(prev => [conv, ...prev])
      setActiveConversationId(conv.id)
      return conv
    } catch (e) {
      console.error('Error creando conversación:', e)
      return null
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  const renameConversation = useCallback(async (conversationId, title) => {
    try {
      await updateConversationTitle(conversationId, title)
      setConversations(prev =>
        prev.map(c => c.id === conversationId ? { ...c, title } : c)
      )
    } catch (e) {
      console.error('Error renombrando conversación:', e)
    }
  }, [])

  const removeConversation = useCallback(async (conversationId) => {
    try {
      await deleteConversation(conversationId)
      setConversations(prev => prev.filter(c => c.id !== conversationId))
      // Si era la activa, activar la siguiente
      if (activeConversationId === conversationId) {
        const remaining = conversations.filter(c => c.id !== conversationId)
        setActiveConversationId(remaining[0]?.id ?? null)
      }
    } catch (e) {
      console.error('Error eliminando conversación:', e)
    }
  }, [activeConversationId, conversations])

  const loadConversationMessages = useCallback(async (conversationId) => {
    try {
      const data = await getConversationMessages(conversationId)
      return (data.messages || []).map(item => ({
        id: item.id,
        role: item.role,
        content: item.content,
        sources: item.sources
          ? (typeof item.sources === 'string' ? JSON.parse(item.sources) : item.sources)
          : [],
        timestamp: item.created_at,
      }))
    } catch (e) {
      console.error('Error cargando mensajes:', e)
      return []
    }
  }, [])

  // Auto-generar título basado en el primer mensaje
  const autoTitle = useCallback(async (conversationId, firstMessage) => {
    const title = firstMessage.length > 40
      ? firstMessage.slice(0, 40) + '...'
      : firstMessage
    await renameConversation(conversationId, title)
  }, [renameConversation])

  return {
    conversations,
    activeConversationId,
    setActiveConversationId,
    loading,
    fetchConversations,
    startNewConversation,
    renameConversation,
    removeConversation,
    loadConversationMessages,
    autoTitle,
  }
}