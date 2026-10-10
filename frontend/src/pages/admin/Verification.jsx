import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function Verification() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadUnverified()
  }, [])

  async function loadUnverified() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['donor', 'ngo'])
      .eq('is_verified', false)
      .order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  async function verifyUser(id) {
    const { error } = await supabase.from('profiles').update({ is_verified: true }).eq('id', id)
    if (error) {
      setMessage('❌ Verify karne me error: ' + error.message)
      return
    }
    setMessage('✅ User verify ho gaya.')
    loadUnverified()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-eco-green mb-4">Pending Verification</h1>
      {message && <p className="text-sm p-2 bg-green-50 rounded mb-3">{message}</p>}
      {loading && <p className="text-gray-400">Loading...</p>}

      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="bg-white p-3 rounded-lg shadow flex justify-between items-center">
            <div>
              <p className="font-medium">{u.organization_name || u.full_name} <span className="text-xs text-gray-400 capitalize">({u.role})</span></p>
              <p className="text-sm text-gray-500">{u.phone} | {u.address}</p>
            </div>
            <button
              onClick={() => verifyUser(u.id)}
              className="bg-eco-green text-white px-3 py-1.5 rounded text-sm font-medium"
            >
              Verify
            </button>
          </div>
        ))}
        {!loading && users.length === 0 && <p className="text-gray-400">Sab verify ho chuke hain — koi pending nahi hai.</p>}
      </div>
    </div>
  )
}
