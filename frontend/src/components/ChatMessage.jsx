import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { SourcesList } from './SourcesList'
import { User } from 'lucide-react'

function formatTime(isoString) {
  if (!isoString) return ''
  try {
    return new Date(isoString).toLocaleTimeString('es', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export function ChatMessage({ message }) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex items-end gap-2.5 justify-end animate-slide-up">
        <div className="max-w-[72%]">
          {/* Burbuja usuario — verde sólido */}
          <div className="px-4 py-3 rounded-2xl rounded-br-sm text-sm leading-relaxed text-white font-medium shadow-card"
            style={{
              background: 'linear-gradient(135deg, var(--accent-green-dim) 0%, var(--accent-green) 100%)',
            }}
          >
            {message.content}
          </div>
          <p className="text-[10px] text-text-muted text-right mt-1 pr-1 tracking-wide">
            {formatTime(message.timestamp)}
          </p>
        </div>
        {/* Avatar usuario */}
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mb-5"
          style={{ background: 'var(--accent-green)', opacity: 0.9 }}
        >
          <User className="w-3.5 h-3.5 text-white" />
        </div>
      </div>
    )
  }

  // Burbuja asistente
  return (
    <div className="flex items-end gap-2.5 animate-slide-up">
      {/* Avatar AI */}
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mb-5 flex-shrink-0"
        style={{
          background: 'linear-gradient(135deg, #0d1f14 0%, #1a2f1a 100%)',
          border: '1px solid var(--accent-green)',
        }}
      >
        <span className="text-[10px] font-bold" style={{ color: 'var(--accent-green)' }}>AI</span>
      </div>

      <div className="max-w-[78%] flex-1">
        {/* Burbuja respuesta */}
        <div className="px-4 py-3 rounded-2xl rounded-bl-sm text-sm shadow-card"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="prose-rag">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        </div>

        <p className="text-[10px] text-text-muted mt-1 pl-1 tracking-wide">
          {formatTime(message.timestamp)}
        </p>

        {message.sources && message.sources.length > 0 && (
          <div className="pl-1 mt-1.5">
            <SourcesList sources={message.sources} />
          </div>
        )}
      </div>
    </div>
  )
}