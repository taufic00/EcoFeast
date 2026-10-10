import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '', password: '', fullName: '', role: 'donor',
    organizationName: '', phone: '', address: '', latitude: '', longitude: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function useMyLocation() {
    navigator.geolocation.getCurrentPosition((pos) => {
      update('latitude', pos.coords.latitude)
      update('longitude', pos.coords.longitude)
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      full_name: form.fullName,
      role: form.role,
      organization_name: form.organizationName || null,
      phone: form.phone,
      address: form.address,
      latitude: parseFloat(form.latitude) || null,
      longitude: parseFloat(form.longitude) || null,
    })

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    navigate('/login')
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow">
      <h1 className="text-2xl font-bold text-eco-green mb-4">EcoFeast Registration</h1>
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-3">
        <select className="w-full border rounded p-2" value={form.role} onChange={(e) => update('role', e.target.value)}>
          <option value="donor">Food Donor (Restaurant/Kitchen)</option>
          <option value="ngo">NGO / Charity</option>
          <option value="volunteer">Volunteer</option>
          <option value="admin">Admin (testing only)</option>
        </select>

        <input className="w-full border rounded p-2" placeholder="Full Name"
          value={form.fullName} onChange={(e) => update('fullName', e.target.value)} required />

        <input className="w-full border rounded p-2" placeholder="Organization Name (optional)"
          value={form.organizationName} onChange={(e) => update('organizationName', e.target.value)} />

        <input className="w-full border rounded p-2" type="email" placeholder="Email"
          value={form.email} onChange={(e) => update('email', e.target.value)} required />

        <input className="w-full border rounded p-2" type="password" placeholder="Password (min 6 chars)"
          value={form.password} onChange={(e) => update('password', e.target.value)} required minLength={6} />

        <input className="w-full border rounded p-2" placeholder="Phone"
          value={form.phone} onChange={(e) => update('phone', e.target.value)} />

        <input className="w-full border rounded p-2" placeholder="Address"
          value={form.address} onChange={(e) => update('address', e.target.value)} />

        <button type="button" onClick={useMyLocation} className="text-sm text-eco-green underline">
          📍 Use my current location
        </button>
        <div className="grid grid-cols-2 gap-2">
          <input className="border rounded p-2" placeholder="Latitude" value={form.latitude}
            onChange={(e) => update('latitude', e.target.value)} />
          <input className="border rounded p-2" placeholder="Longitude" value={form.longitude}
            onChange={(e) => update('longitude', e.target.value)} />
        </div>

        <button disabled={loading} type="submit"
          className="w-full bg-eco-green text-white rounded p-2 font-semibold disabled:opacity-50">
          {loading ? 'Creating account...' : 'Register'}
        </button>
      </form>

      <p className="text-sm mt-4 text-center">
        Already have an account? <Link to="/login" className="text-eco-green underline">Login</Link>
      </p>
    </div>
  )
}
