import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import ResetPassword from './pages/ResetPassword'

// Login zaroori hai jo pages ke liye
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <p className="text-center mt-10">Loading...</p>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function Home() {
  return (
    <div className="text-center mt-20">
      <h1 className="text-4xl font-bold text-eco-green mb-2">🌱 EcoFeast</h1>
      <p className="text-gray-500 text-lg">The Intelligent Ecosystem for Food Waste Reduction</p>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
