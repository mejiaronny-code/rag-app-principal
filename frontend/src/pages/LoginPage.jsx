import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Sparkles, Mail, Lock, Eye, EyeOff, Loader2, User, CheckCircle2, ArrowLeft } from 'lucide-react'

export function LoginPage() {
  const { signIn, signUp, sendPasswordReset } = useAuth()
  const [mode, setMode]                   = useState('login')
  const [email, setEmail]                 = useState('')
  const [password, setPassword]           = useState('')
  const [confirmPassword, setConfirmPassword] = useState('') // ← NUEVO
  const [firstName, setFirstName]         = useState('')
  const [lastName, setLastName]           = useState('')
  const [showPassword, setShowPassword]   = useState(false)
  const [showConfirm, setShowConfirm]     = useState(false)   // ← NUEVO
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState('')
  const [success, setSuccess]             = useState(false)
  const [resetSent, setResetSent]         = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // ← NUEVO: validar que las contraseñas coincidan
    if (mode === 'register' && password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else if (mode === 'register') {
        await signUp(email, password, firstName, lastName)
        setSuccess(true)
      } else if (mode === 'forgot') {
        await sendPasswordReset(email)
        setResetSent(true)
      }
    } catch (err) {
      setError(err.message || 'Ocurrió un error. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (newMode) => {
    setMode(newMode)
    setError('')
    setResetSent(false)
    setConfirmPassword('')
  }

  // Input reutilizable para no repetir código
  const inputStyle = {
    background: 'var(--bg-tertiary)',
    border:     '1px solid var(--border)',
    color:      'var(--text-primary)',
  }
  const inputClass = "w-full rounded-xl py-2.5 text-sm focus:outline-none transition-all"

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
        <div className="relative w-full max-w-md text-center">
          <div className="rounded-2xl p-10 shadow-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--header-border)' }}>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
              style={{ background: 'rgba(34,201,122,0.12)', border: '1px solid rgba(34,201,122,0.3)' }}>
              <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--accent-green)' }} />
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--accent-green)' }}>
              ¡Cuenta creada exitosamente!
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Bienvenido, <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{firstName}</span>.
              Un administrador debe aprobar tu cuenta. Te avisaremos por correo.
            </p>
            <button
              onClick={() => { switchMode('login'); setSuccess(false); setPassword('') }}
              className="w-full py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
              style={{ background: 'linear-gradient(135deg, var(--accent-green-dim), var(--accent-green))' }}
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (resetSent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
        <div className="relative w-full max-w-md text-center">
          <div className="rounded-2xl p-10 shadow-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--header-border)' }}>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
              style={{ background: 'rgba(34,201,122,0.12)', border: '1px solid rgba(34,201,122,0.3)' }}>
              <Mail className="w-8 h-8" style={{ color: 'var(--accent-green)' }} />
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--accent-green)' }}>Revisa tu correo</h2>
            <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Enviamos un enlace de recuperación a:</p>
            <p className="text-sm font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>{email}</p>
            <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>El enlace expira en 1 hora. Si no lo ves, revisa tu carpeta de spam.</p>
            <button
              onClick={() => switchMode('login')}
              className="w-full py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-all"
              style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              Volver al inicio de sesión
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(34,201,122,0.08), transparent)', filter: 'blur(40px)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(22,163,90,0.06), transparent)', filter: 'blur(60px)' }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
        <div className="mb-6 flex justify-center">
            <img
              src="/logo.png" // asegúrate que aquí esté tu imagen Monarchware
              alt="Monarchware"
              className="w-64 h-auto object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--accent-green)' }}>Papyrus</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {mode === 'login'    && 'Bienvenido de vuelta'}
            {mode === 'register' && 'Crea tu cuenta gratis'}
            {mode === 'forgot'   && 'Recupera tu acceso'}
          </p>
        </div>

        <div className="rounded-2xl p-8 shadow-2xl"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--header-border)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>

          {/* Tabs */}
          {mode !== 'forgot' && (
            <div className="flex rounded-xl p-1 mb-6" style={{ background: 'var(--bg-tertiary)' }}>
              {['login', 'register'].map(m => (
                <button key={m} onClick={() => switchMode(m)}
                  className="flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200"
                  style={{
                    background: mode === m ? 'var(--bg-card)' : 'transparent',
                    color:      mode === m ? 'var(--accent-green)' : 'var(--text-muted)',
                    boxShadow:  mode === m ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                  }}
                >
                  {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
                </button>
              ))}
            </div>
          )}

          {mode === 'forgot' && (
            <button onClick={() => switchMode('login')}
              className="flex items-center gap-2 text-sm mb-6 transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-green)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
            </button>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Nombre + Apellido */}
            {mode === 'register' && (
              <div className="flex gap-3">
                {[
                  { label: 'Nombre',   val: firstName, set: setFirstName, ph: 'Juan'  },
                  { label: 'Apellido', val: lastName,  set: setLastName,  ph: 'Pérez' },
                ].map(({ label, val, set, ph }) => (
                  <div key={label} className="flex-1">
                    <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>{label}</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--accent-green)', opacity: 0.6 }} />
                      <input type="text" value={val} onChange={e => set(e.target.value)} placeholder={ph} required
                        className={`${inputClass} pl-9 pr-3`} style={inputStyle}
                        onFocus={e => e.target.style.borderColor = 'var(--accent-green)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--accent-green)', opacity: 0.6 }} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" required
                  className={`${inputClass} pl-10 pr-4`} style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--accent-green)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'} />
              </div>
              {mode === 'forgot' && (
                <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>Te enviaremos un enlace para restablecer tu contraseña.</p>
              )}
            </div>

            {/* Contraseña */}
            {mode !== 'forgot' && (
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--accent-green)', opacity: 0.6 }} />
                  <input type={showPassword ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6}
                    className={`${inputClass} pl-10 pr-10`} style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'var(--accent-green)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {mode === 'login' && (
                  <div className="flex justify-end mt-1.5">
                    <button type="button" onClick={() => switchMode('forgot')}
                      className="text-xs transition-colors" style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-green)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ← NUEVO: Confirmar contraseña — solo en registro */}
            {mode === 'register' && (
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Confirmar contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--accent-green)', opacity: 0.6 }} />
                  <input type={showConfirm ? 'text' : 'password'} value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)} placeholder="Repite tu contraseña" required minLength={6}
                    className={`${inputClass} pl-10 pr-10`}
                    style={{
                      ...inputStyle,
                      borderColor: confirmPassword && confirmPassword !== password ? 'var(--danger)' : 'var(--border)',
                    }}
                    onFocus={e => e.target.style.borderColor = confirmPassword !== password ? 'var(--danger)' : 'var(--accent-green)'}
                    onBlur={e => e.target.style.borderColor = confirmPassword && confirmPassword !== password ? 'var(--danger)' : 'var(--border)'} />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Indicador visual de coincidencia */}
                {confirmPassword && (
                  <p className="text-xs mt-1.5" style={{ color: confirmPassword === password ? 'var(--accent-green)' : 'var(--danger)' }}>
                    {confirmPassword === password ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden'}
                  </p>
                )}
              </div>
            )}

            {error && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{ color: 'var(--danger)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
              style={{ background: 'linear-gradient(135deg, var(--accent-green-dim), var(--accent-green))', boxShadow: loading ? 'none' : '0 4px 15px rgba(34,201,122,0.25)' }}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'login'    && 'Iniciar sesión'}
              {mode === 'register' && 'Crear cuenta'}
              {mode === 'forgot'   && 'Enviar enlace de recuperación'}
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