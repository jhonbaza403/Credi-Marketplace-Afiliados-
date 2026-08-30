'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { isValidRole, type UserRole } from '@/lib/auth/roles'

export interface Profile {
  id: string
  full_name?: string | null
  avatar_url?: string | null
  role: UserRole
  created_at?: string | null
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  isAdmin: boolean
  role: UserRole | null
  hasRole: (role: UserRole) => boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role, created_at')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Error loading profile:', error.message)
      setProfile(null)
      return
    }

    if (!data || !isValidRole(data.role)) {
      setProfile(null)
      return
    }

    setProfile({
      ...data,
      role: data.role,
    } as Profile)
  }

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    const initialize = async () => {
      try {
        const { data } = await supabase.auth.getUser()
        if (!mounted) return
        const currentUser = data.user ?? null
        setUser(currentUser)
        if (currentUser) await loadProfile(currentUser.id)
      } catch (error) {
        console.error('Authentication initialization failed:', error)
        if (mounted) {
          setUser(null)
          setProfile(null)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void initialize()

    const { data: authState } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        void loadProfile(currentUser.id)
      } else {
        setProfile(null)
      }
    })

    return () => {
      mounted = false
      authState.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextType>(() => {
    const role = profile?.role ?? null
    return {
      user,
      profile,
      loading,
      role,
      isAdmin: role === 'admin',
      hasRole: (requiredRole) => role === requiredRole,
      logout: async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        setUser(null)
        setProfile(null)
      },
    }
  }, [loading, profile, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
