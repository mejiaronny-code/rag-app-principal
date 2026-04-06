import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]                   = useState(null)
  const [profile, setProfile]             = useState(null)
  const [loading, setLoading]             = useState(true)
  const [profileLoading, setProfileLoading] = useState(false) // ← NUEVO
  const [transitioning, setTransitioning] = useState(false)
  const [transitionMsg, setTransitionMsg] = useState("Cargando...")

  // ← NUEVO: incluye active y role
  const fetchProfile = async (userId) => {
    setProfileLoading(true)
    try {
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, active, role')
        .eq('id', userId)
        .maybeSingle()
      setProfile(data)
    } finally {
      setProfileLoading(false)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) fetchProfile(session.user.id)
        else setProfile(null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    setTransitionMsg("Iniciando sesión...")
    setTransitioning(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      await new Promise(r => setTimeout(r, 600))
      return data
    } finally {
      setTransitioning(false)
    }
  }

  const signUp = async (email, password, firstName, lastName) => {
    setTransitionMsg("Creando cuenta...")
    setTransitioning(true)
    try {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      if (data.user) {
        await supabase.from('profiles').insert({
          id:         data.user.id,
          first_name: firstName,
          last_name:  lastName,
          // active queda en false por el DEFAULT que cambiamos en SQL
        })
      }
      await new Promise(r => setTimeout(r, 600))
      return data
    } finally {
      setTransitioning(false)
    }
  }

  const signOut = async () => {
    setTransitionMsg("Cerrando sesión...")
    setTransitioning(true)
    await new Promise(r => setTimeout(r, 500))
    await supabase.auth.signOut()
    setProfile(null)
    await new Promise(r => setTimeout(r, 300))
    setTransitioning(false)
  }

  const withTransition = async (msg, fn) => {
    setTransitionMsg(msg)
    setTransitioning(true)
    try {
      await fn()
      await new Promise(r => setTimeout(r, 400))
    } finally {
      setTransitioning(false)
    }
  }

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  const fullName = profile
    ? `${profile.first_name} ${profile.last_name}`
    : user?.email?.split('@')[0] ?? ''

  const sendPasswordReset = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  }  

  return (
    <AuthContext.Provider value={{
      user, profile, fullName, loading, profileLoading,
      transitioning, transitionMsg,
      signIn, signUp, signOut, getToken, withTransition,
      sendPasswordReset,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}