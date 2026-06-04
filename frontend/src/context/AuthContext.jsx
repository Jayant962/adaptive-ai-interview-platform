import React, { createContext, useContext, useEffect, useState } from 'react'
import { useUser, useAuth as useClerkAuth } from '../clerk-bridge'
import { syncUser } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const { user, isLoaded, isSignedIn } = useUser()
  const { getToken } = useClerkAuth()
  const [dbUser, setDbUser] = useState(null)
  const [syncing, setSyncing] = useState(false)

  // Sync Clerk user to our database whenever they sign in
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return

    const sync = async () => {
      setSyncing(true)
      try {
        const userData = {
          clerk_user_id: user.id,
          name: user.fullName || user.firstName || 'User',
          email: user.primaryEmailAddress?.emailAddress || '',
          profile_image: user.imageUrl || null,
        }
        const result = await syncUser(userData)
        setDbUser(result)
      } catch (err) {
        console.error('User sync failed:', err)
      } finally {
        setSyncing(false)
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
