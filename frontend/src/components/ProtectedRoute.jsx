import { Navigate, Outlet } from 'react-router-dom'
import useAuthStore from '../store/authStore'

export default function ProtectedRoute({ requiredRole }) {
  const { token, role } = useAuthStore()

  // Not logged in at all
  if (!token) {
    return <Navigate to="/login" replace />
  }

  // Logged in but wrong role
  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
