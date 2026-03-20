import { useEffect } from 'react'
import { Trash2, RefreshCw, PlusCircle, Eye, X } from 'lucide-react'
import { DocIcon } from './DocIcon'
import { UploadZone } from './UploadZone'
import { getDocumentUrl } from '../api'
import { ConversationList } from './ConversationList'

function DocItem({ doc, selected, allSelected, onToggle, onDelete, sessionId }) {
  const displayName = doc.name.length > 22 ? doc.name.slice(0, 19) + '...' : doc.name
  const isActive = allSelected || selected

  const handleView = async () => {
    try {
      const data = await getDocumentUrl(doc.id, sessionId)
      window.open(data.url, '_blank')
    } catch (e) {
      alert('No se pudo obtener el archivo.')
    }
  }

  return (
    <div className={`group flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-150
      ${isActive ? 'hover:bg-bg-tertiary' : 'opacity-40 hover:bg-bg-tertiary hover:opacity-70'}`}>

      {/* Checkbox */}
      <button
        onClick={() => onToggle(doc.id)}
        className="flex-shrink-0 w-3.5 h-3.5 rounded border transition-colors"
        style={{
          background: isActive ? 'var(--accent-blue)' : 'transparent',
          borderColor: isActive ? 'var(--accent-blue)' : 'var(--border)',
        }}
        title={isActive ? 'Deseleccionar' : 'Seleccionar'}
      >
        {isActive && (
          <svg viewBox="0 0 10 10" className="w-full h-full text-white p-0.5">
            <path d="M1.5 5l2.5 2.5 4.5-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </svg>
        )}
      </button>

      <span className="text-accent-blue flex-shrink-0">
        <DocIcon type={doc.type} className="w-3.5 h-3.5" />
      </span>

      <span className="flex-1 min-w-0 text-xs text-text-secondary group-hover:text-text-primary truncate transition-colors">
        {displayName}
      </span>

      <button
        onClick={handleView}
        className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-blue transition-all duration-150 flex-shrink-0"
        title="Ver documento"
      >
        <Eye className="w-3 h-3" />
      </button>

      <button
        onClick={() => onDelete(doc.id)}
        className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger transition-all duration-150 flex-shrink-0"
        title="Eliminar"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  )
}

export function Sidebar({
  sessionId,
  documents,
  uploading,
  uploadProgress,
  onFileUpload,
  onUrlUpload,
  onDeleteDocument,
  onNewSession,
  onRefreshDocs,
  error,
  selectedIds,
  allSelected,
  onToggleDoc,
  onSelectAll,
  fullName,
  isOpen,
  onClose,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  clearError,
}) {
  useEffect(() => {
    onRefreshDocs()
  }, [sessionId])

  const sidebarContent = (
    <div className="flex flex-col h-full bg-bg-secondary">
      {/* Header verde del sidebar */}
      <div className="sidebar-header px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, var(--accent-green-dim), var(--accent-green))',
              boxShadow: '0 0 12px rgba(34,201,122,0.3)',
            }}
          >
            <span className="text-xs font-bold text-white">
              {fullName ? fullName.charAt(0).toUpperCase() : '?'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--accent-green)' }}>
              {fullName || 'Usuario'}
            </p>
            <p className="text-xs" style={{ color: 'var(--accent-green)', opacity: 0.5 }}>RAG Chat</p>
          </div>
        </div>
        {/* Botón cerrar — solo visible en móvil */}
        <button
          onClick={onClose}
          className="md:hidden p-1.5 rounded-lg hover:bg-bg-tertiary transition-colors flex-shrink-0"
          style={{ color: 'var(--accent-green)' }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {/* Conversaciones */}
      <div className="pt-3 border-b border-border pb-3">
        <p className="text-xs font-medium text-text-muted uppercase tracking-wider px-4 mb-2">
          Conversaciones
        </p>
        <div className="px-1">
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelect={onSelectConversation}
            onNew={onNewConversation}
            onDelete={onDeleteConversation}
            onRename={onRenameConversation}
          />
        </div>
      </div>

      {/* Upload section */}
      <div className="pt-3">
        <p className="text-xs font-medium text-text-muted uppercase tracking-wider px-4 mb-2">
          Documentos
        </p>
        <UploadZone
          onFileUpload={onFileUpload}
          onUrlUpload={onUrlUpload}
          uploading={uploading}
          uploadProgress={uploadProgress}
          uploadError={error}        
          onClearError={clearError}    
        />
      </div>

      {/* Documents list */}
      <div className="flex-1 overflow-y-auto px-1 min-h-0">
        {documents.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-xs text-text-muted">Sin documentos en esta sesión</p>
          </div>
        ) : (
          <>
            <button
              onClick={onSelectAll}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors rounded-lg mb-1
                ${allSelected ? 'text-accent-blue font-medium' : 'text-text-muted hover:text-text-primary'}`}
            >
              {allSelected ? '✓ Todos los documentos' : 'Seleccionar todos'}
            </button>
            <div className="space-y-0.5">
              {documents.map(doc => (
                <DocItem
                  key={doc.id}
                  doc={doc}
                  selected={selectedIds.has(doc.id)}
                  allSelected={allSelected}
                  onToggle={onToggleDoc}
                  onDelete={onDeleteDocument}
                  sessionId={sessionId}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border flex flex-col gap-2">
        <button
          onClick={onRefreshDocs}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualizar lista
        </button>
        <button
          onClick={onNewSession}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-text-secondary hover:text-white bg-bg-tertiary hover:bg-accent-violet/20 border border-border hover:border-accent-violet/40 transition-all duration-200"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Nueva sesión
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop: sidebar fijo */}
      <aside className="hidden md:flex w-64 flex-shrink-0 flex-col h-full border-r border-border">
        {sidebarContent}
      </aside>

      {/* Mobile: drawer con overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Overlay oscuro */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Panel del sidebar */}
          <aside className="relative w-72 max-w-[85vw] h-full flex flex-col border-r border-border shadow-2xl animate-slide-up">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}