import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Sparkles, Mail, Lock, Eye, EyeOff, Loader2, User, CheckCircle2 } from 'lucide-react'

export function LoginPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        await signUp(email, password, firstName, lastName)
        setSuccess(true)
      }
    } catch (err) {
      setError(err.message || 'Ocurrió un error. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // Pantalla de éxito tras registro
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
        <div className="relative w-full max-w-md text-center">
          <div className="rounded-2xl p-10 shadow-2xl" style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--header-border)',
          }}>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
              style={{ background: 'rgba(34,201,122,0.12)', border: '1px solid rgba(34,201,122,0.3)' }}>
              <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--accent-green)' }} />
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--accent-green)' }}>
              ¡Cuenta creada exitosamente!
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Bienvenido, <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{firstName}</span>. Ya puedes iniciar sesión.
            </p>
            <button
              onClick={() => { setMode('login'); setSuccess(false); setPassword('') }}
              className="w-full py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
              style={{ background: 'linear-gradient(135deg, var(--accent-green-dim), var(--accent-green))' }}
            >
              Iniciar sesión
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--bg-primary)' }}>

      {/* Fondo decorativo verde */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(34,201,122,0.08), transparent)', filter: 'blur(40px)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(22,163,90,0.06), transparent)', filter: 'blur(60px)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(34,201,122,0.04), transparent)', filter: 'blur(80px)' }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-green-glow"
            style={{
              background: 'linear-gradient(135deg, #0d1f14, #1a3a20)',
              border: '1.5px solid var(--accent-green)',
              boxShadow: '0 0 30px rgba(34,201,122,0.2)',
            }}
          >
            <Sparkles className="w-8 h-8" style={{ color: 'var(--accent-green)' }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--accent-green)' }}>
            Papyrus
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {mode === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta gratis'}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8 shadow-2xl"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--header-border)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(34,201,122,0.05)',
          }}
        >
          {/* Tabs */}
          <div className="flex rounded-xl p-1 mb-6" style={{ background: 'var(--bg-tertiary)' }}>
            <button
              onClick={() => { setMode('login'); setError('') }}
              className="flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200"
              style={{
                background: mode === 'login' ? 'var(--bg-card)' : 'transparent',
                color: mode === 'login' ? 'var(--accent-green)' : 'var(--text-muted)',
                boxShadow: mode === 'login' ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
              }}
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => { setMode('register'); setError('') }}
              className="flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200"
              style={{
                background: mode === 'register' ? 'var(--bg-card)' : 'transparent',
                color: mode === 'register' ? 'var(--accent-green)' : 'var(--text-muted)',
                boxShadow: mode === 'register' ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
              }}
            >
              Registrarse
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Nombre y apellido — solo en registro */}
            {mode === 'register' && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                    Nombre
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--accent-green)', opacity: 0.6 }} />
                    <input
                      type="text"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      placeholder="Juan"
                      required
                      className="w-full rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none transition-all"
                      style={{
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                      }}
                      onFocus={e => e.target.style.borderColor = 'var(--accent-green)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                    Apellido
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--accent-green)', opacity: 0.6 }} />
                    <input
                      type="text"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      placeholder="Pérez"
                      required
                      className="w-full rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none transition-all"
                      style={{
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                      }}
                      onFocus={e => e.target.style.borderColor = 'var(--accent-green)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--accent-green)', opacity: 0.6 }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  required
                  className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none transition-all"
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent-green)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--accent-green)', opacity: 0.6 }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none transition-all"
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent-green)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{
                color: 'var(--danger)',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
              }}>
                {error}
              </p>
            )}

            {/* Submit */}
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
              {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
          Tus documentos son privados y solo tú puedes verlos.
        </p>
      </div>
    </div>
  )
}