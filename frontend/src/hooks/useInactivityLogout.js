// frontend/src/hooks/useInactivityLogout.js
import { useEffect, useRef, useCallback } from 'react'

const INACTIVITY_TIMEOUT = 6 * 60 * 60 * 1000 // 2 horas en ms

/**
 * Llama a onTimeout cuando el usuario no tiene actividad por INACTIVITY_TIMEOUT.
 * Escucha: mouse, teclado, click, touch y scroll.
 * @param {Function} onTimeout - callback cuando expira la sesión
 * @param {boolean}  enabled   - solo activo cuando el usuario está autenticado
 */
export function useInactivityLogout(onTimeout, enabled = true) {
  const timerRef    = useRef(null)
  const callbackRef = useRef(onTimeout)

  // Mantener referencia actualizada sin re-registrar eventos
  useEffect(() => { callbackRef.current = onTimeout }, [onTimeout])

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => callbackRef.current(), INACTIVITY_TIMEOUT)
  }, [])

  useEffect(() => {
    if (!enabled) return

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer() // arrancar el timer al montar

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [enabled, resetTimer])
}