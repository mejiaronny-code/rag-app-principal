import { FileSearch, Upload, Globe } from 'lucide-react'

export function EmptyState({ hasDocuments }) {
  if (!hasDocuments) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8 select-none">
        <div className="w-16 h-16 rounded-2xl bg-bg-card border border-border flex items-center justify-center mb-4">
          <Upload className="w-7 h-7 text-text-muted" />
        </div>
        <h2 className="text-base font-semibold text-text-primary mb-2">
          Sin documentos aún
        </h2>
        <p className="text-sm text-text-secondary leading-relaxed max-w-sm">
          Sube un archivo PDF, DOCX, TXT o imagen en el panel izquierdo, 
          o indexa una URL para empezar a chatear con tus documentos.
        </p>
        <div className="mt-6 flex items-center gap-6 text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5" /> Archivos hasta 20MB
          </span>
          <span className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" /> Indexar URLs
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 select-none">
      <div className="w-16 h-16 rounded-2xl bg-bg-card border border-border flex items-center justify-center mb-4">
        <FileSearch className="w-7 h-7 text-accent-blue/60" />
      </div>
      <h2 className="text-base font-semibold text-text-primary mb-2">
        Listo para responder
      </h2>
      <p className="text-sm text-text-secondary leading-relaxed max-w-sm">
        Tus documentos están indexados. Haz una pregunta y el asistente buscará 
        la información más relevante para responderte.
      </p>
    </div>
  )
}
