import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('Dono password same nahi hain')
      return
    }
    if (newPassword.length < 6) {
      setError('Password kam se kam 6 characters ka hona chahiye')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setMessage('✅ Password successfully change ho gaya! Login page par ja rahe hain...')
    setTimeout(() => navigate('/login'), 2000)
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow">
      <h1 className="text-2xl font-bold text-eco-green mb-4">Set New Password</h1>
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      {message && <p className="text-green-600 text-sm mb-3">{message}</p>}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input className="w-full border rounded p-2" type="password" placeholder="New Password"
          value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
        <input className="w-full border rounded p-2" type="password" placeholder="Confirm New Password"
          value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
        <button disabled={loading} type="submit"
          className="w-full bg-eco-green text-white rounded p-2 font-semibold disabled:opacity-50">
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  )
}
