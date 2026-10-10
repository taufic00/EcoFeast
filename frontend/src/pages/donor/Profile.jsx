import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'

export default function Profile() {
  const { profile, refreshProfile } = useAuth()
  const [form, setForm] = useState({
    fullName: '', organizationName: '', phone: '', address: '', latitude: '', longitude: ''
  })
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      setForm({
        fullName: profile.full_name || '',
        organizationName: profile.organization_name || '',
        phone: profile.phone || '',
        address: profile.address || '',
        latitude: profile.latitude || '',
        longitude: profile.longitude || '',
      })
    }
  }, [profile])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function useMyLocation() {
    navigator.geolocation.getCurrentPosition((pos) => {
      update('latitude', pos.coords.latitude)
      update('longitude', pos.coords.longitude)
    })
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const { error } = await supabase.from('profiles').update({
      full_name: form.fullName,
      organization_name: form.organizationName,
      phone: form.phone,
      address: form.address,
      latitude: parseFloat(form.latitude) || null,
      longitude: parseFloat(form.longitude) || null,
    }).eq('id', profile.id)

    setSaving(false)

    if (error) {
      setMessage('Error: ' + error.message)
      return
    }

    setMessage('✅ Profile update ho gaya')
    refreshProfile()
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold text-eco-green mb-4">My Profile</h1>
      <form onSubmit={handleSave} className="bg-white p-5 rounded-xl shadow space-y-3">
        {message && <p className="text-sm p-2 bg-gray-50 rounded">{message}</p>}

        <input className="w-full border rounded p-2" placeholder="Full Name"
          value={form.fullName} onChange={(e) => update('fullName', e.target.value)} required />

        <input className="w-full border rounded p-2" placeholder="Organization Name"
          value={form.organizationName} onChange={(e) => update('organizationName', e.target.value)} />

        <input className="w-full border rounded p-2" placeholder="Phone"
          value={form.phone} onChange={(e) => update('phone', e.target.value)} />

        <input className="w-full border rounded p-2" placeholder="Address"
          value={form.address} onChange={(e) => update('address', e.target.value)} />

        <button type="button" onClick={useMyLocation} className="text-sm text-eco-green underline">
          📍 Update my current location
        </button>
        <div className="grid grid-cols-2 gap-2">
          <input className="border rounded p-2" placeholder="Latitude" value={form.latitude}
            onChange={(e) => update('latitude', e.target.value)} />
          <input className="border rounded p-2" placeholder="Longitude" value={form.longitude}
            onChange={(e) => update('longitude', e.target.value)} />
        </div>

        <button disabled={saving} type="submit"
          className="w-full bg-eco-green text-white rounded p-2 font-semibold disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
