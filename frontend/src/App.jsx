import { useEffect, useRef, useState, useCallback } from 'react'
import { useSession } from './hooks/useSession'
import { useDocuments } from './hooks/useDocuments'
import { useChat } from './hooks/useChat'
import { useDocumentSelection } from './hooks/useDocumentSelection'
import { Sidebar } from './components/Sidebar'
import { ChatMessage } from './components/ChatMessage'
import { ChatInput } from './components/ChatInput'
import { TypingIndicator } from './components/TypingIndicator'
import { EmptyState } from './components/EmptyState'
import { LoadingScreen } from './components/LoadingScreen'
import { useTheme } from './hooks/useTheme'
import { useAuth } from './context/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { LogOut, Menu, Shield } from 'lucide-react'
import { useConversations } from './hooks/useConversations'
import { AdminPage } from './pages/AdminPage'
import { useInactivityLogout } from './hooks/useInactivityLogout'  // ← NUEVO

export default function App() {
  const {
    user, loading: authLoading, signOut, fullName,
    transitioning, transitionMsg, withTransition,
  } = useAuth()
  const { theme, toggleTheme }  = useTheme()
  const { sessionId, createNewSession } = useSession(user?.id)
  const {
    conversations, activeConversationId, setActiveConversationId,
    startNewConversation, renameConversation, removeConversation,
    loadConversationMessages, autoTitle,
  } = useConversations(sessionId)
  const {
    documents, uploading, uploadProgress, error: docError,
    fetchDocuments, uploadFileDoc, uploadUrlDoc, removeDocument,
    clearDocuments, clearError: clearDocError,
  } = useDocuments(sessionId)
  const {
    messages, loading: chatLoading, error: chatError,
    sendMessage, clearMessages, clearError,
  } = useChat(sessionId, activeConversationId, loadConversationMessages)
  const { selectedIds, allSelected, activeIds, toggle, selectAll } = useDocumentSelection(documents)
  const messagesEndRef = useRef(null)
  const [sidebarOpen, setSidebarOpen]     = useState(false)
  const [showAdmin, setShowAdmin]         = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)  // ← NUEVO
  const { getToken } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)

  // ── Timeout por inactividad ───────────────────────────────────────────────
  // ← NUEVO: se activa solo cuando hay usuario autenticado
  const handleInactivityTimeout = useCallback(() => {
    setSessionExpired(true)
  }, [])

  useInactivityLogout(handleInactivityTimeout, !!user)

  // ── Handler para cerrar sesión desde el overlay de expiración ─────────────
  const handleExpiredSignOut = useCallback(async () => {
    setSessionExpired(false)
    await signOut()
  }, [signOut])

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

  // ── Overlay de sesión expirada ────────────────────────────────────────────
  // ← NUEVO: se muestra encima de todo cuando hay inactividad
  if (sessionExpired) {
    return (
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          backgroundColor: 'var(--bg-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1.5rem',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '1rem',
            padding: '2.5rem 2rem',
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {/* Icono */}
          <div style={{ fontSize: '2.5rem' }}>🔒</div>

          {/* Título */}
          <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.2rem', margin: 0 }}>
            Sesión expirada
          </h2>

          {/* Mensaje */}
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
            Tu sesión cerró automáticamente por 2 horas de inactividad.
            Vuelve a iniciar sesión para continuar.
          </p>

          {/* Botón */}
          <button
            onClick={handleExpiredSignOut}
            style={{
              backgroundColor: 'var(--accent-green)',
              color: '#fff',
              border: 'none',
              borderRadius: '0.6rem',
              padding: '0.75rem 1.5rem',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => e.target.style.opacity = '0.85'}
            onMouseLeave={e => e.target.style.opacity = '1'}
          >
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    )
  }

  // ── Pantalla de carga global ──────────────────────────────────────────────
  if (transitioning) return <LoadingScreen message={transitionMsg} />
  if (showAdmin)     return <AdminPage onBack={() => setShowAdmin(false)} />
  if (authLoading)   return <LoadingScreen message="Cargando..." />
  if (!user)         return <LoginPage />

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleNewSession = async () => {
    const confirmed = window.confirm(
      '¿Crear una nueva sesión? Se eliminarán todos los documentos y el historial de esta sesión.'
    )
    if (!confirmed) return
    await withTransition("Creando nueva sesión...", async () => {
      await createNewSession(true)
      clearDocuments()
      clearMessages()
    })
  }

  const handleOpenAdmin = async () => {
    await withTransition("Abriendo panel de administración...", async () => {
      await new Promise(r => setTimeout(r, 300))
    })
    setShowAdmin(true)
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
      if (!convId) {
        const conv = await startNewConversation()
        if (!conv?.id) return
        convId = conv.id
      }
      await sendMessage(query, activeIds, convId)
      const activeConv = conversations.find(c => c.id === convId)
      if (activeConv?.title === 'Nueva conversación') {
        await autoTitle(convId, query)
      }
    } catch (e) {
      console.error('handleSend error:', e)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
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
        clearError={clearDocError}
      />

      <main className="flex flex-col flex-1 min-w-0 h-full">
        <header className="app-header flex items-center justify-between px-4 md:px-6 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-bg-tertiary transition-colors flex-shrink-0"
              style={{ color: 'var(--accent-green)' }}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h2 className="app-header-title text-sm truncate">Chat con documentos</h2>
              <p className="text-xs truncate" style={{ color: 'var(--accent-green)', opacity: 0.7 }}>
                {documents.length === 0
                  ? 'Sin documentos indexados'
                  : `${documents.length} documento${documents.length > 1 ? 's' : ''} indexado${documents.length > 1 ? 's' : ''}`
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {chatError && (
              <p className="hidden sm:block text-xs text-danger bg-danger/10 border border-danger/20 px-3 py-1.5 rounded-lg max-w-[180px] truncate">
                {chatError}
              </p>
            )}
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
            <button
              onClick={handleOpenAdmin}
              className="p-2 rounded-lg border border-border hover:bg-bg-tertiary transition-colors"
              title="Panel de administración"
            >
              <Shield className="w-4 h-4" style={{ color: 'var(--accent-green)' }} />
            </button>
            <button
              onClick={signOut}
              className="p-2 rounded-lg border border-border hover:bg-bg-tertiary transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" style={{ color: 'var(--accent-green)' }} />
            </button>
          </div>
        </header>

        {chatError && (
          <div className="sm:hidden mx-4 mt-2">
            <p className="text-xs text-danger bg-danger/10 border border-danger/20 px-3 py-1.5 rounded-lg truncate">
              {chatError}
            </p>
          </div>
        )}

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
            Respuestas basadas exclusivamente en tus documentos · Por Ronny Mejia
          </p>
        </div>
      </main>
    </div>
  )
}