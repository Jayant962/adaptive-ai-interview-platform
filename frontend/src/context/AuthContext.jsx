import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { useUser, useAuth as useClerkAuth, useSession, useClerk } from '../clerk-bridge'
import { syncUser } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const { user, isLoaded, isSignedIn } = useUser()
  const { getToken } = useClerkAuth()
  const { session } = useSession()
  const { signOut } = useClerk()
  const [dbUser, setDbUser] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [syncComplete, setSyncComplete] = useState(false)
  const hasSyncedRef = useRef(false)

  // Reset sync state when user logs out
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setDbUser(null)
      setSyncComplete(false)
      hasSyncedRef.current = false
    }
  }, [isLoaded, isSignedIn])

  // Force re-login if session age exceeds 48 hours
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !session) return

    const checkSessionAge = async () => {
      const createdAt = session.createdAt
      if (!createdAt) return

      const sessionAgeHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60)
      if (sessionAgeHours >= 48) {
        console.warn(`Session age is ${sessionAgeHours.toFixed(1)} hours (exceeds 48 hours). Requiring re-login...`)
        try {
          await signOut()
          window.location.href = '/login?expired=true'
        } catch (err) {
          console.error('Failed to sign out expired session:', err)
        }
      }
    }

    checkSessionAge()
  }, [isLoaded, isSignedIn, session, signOut])

  // Sync Clerk user to our database whenever they sign in
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return

    const sync = async () => {
      if (hasSyncedRef.current) return
      hasSyncedRef.current = true
      setSyncing(true)
      const isSignupFlow = window.location.pathname === '/signup' || sessionStorage.getItem('is_signup_flow') === 'true'
      try {
        const userData = {
          clerk_user_id: user.id,
          name: user.fullName || user.firstName || 'User',
          email: user.primaryEmailAddress?.emailAddress || '',
          profile_image: user.imageUrl || null,
          is_signup: isSignupFlow,
        }
        const result = await syncUser(userData)
        setDbUser(result)

        if (!result.is_new_user && isSignupFlow) {
          sessionStorage.removeItem('is_signup_flow')
          try {
            await signOut()
          } catch (e) {
            console.error('Failed to sign out existing user:', e)
          }
          window.location.href = '/login?already_registered=true'
        } else {
          sessionStorage.removeItem('is_signup_flow')
        }
      } catch (err) {
        console.error('User sync failed:', err)
        if (isSignupFlow) {
          sessionStorage.removeItem('is_signup_flow')
          try {
            await signOut()
          } catch (e) {
            console.error('Failed to sign out on sync error:', e)
          }
          window.location.href = '/login?already_registered=true'
        }
      } finally {
        setSyncing(false)
        setSyncComplete(true)
      }
    }

    sync()
  }, [isLoaded, isSignedIn, user?.id])

  // Helper to get Clerk JWT token
  const getAuthToken = async () => {
    try {
      return await getToken()
    } catch {
      return null
    }
  }

  const value = {
    user,           // Clerk user
    dbUser,         // Our DB user
    isLoaded,
    isSignedIn,
    syncing,
    syncComplete,   // True once first backend sync has completed
    getAuthToken,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider')
  return ctx
}
