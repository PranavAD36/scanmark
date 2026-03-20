import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { api, setApiAuthToken } from '../lib/api.js'

const AuthContext = createContext(null)

function getDefaultPath(role) {
  if (role === 'admin') return '/admin'
  if (role === 'faculty') return '/faculty'
  if (role === 'student') return '/student'
  return '/login'
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = async () => {
    const { data } = await supabase.auth.getSession()
    const nextSession = data?.session || null
    setSession(nextSession)
    setApiAuthToken(nextSession?.access_token || null)

    if (!nextSession) {
      setProfile(null)
      return
    }

    const me = await api.get('/auth/me')
    setProfile(me.data)
    return me.data
  }

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        await refreshProfile()
      } catch (error) {
        if (mounted) {
          console.error(error)
          setProfile(null)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    init()

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        setSession(nextSession)
        setApiAuthToken(nextSession?.access_token || null)
        if (!nextSession) {
          setProfile(null)
          return
        }
        try {
          const me = await api.get('/auth/me')
          setProfile(me.data)
        } catch (error) {
          console.error(error)
          setProfile(null)
        }
      },
    )

    return () => {
      mounted = false
      subscription?.subscription?.unsubscribe?.()
    }
  }, [])

  const value = useMemo(() => {
    return {
      loading,
      session,
      user: session?.user || null,
      role: profile?.role || null,
      profile,
      getDefaultPath,
      refreshProfile,
      signOut: async () => {
        await supabase.auth.signOut()
        setSession(null)
        setApiAuthToken(null)
        setProfile(null)
      },
    }
  }, [loading, session, profile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
