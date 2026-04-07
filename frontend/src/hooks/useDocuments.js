import { useState, useCallback } from 'react'
import { uploadFile, uploadUrl, getSessionDocuments, deleteDocument } from '../api'
import { getFriendlyUploadError } from '../components/UploadZone'  // ← nueva importación


export function useDocuments(sessionId) {
  const [documents, setDocuments] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState(null)
  const clearError = useCallback((msg = null) => setError(msg), [])

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
      const result = await uploadFile(sessionId, file, (progress) => {
        setUploadProgress(progress)
      })
      await fetchDocuments()
      return result
    } catch (e) {
      setError(getFriendlyUploadError(e))
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
      setError(getFriendlyUploadError(e))
    } finally {
      setUploading(false)
    }
  }, [sessionId, fetchDocuments])

  const removeDocument = useCallback(async (docId) => {
    try {
      await deleteDocument(sessionId, docId)
      setDocuments(prev => prev.filter(d => d.id !== docId))
    } catch (e) {
      setError(getFriendlyUploadError(e))
    }
  }, [sessionId])

  const clearDocuments = useCallback(() => {
    setDocuments([])
  }, [])
  const clearError = useCallback(() => setError(null), [])

  return {
    documents,
    uploading,
    uploadProgress,
    error,
    clearError,
    fetchDocuments,
    uploadFileDoc,
    uploadUrlDoc,
    removeDocument,
    clearDocuments,
  }
}
