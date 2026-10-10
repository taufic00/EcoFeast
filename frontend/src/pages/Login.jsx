import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetMessage, setResetMessage] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    navigate('/dashboard')
  }

  async function handleForgotPassword(e) {
    e.preventDefault()
    setResetMessage('')
    setResetLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setResetLoading(false)

    if (error) {
      setResetMessage('Error: ' + error.message)
      return
    }

    setResetMessage('✅ Reset link tumhare email par bhej diya hai. Inbox (aur spam folder) check karo.')
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow">
      <h1 className="text-2xl font-bold text-eco-green mb-4">EcoFeast Login</h1>
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input className="w-full border rounded p-2" type="email" placeholder="Email"
          value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full border rounded p-2" type="password" placeholder="Password"
          value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button disabled={loading} type="submit"
          className="w-full bg-eco-green text-white rounded p-2 font-semibold disabled:opacity-50">
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <button type="button" onClick={() => setShowForgotPassword((v) => !v)}
        className="text-sm text-eco-green underline mt-3 block mx-auto">
        Forgot Password?
      </button>

      {showForgotPassword && (
        <form onSubmit={handleForgotPassword} className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
          <p className="text-sm text-gray-600">Apna email daalo, hum reset link bhej denge.</p>
          <input className="w-full border rounded p-2" type="email" placeholder="Email"
            value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required />
          {resetMessage && <p className="text-sm">{resetMessage}</p>}
          <button disabled={resetLoading} type="submit"
            className="w-full bg-gray-700 text-white rounded p-2 text-sm font-medium disabled:opacity-50">
            {resetLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
      )}

      <p className="text-sm mt-4 text-center">
        No account? <Link to="/register" className="text-eco-green underline">Register</Link>
      </p>
    </div>
  )
}
