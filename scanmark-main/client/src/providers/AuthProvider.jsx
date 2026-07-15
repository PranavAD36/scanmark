import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { api, setApiAuthToken } from '../lib/api.js'

const AuthContext = createContext(null)

const PROFILE_CACHE_KEY = 'scanmark.profileCache.v1'

function readProfileCache(authUserId) {
  if (!authUserId) return null
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY)
    if (!raw) return null
    const obj = JSON.parse(raw)
    const cached = obj && obj[authUserId]
    return cached || null
  } catch {
    return null
  }
}

function writeProfileCache(authUserId, profile) {
  if (!authUserId || !profile) return
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY)
    const obj = raw ? JSON.parse(raw) : {}
    obj[authUserId] = profile
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(obj))
  } catch {
    // ignore
  }
}

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

  // Dedup concurrent /auth/me fetches
  const profileFetchRef = { current: null }

  const refreshProfile = async () => {
    const { data } = await supabase.auth.getSession()
    const nextSession = data?.session || null
    setSession(nextSession)
    setApiAuthToken(nextSession?.access_token || null)

    if (!nextSession) {
      setProfile(null)
      return
    }

    const cached = readProfileCache(nextSession.user?.id)
    if (cached) setProfile((prev) => prev || cached)

    // Reuse in-flight request if one is already pending
    if (!profileFetchRef.current) {
      profileFetchRef.current = api.get('/auth/me').finally(() => {
        profileFetchRef.current = null
      })
    }

    try {
      const me = await profileFetchRef.current
      setProfile(me.data)
      writeProfileCache(nextSession.user?.id, me.data)
      return me.data
    } catch (error) {
      console.error(error)
      if (cached) return cached
      return null
    }
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
        // Let the ResetPasswordPage handle recovery — don't fetch profile.
        if (_event === 'PASSWORD_RECOVERY') return
        // Avoid interfering with recovery when a SIGNED_IN fires from code exchange
        // on the reset-password page.
        if (
          _event === 'SIGNED_IN' &&
          window.location.pathname === '/reset-password'
        ) return

        setSession(nextSession)
        setApiAuthToken(nextSession?.access_token || null)
        if (!nextSession) {
          setProfile(null)
          return
        }

        const cached = readProfileCache(nextSession.user?.id)
        if (cached) setProfile((prev) => prev || cached)

        // Reuse in-flight request if refreshProfile() was already called
        if (!profileFetchRef.current) {
          profileFetchRef.current = api.get('/auth/me').finally(() => {
            profileFetchRef.current = null
          })
        }

        try {
          const me = await profileFetchRef.current
          setProfile(me.data)
          writeProfileCache(nextSession.user?.id, me.data)
        } catch (error) {
          console.error(error)
          if (!cached) setProfile(null)
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
