import { useEffect, useRef, useState } from 'react'
import { useSession } from './hooks/useSession'
import { useDocuments } from './hooks/useDocuments'
import { useChat } from './hooks/useChat'
import { useDocumentSelection } from './hooks/useDocumentSelection'
import { Sidebar } from './components/Sidebar'
import { ChatMessage } from './components/ChatMessage'
import { ChatInput } from './components/ChatInput'
import { TypingIndicator } from './components/TypingIndicator'
import { EmptyState } from './components/EmptyState'
import { useTheme } from './hooks/useTheme'
import { useAuth } from './context/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { LogOut, Menu, Shield } from 'lucide-react'
import { useConversations } from './hooks/useConversations'
import { AdminPage } from './pages/AdminPage'

export default function App() {
  // ── Todos los hooks primero ──────────────────────────────
  const { user, loading: authLoading, signOut, fullName } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { sessionId, createNewSession } = useSession(user?.id)
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    startNewConversation,
    renameConversation,
    removeConversation,
    loadConversationMessages,
    autoTitle,
  } = useConversations(sessionId)
  const {
    documents,
    uploading,
    uploadProgress,
    error: docError,
    fetchDocuments,
    uploadFileDoc,
    uploadUrlDoc,
    removeDocument,
    clearDocuments,
  } = useDocuments(sessionId)
  const {
    messages,
    loading: chatLoading,
    error: chatError,
    sendMessage,
    clearMessages,
    clearError, 
  } = useChat(sessionId, activeConversationId, loadConversationMessages)
  const { selectedIds, allSelected, activeIds, toggle, selectAll } = useDocumentSelection(documents)
  const messagesEndRef = useRef(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)  // ← nueva línea
  const { getToken } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!user) return
    getToken().then(token => {
      fetch(`${import.meta.env.VITE_API_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => setIsAdmin(res.ok))
    })
  }, [user])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatLoading])

  // ── Returns condicionales después de todos los hooks ────
  if (showAdmin) {
    return <AdminPage onBack={() => setShowAdmin(false)} />
  }
  if (authLoading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <LoginPage />

  // ── Handlers ─────────────────────────────────────────────
  const handleNewSession = async () => {
    const confirmed = window.confirm(
      '¿Crear una nueva sesión? Se eliminarán todos los documentos y el historial de esta sesión.'
    )
    if (!confirmed) return
    await createNewSession(true)
    clearDocuments()
    clearMessages()
  }

  const handleFileUpload = async (file) => {
    try { await uploadFileDoc(file) } catch (e) {}
  }

  const handleUrlUpload = async (url) => {
    try { await uploadUrlDoc(url) } catch (e) {}
  }

  const handleDeleteDoc = async (docId) => {
    try {
      await removeDocument(docId)
    } catch (e) {
      alert('No se pudo eliminar el documento.')
    }
  }

  const handleSend = async (query) => {
    try {
      let convId = activeConversationId
      console.log('handleSend - convId inicial:', convId)
  
      if (!convId) {
        const conv = await startNewConversation()
        console.log('handleSend - nueva conv:', conv)
        if (!conv?.id) return
        convId = conv.id
      }
  
      console.log('handleSend - enviando con convId:', convId)
      await sendMessage(query, activeIds, convId)
  
      const activeConv = conversations.find(c => c.id === convId)
      if (activeConv?.title === 'Nueva conversación') {
        await autoTitle(convId, query)
      }
    } catch (e) {
      console.error('handleSend error:', e)
    }
  }

  // ── Render principal ──────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary">
      <Sidebar
        sessionId={sessionId}
        documents={documents}
        uploading={uploading}
        uploadProgress={uploadProgress}
        onFileUpload={handleFileUpload}
        onUrlUpload={handleUrlUpload}
        onDeleteDocument={handleDeleteDoc}
        onNewSession={handleNewSession}
        onRefreshDocs={fetchDocuments}
        error={docError}
        selectedIds={selectedIds}
        allSelected={allSelected}
        onToggleDoc={toggle}
        onSelectAll={selectAll}
        fullName={fullName}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={setActiveConversationId}
        onNewConversation={startNewConversation}
        onDeleteConversation={removeConversation}
        onRenameConversation={renameConversation}
        clearError={clearError}
      />

      <main className="flex flex-col flex-1 min-w-0 h-full">
        {/* Top bar — verde */}
        <header className="app-header flex items-center justify-between px-4 md:px-6 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            {/* Botón hamburguesa — solo en móvil */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-bg-tertiary transition-colors flex-shrink-0"
              style={{ color: 'var(--accent-green)' }}
              title="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <h2 className="app-header-title text-sm truncate">
                Chat con documentos
              </h2>
              <p className="text-xs truncate" style={{ color: 'var(--accent-green)', opacity: 0.7 }}>
                {documents.length === 0
                  ? 'Sin documentos indexados'
                  : `${documents.length} documento${documents.length > 1 ? 's' : ''} indexado${documents.length > 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {chatError && (
              <p className="hidden sm:block text-xs text-danger bg-danger/10 border border-danger/20 px-3 py-1.5 rounded-lg max-w-[180px] truncate">
                {chatError}
              </p>
            )}

            {/* Toggle dark/light */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-border hover:bg-bg-tertiary transition-colors"
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {theme === 'dark' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" style={{ color: 'var(--accent-green)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707.707M6.343 6.343l-.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" style={{ color: 'var(--accent-green)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
              )}
            </button>

            {/* Botón Admin — solo visible para admins */}
            <button
              onClick={() => setShowAdmin(true)}
              className="p-2 rounded-lg border border-border hover:bg-bg-tertiary transition-colors"
              title="Panel de administración"
            >
              <Shield className="w-4 h-4" style={{ color: 'var(--accent-green)' }} />
            </button>

            {/* Logout */}
            <button
              onClick={signOut}
              className="p-2 rounded-lg border border-border hover:bg-bg-tertiary transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" style={{ color: 'var(--accent-green)' }} />
            </button>
          </div>
        </header>

        {/* Error móvil */}
        {chatError && (
          <div className="sm:hidden mx-4 mt-2">
            <p className="text-xs text-danger bg-danger/10 border border-danger/20 px-3 py-1.5 rounded-lg truncate">
              {chatError}
            </p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-5 min-h-0">
          {messages.length === 0 && !chatLoading ? (
            <EmptyState hasDocuments={documents.length > 0} />
          ) : (
            <>
              {messages.map(msg => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {chatLoading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input area */}
        <div className="px-4 md:px-6 pb-4 md:pb-5 pt-3 border-t border-border bg-bg-secondary/50">
          <ChatInput
            onSend={handleSend}
            disabled={chatLoading || documents.length === 0}
            placeholder={
              documents.length === 0
                ? 'Sube un documento para empezar...'
                : 'Haz una pregunta... (Enter para enviar)'
            }
          />
          <p className="text-xs text-text-muted text-center mt-2 hidden sm:block">
            Respuestas basadas exclusivamente en tus documentos · Llama 3.3 70B
          </p>
        </div>
      </main>
    </div>
  )
}