import { useState, useRef } from 'react'
import { Upload, Link, X, Loader2, AlertCircle } from 'lucide-react'

const ACCEPTED_TYPES = '.pdf,.docx,.doc,.txt,.md,.jpg,.jpeg,.png,.gif,.webp,.xlsx,.xls'
const MAX_MB = 30

const UPLOAD_ERROR_MESSAGES = {
  429: null,
  413: `El archivo es demasiado grande. Máximo ${MAX_MB}MB.`,
  415: 'Tipo de archivo no soportado. Sube PDF, DOCX, TXT, imágenes o URLs.',
  422: 'No se pudo procesar el documento. Verifica que no esté corrupto.',
  500: 'Error procesando el documento. Intenta con otro archivo.',
}

export function getFriendlyUploadError(e) {
  const status = e.response?.status
  const detail = e.response?.data?.detail

  if (status && UPLOAD_ERROR_MESSAGES[status] !== undefined) {
    return UPLOAD_ERROR_MESSAGES[status] ?? detail
  }
  if (detail) return detail
  if (!navigator.onLine) return 'Sin conexión a internet. Revisa tu red.'
  return 'Error subiendo el archivo. Intenta de nuevo.'
}

export function UploadZone({ onFileUpload, onUrlUpload, uploading, uploadProgress, uploadError, onClearError }) {
  const [dragOver, setDragOver] = useState(false)
  const [urlMode, setUrlMode] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [urlError, setUrlError] = useState('')
  const inputRef = useRef(null)

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) handleFile(files[0])
  }

  const handleFile = (file) => {
    if (file.size > MAX_MB * 1024 * 1024) {
      onClearError?.(`El archivo supera el límite de ${MAX_MB}MB.`)
      return
    }
    onClearError?.()
    onFileUpload(file)
  }

  const handleUrlSubmit = (e) => {
    e.preventDefault()
    setUrlError('')
    const trimmed = urlInput.trim()
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setUrlError('La URL debe comenzar con http:// o https://')
      return
    }
    onUrlUpload(trimmed)
    setUrlInput('')
    setUrlMode(false)
  }

  if (uploading) {
    return (
      <div className="mx-3 mb-3 rounded-xl border border-border bg-bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Loader2 className="w-4 h-4 text-accent-blue animate-spin" />
          <span className="text-sm text-text-secondary">
            {uploadProgress > 0 ? `Subiendo... ${uploadProgress}%` : 'Procesando e indexando...'}
          </span>
        </div>
        <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent-blue to-accent-violet rounded-full transition-all duration-300"
            style={{ width: uploadProgress > 0 ? `${uploadProgress}%` : '60%' }}
          />
        </div>
        {uploadProgress === 0 && (
          <p className="text-xs text-text-muted mt-2">Guardando tu documento...</p>
        )}
      </div>
    )
  }

  if (urlMode) {
    return (
      <div className="mx-3 mb-3 rounded-xl border border-border bg-bg-card p-3 animate-fade-in">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-text-secondary flex items-center gap-1">
            <Link className="w-3 h-3" /> Indexar URL
          </span>
          <button
            onClick={() => { setUrlMode(false); setUrlError('') }}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <form onSubmit={handleUrlSubmit} className="flex flex-col gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder="https://ejemplo.com/articulo"
            className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue/60 transition-colors"
            autoFocus
          />
          {urlError && <p className="text-xs text-danger">{urlError}</p>}
          <button
            type="submit"
            disabled={!urlInput.trim()}
            className="w-full py-1.5 rounded-lg bg-accent-blue/20 hover:bg-accent-blue/30 text-accent-blue text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Indexar
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="px-3 mb-3 flex flex-col gap-2">

      {uploadError && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-red-700 dark:text-red-300">{uploadError}</p>
          </div>
          <button
            onClick={() => onClearError?.()}
            className="text-red-400 hover:text-red-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Drag & drop zone */}
      <div
        className={`relative rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-all duration-200
          ${dragOver
            ? 'border-accent-blue bg-accent-blue/10'
            : 'border-border hover:border-accent-blue/50 hover:bg-bg-card'
          }`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            opacity: 0.01,
            width: '100%',
            height: '100%',
            top: 0,
            left: 0,
            cursor: 'pointer',
            zIndex: 1,
          }}
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) {
              handleFile(file)
              e.target.value = ''
            }
          }}
        />
        <Upload className="w-5 h-5 mx-auto mb-1.5 text-text-muted" />
        <p className="text-xs text-text-secondary font-medium">
          Arrastra un archivo aquí
        </p>
        <p className="text-xs text-text-muted mt-0.5">
          PDF, DOCX, XLSX, TXT, MD, imágenes · máx. {MAX_MB}MB
        </p>
      </div>

      {/* URL button */}
      <button
        onClick={() => setUrlMode(true)}
        className="flex items-center justify-center gap-2 w-full py-2 rounded-xl border border-border hover:border-accent-violet/50 hover:bg-bg-card text-xs text-text-secondary hover:text-text-primary transition-all duration-200"
      >
        <Link className="w-3.5 h-3.5" />
        Indexar desde URL
      </button>
    </div>
  )
}