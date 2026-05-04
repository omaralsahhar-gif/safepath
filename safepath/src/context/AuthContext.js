import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase, getProfile } from '../lib/supabase'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const loadingTimeout = useRef(null)

  const startLoadingTimeout = () => {
    clearTimeout(loadingTimeout.current)
    loadingTimeout.current = setTimeout(() => {
      setLoading(false)
    }, 5000)
  }

  const stopLoadingTimeout = () => {
    clearTimeout(loadingTimeout.current)
  }

  useEffect(() => {
    startLoadingTimeout()

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setLoading(false)
        stopLoadingTimeout()
        return
      }
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setLoading(false)
        stopLoadingTimeout()
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'TOKEN_REFRESHED' && !session) {
        setUser(null); setProfile(null); setLoading(false); stopLoadingTimeout(); return
      }
      if (event === 'SIGNED_OUT') {
        setUser(null); setProfile(null); setLoading(false); stopLoadingTimeout(); return
      }
      setUser(session?.user ?? null)
      if (session?.user) {
        await loadProfile(session.user.id)
      } else {
        setProfile(null); setLoading(false); stopLoadingTimeout()
      }
    })

    return () => { subscription.unsubscribe(); stopLoadingTimeout() }
  }, [])

  const loadProfile = async (userId) => {
    try {
      const { data, error } = await getProfile(userId)
      if (error) throw error
      setProfile(data)
    } catch (err) {
      setProfile(null)
    } finally {
      setLoading(false)
      stopLoadingTimeout()
    }
  }

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
