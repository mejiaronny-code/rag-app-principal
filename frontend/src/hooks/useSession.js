import { deleteSession } from '../api'

export function useSession(userId) {
  // No usar useState — simplemente retornar el userId directamente
  // userId ya viene validado desde App.jsx (solo se llama cuando user existe)
  const sessionId = userId

  const createNewSession = async (clearServer = true) => {
    if (clearServer && userId) {
      try {
        await deleteSession(userId)
      } catch (e) {
        console.warn('No se pudo limpiar la sesión en el servidor:', e)
      }
    }
    window.location.reload()
  }

  return { sessionId, createNewSession }
}