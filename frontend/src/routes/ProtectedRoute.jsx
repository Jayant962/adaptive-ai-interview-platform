import { useUser } from '../clerk-bridge'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'

function FullPageSpinner({ message = 'Loading...' }) {
  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">{message}</p>
      </div>
    </div>
  )
}

export default function ProtectedRoute({ children }) {
  const { isLoaded, isSignedIn } = useUser()
  const { syncing, syncComplete } = useAuthContext()
  const location = useLocation()

  // Clerk SDK still initializing
  if (!isLoaded) {
    return <FullPageSpinner message="Loading..." />
  }

  // Not signed in → redirect to login
  if (!isSignedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Signed in but backend sync hasn't completed yet — show spinner.
  // This prevents the dashboard from briefly flashing when an existing user
  // tries to sign up (Clerk creates session → redirects here → we block until
  // our sync confirms they're legitimate, then redirect to login if not new).
  if (!syncComplete || syncing) {
    return <FullPageSpinner message="Verifying account..." />
  }

  return children
}

