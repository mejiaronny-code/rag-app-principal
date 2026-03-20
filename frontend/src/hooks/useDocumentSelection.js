import { useState, useCallback, useEffect } from 'react'

export function useDocumentSelection(documents) {
  const safeDocuments = Array.isArray(documents) ? documents : []
  const [selectedIds, setSelectedIds] = useState(new Set())

  // Si no hay ninguno seleccionado = todos activos
  const allSelected = selectedIds.size === 0

  // Si la lista de documentos se queda vacía (p.ej. nueva sesión), resetea selección
  useEffect(() => {
    if (safeDocuments.length === 0 && selectedIds.size !== 0) {
      setSelectedIds(new Set())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeDocuments])

  const toggle = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const selectAll = useCallback(() => setSelectedIds(new Set()), [])

  const selectOnly = useCallback((id) => setSelectedIds(new Set([id])), [])

  // IDs activos — si ninguno seleccionado, retorna todos
  const activeIds = allSelected
    ? safeDocuments.map(d => d.id)
    : safeDocuments.filter(d => selectedIds.has(d.id)).map(d => d.id)

  return { selectedIds, allSelected, activeIds, toggle, selectAll, selectOnly }
}

