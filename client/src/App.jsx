import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Home from './pages/Home'
import SignInPage from './pages/SignIn'
import SignUpPage from './pages/SignUp'
import ProfilePage from './pages/Profile'
import RoomPage from './pages/Room'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Auth Routes */}
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />

      {/* Protected Routes inside Layout */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Home />} />
        <Route path="/profile/*" element={<ProfilePage />} />
      </Route>

      {/* Protected Routes without Layout (Fullscreen) */}
      <Route
        element={
          <ProtectedRoute>
            <Outlet />
          </ProtectedRoute>
        }
      >
        <Route path="/room/:roomCode" element={<RoomPage />} />
      </Route>
    </Routes>
  )
}
