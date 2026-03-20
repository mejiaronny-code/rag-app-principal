import { useState, useRef, useEffect } from 'react'
import { SendHorizontal } from 'lucide-react'

export function ChatInput({ onSend, disabled, placeholder = 'Escribe tu pregunta...' }) {
  const [value, setValue] = useState('')
  const textareaRef = useRef(null)

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }, [value])

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div
      className="flex items-end gap-2 p-3 rounded-2xl transition-all duration-200"
      style={{
        background: 'var(--bg-secondary)',
        border: '1.5px solid var(--border)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
      }}
      onFocus={() => {}}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onInput={e => setValue(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted resize-none focus:outline-none min-h-[24px] max-h-[160px] leading-relaxed py-0.5 disabled:opacity-40"
      />
      <button
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95"
        style={{
          background: disabled || !value.trim()
            ? 'var(--bg-tertiary)'
            : 'linear-gradient(135deg, var(--accent-green-dim), var(--accent-green))',
          color: disabled || !value.trim() ? 'var(--text-muted)' : 'white',
          opacity: disabled ? 0.4 : 1,
          cursor: disabled || !value.trim() ? 'not-allowed' : 'pointer',
        }}
        title="Enviar (Enter)"
      >
        <SendHorizontal className="w-4 h-4" />
      </button>
    </div>
  )
}