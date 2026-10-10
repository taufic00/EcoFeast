import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

export default function Navbar() {
  const { user, profile, signOut } = useAuth()

  return (
    <nav className="bg-white shadow px-6 py-3 flex justify-between items-center">
      <Link to="/" className="text-xl font-bold text-eco-green">🌱 EcoFeast</Link>
      <div className="flex gap-4 items-center text-sm">
        {user ? (
          <>
            <Link to="/dashboard" className="text-gray-700">Dashboard</Link>
            <span className="text-gray-500">{profile?.full_name} ({profile?.role})</span>
            <button onClick={signOut} className="text-red-600">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-eco-green">Login</Link>
            <Link to="/register" className="text-eco-green">Register</Link>
          </>
        )}
      </div>
    </nav>
  )
}
