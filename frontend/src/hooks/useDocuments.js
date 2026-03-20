import { useState, useCallback } from 'react'
import { uploadFile, uploadUrl, getSessionDocuments, deleteDocument } from '../api'

export function useDocuments(sessionId) {
  const [documents, setDocuments] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState(null)

  const fetchDocuments = useCallback(async () => {
    if (!sessionId) return
    try {
      const data = await getSessionDocuments(sessionId)
      setDocuments(data.documents || [])
    } catch (e) {
      console.error('Error cargando documentos:', e)
    }
  }, [sessionId])

  const uploadFileDoc = useCallback(async (file) => {
    setUploading(true)
    setUploadProgress(0)
    setError(null)
    try {
      const result = await uploadFile(sessionId, file, setUploadProgress)
      await fetchDocuments()
      return result
    } catch (e) {
      const msg = e.response?.data?.detail || 'Error subiendo el archivo.'
      setError(msg)
      throw e
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }, [sessionId, fetchDocuments])

  const uploadUrlDoc = useCallback(async (url) => {
    setUploading(true)
    setError(null)
    try {
      const result = await uploadUrl(sessionId, url)
      await fetchDocuments()
      return result
    } catch (e) {
      const msg = e.response?.data?.detail || 'Error procesando la URL.'
      setError(msg)
      throw e
    } finally {
      setUploading(false)
    }
  }, [sessionId, fetchDocuments])

  const removeDocument = useCallback(async (docId) => {
    try {
      await deleteDocument(sessionId, docId)
      setDocuments(prev => prev.filter(d => d.id !== docId))
    } catch (e) {
      const msg = e.response?.data?.detail || 'Error eliminando el documento.'
      setError(msg)
      throw e
    }
  }, [sessionId])

  const clearDocuments = useCallback(() => {
    setDocuments([])
  }, [])

  return {
    documents,
    uploading,
    uploadProgress,
    error,
    fetchDocuments,
    uploadFileDoc,
    uploadUrlDoc,
    removeDocument,
    clearDocuments,
  }
}
