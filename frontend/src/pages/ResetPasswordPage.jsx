import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Sparkles, Lock, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'

export function ResetPasswordPage({ onDone }) {
  const [password, setPassword]         = useState('')
  const [confirm, setConfirm]           = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [success, setSuccess]           = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setSuccess(true)
      // Esperar 2 segundos y redirigir al login
      setTimeout(() => onDone(), 2000)
    } catch (err) {
      setError(err.message || 'No se pudo actualizar la contraseña.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
        <div className="w-full max-w-md text-center rounded-2xl p-10 shadow-2xl"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--header-border)' }}>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
            style={{ background: 'rgba(34,201,122,0.12)', border: '1px solid rgba(34,201,122,0.3)' }}>
            <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--accent-green)' }} />
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--accent-green)' }}>
            ¡Contraseña actualizada!
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Redirigiendo al inicio de sesión...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--bg-primary)' }}>

      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(34,201,122,0.08), transparent)', filter: 'blur(40px)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(22,163,90,0.06), transparent)', filter: 'blur(60px)' }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{
              background: 'linear-gradient(135deg, #0d1f14, #1a3a20)',
              border: '1.5px solid var(--accent-green)',
              boxShadow: '0 0 30px rgba(34,201,122,0.2)',
            }}
          >
            <Sparkles className="w-8 h-8" style={{ color: 'var(--accent-green)' }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--accent-green)' }}>Papyrus</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Elige tu nueva contraseña</p>
        </div>

        <div className="rounded-2xl p-8 shadow-2xl"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--header-border)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Nueva contraseña */}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                Nueva contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--accent-green)', opacity: 0.6 }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required minLength={6}
                  className="w-full rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none transition-all"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent-green)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                Confirmar contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--accent-green)', opacity: 0.6 }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repite tu contraseña"
                  required minLength={6}
                  className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none transition-all"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent-green)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
            </div>

            {error && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{
                color: 'var(--danger)',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
              }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
              style={{
                background: 'linear-gradient(135deg, var(--accent-green-dim), var(--accent-green))',
                boxShadow: loading ? 'none' : '0 4px 15px rgba(34,201,122,0.25)',
              }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar nueva contraseña
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}