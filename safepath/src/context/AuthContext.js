import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase, getProfile } from '../lib/supabase'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const timeoutRef = useRef(null)

  const clearTimer = () => clearTimeout(timeoutRef.current)

  const forceSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setLoading(false)
  }

  const loadProfile = async (userId) => {
    try {
      const { data, error } = await getProfile(userId)
      if (error || !data) {
        // Profile missing — this session is broken, sign out cleanly
        await forceSignOut()
        return
      }
      setProfile(data)
    } catch (err) {
      await forceSignOut()
    } finally {
      clearTimer()
      setLoading(false)
    }
  }

  useEffect(() => {
    // Hard 8 second timeout — if anything gets stuck, force sign out
    timeoutRef.current = setTimeout(() => {
      forceSignOut()
    }, 8000)

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error || !session) {
        setUser(null)
        setProfile(null)
        clearTimer()
        setLoading(false)
        return
      }
      setUser(session.user)
      loadProfile(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null)
        setProfile(null)
        clearTimer()
        setLoading(false)
        return
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setUser(session.user)
        await loadProfile(session.user.id)
      }
    })

    return () => {
      subscription.unsubscribe()
      clearTimer()
    }
  }, [])

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
