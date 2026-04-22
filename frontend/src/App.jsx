import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import AdminLayout from './pages/admin/AdminLayout.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminTourists from './pages/admin/AdminTourists.jsx'
import AdminAlerts from './pages/admin/AdminAlerts.jsx'
import AdminZones from './pages/admin/AdminZones.jsx'
import AdminZoneDetail from './pages/admin/AdminZoneDetail.jsx'
import AdminHotspots from './pages/admin/AdminHotspots.jsx'
import AdminCreateTourist from './pages/admin/AdminCreateTourist.jsx'
import AdminTouristDetail from './pages/admin/AdminTouristDetail.jsx'
import UserLayout from './pages/user/UserLayout.jsx'
import UserHome from './pages/user/UserHome.jsx'
import UserMap from './pages/user/UserMap.jsx'
import UserExplore from './pages/user/UserExplore.jsx'
import UserProfile from './pages/user/UserProfile.jsx'
import UserAlerts from './pages/user/UserAlerts.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Admin routes — ADMIN role only */}
      <Route element={<ProtectedRoute requiredRole="ADMIN" />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="tourists"  element={<AdminTourists />} />
          <Route path="alerts"    element={<AdminAlerts />} />
          <Route path="zones"        element={<AdminZones />} />
          <Route path="zones/:id"    element={<AdminZoneDetail />} />
          <Route path="hotspots"  element={<AdminHotspots />} />
          <Route path="create-tourist"       element={<AdminCreateTourist />} />
          <Route path="tourists/:touristId"  element={<AdminTouristDetail />} />
        </Route>
      </Route>

      {/* User routes — USER role only */}
      <Route element={<ProtectedRoute requiredRole="USER" />}>
        <Route path="/user" element={<UserLayout />}>
          <Route index element={<Navigate to="/user/home" replace />} />
          <Route path="home"    element={<UserHome />} />
          <Route path="map"     element={<UserMap />} />
          <Route path="explore" element={<UserExplore />} />
          <Route path="profile" element={<UserProfile />} />
          <Route path="alerts"  element={<UserAlerts />} />
        </Route>
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}