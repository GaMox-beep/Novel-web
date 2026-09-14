import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

interface ProtectedRouteProps {
  redirectPath?: string
}

// Helper to verify JWT role and expiration safely from client
const isTokenValidAdmin = (token: string | null): boolean => {
  if (!token) return false
  try {
    const payloadBase64 = token.split('.')[1]
    if (!payloadBase64) return false
    const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(payloadJson)

    // Check role in JWT payload
    if (payload.role !== 'ADMIN') return false

    // Check expiry if timestamp is present
    if (payload.exp && Date.now() >= payload.exp * 1000) return false

    return true
  } catch {
    return false
  }
}

export const ProtectedRoute = ({ redirectPath = '/' }: ProtectedRouteProps) => {
  const { user, isAuthenticated, accessToken, isLoadingUser } = useAuth()

  if (accessToken && isLoadingUser) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--border-color)] border-t-[var(--accent-gold)]" />
      </div>
    )
  }

  const isAdmin = isAuthenticated && user?.role === 'ADMIN' && isTokenValidAdmin(accessToken)

  if (!isAdmin) {
    return <Navigate to={redirectPath} replace />
  }

  return <Outlet />
}

export default ProtectedRoute
