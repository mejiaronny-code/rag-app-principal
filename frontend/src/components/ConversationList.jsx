import { useState } from 'react'
import { MessageSquare, Trash2, Pencil, Check, X, Plus } from 'lucide-react'

function ConversationItem({ conv, isActive, onSelect, onDelete, onRename }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(conv.title)

  const handleRename = () => {
    if (title.trim()) {
      onRename(conv.id, title.trim())
    }
    setEditing(false)
  }

  return (
    <div
      className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors duration-150
        ${isActive ? 'bg-bg-tertiary text-text-primary' : 'hover:bg-bg-tertiary/50 text-text-secondary hover:text-text-primary'}`}
      onClick={() => !editing && onSelect(conv.id)}
    >
      <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 text-text-muted" />

      {editing ? (
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleRename()
            if (e.key === 'Escape') setEditing(false)
          }}
          onClick={e => e.stopPropagation()}
          className="flex-1 bg-bg-primary border border-accent-blue/40 rounded px-1.5 py-0.5 text-xs text-text-primary focus:outline-none"
        />
      ) : (
        <span className="flex-1 min-w-0 text-xs truncate">{conv.title}</span>
      )}

      <div className="flex items-center gap-1 flex-shrink-0">
        {editing ? (
          <>
            <button onClick={e => { e.stopPropagation(); handleRename() }}
              className="text-success hover:text-success/80 transition-colors">
              <Check className="w-3 h-3" />
            </button>
            <button onClick={e => { e.stopPropagation(); setEditing(false) }}
              className="text-text-muted hover:text-text-primary transition-colors">
              <X className="w-3 h-3" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={e => { e.stopPropagation(); setEditing(true) }}
              className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-primary transition-all"
              title="Renombrar"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDelete(conv.id) }}
              className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger transition-all"
              title="Eliminar"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export function ConversationList({
  conversations,
  activeConversationId,
  onSelect,
  onNew,
  onDelete,
  onRename,
}) {
  return (
    <div className="flex flex-col gap-1">
      {/* Botón nueva conversación */}
      <button
        onClick={onNew}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-text-secondary hover:text-white bg-bg-tertiary hover:bg-accent-blue/20 border border-border hover:border-accent-blue/40 transition-all duration-200 mb-1"
      >
        <Plus className="w-3.5 h-3.5" />
        Nueva conversación
      </button>

      {conversations.length === 0 ? (
        <p className="text-xs text-text-muted text-center py-4 px-3">
          Sin conversaciones aún
        </p>
      ) : (
        conversations.map(conv => (
          <ConversationItem
            key={conv.id}
            conv={conv}
            isActive={conv.id === activeConversationId}
            onSelect={onSelect}
            onDelete={onDelete}
            onRename={onRename}
          />
        ))
      )}
    </div>
  )
}