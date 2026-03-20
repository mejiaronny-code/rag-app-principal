import { useState } from 'react'
import { ChevronDown, ChevronUp, FileText } from 'lucide-react'
import { DocIcon } from './DocIcon'

function SimilarityBar({ score }) {
  const pct = Math.round(score * 100)
  let color = 'bg-danger'
  if (pct >= 80) color = 'bg-success'
  else if (pct >= 60) color = 'bg-warning'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-bg-primary rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-mono font-medium min-w-[36px] text-right
        ${pct >= 80 ? 'text-success' : pct >= 60 ? 'text-warning' : 'text-danger'}`}>
        {pct}%
      </span>
    </div>
  )
}

function SourceCard({ source }) {
  const [expanded, setExpanded] = useState(false)
  const preview = source.chunk_content?.slice(0, 150) || ''
  const hasMore = (source.chunk_content?.length || 0) > 150

  return (
    <div className="rounded-lg border border-border bg-bg-primary/60 overflow-hidden">
      <button
        className="w-full text-left p-2.5 hover:bg-bg-tertiary/30 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start gap-2">
          <span className="text-accent-blue mt-0.5 flex-shrink-0">
            <DocIcon type={source.document_type || 'pdf'} className="w-3 h-3" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-text-primary truncate">
              {source.document_name}
            </p>
            <p className="text-xs text-text-muted mt-0.5 line-clamp-2 leading-relaxed">
              {expanded ? source.chunk_content : preview}
              {!expanded && hasMore && '…'}
            </p>
          </div>
          <span className="flex-shrink-0 text-text-muted mt-0.5">
            {expanded
              ? <ChevronUp className="w-3 h-3" />
              : <ChevronDown className="w-3 h-3" />
            }
          </span>
        </div>
        <div className="mt-2 pl-5">
          <SimilarityBar score={source.similarity_score} />
        </div>
      </button>
    </div>
  )
}

export function SourcesList({ sources }) {
  const [visible, setVisible] = useState(false)

  if (!sources || sources.length === 0) return null

  return (
    <div className="mt-2">
      <button
        onClick={() => setVisible(v => !v)}
        className="flex items-center gap-1.5 text-xs text-text-muted hover:text-accent-blue transition-colors"
      >
        <FileText className="w-3 h-3" />
        <span>{sources.length} fuente{sources.length > 1 ? 's' : ''}</span>
        {visible ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {visible && (
        <div className="mt-2 space-y-1.5 animate-fade-in">
          {sources.map((source, i) => (
            <SourceCard key={i} source={source} />
          ))}
        </div>
      )}
    </div>
  )
}
