import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'

export default function AdminHome() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ users: 0, donations: 0, pendingVerification: 0 })

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    const { data: profiles } = await supabase.from('profiles').select('id, is_verified, role')
    const { data: items } = await supabase.from('food_items').select('id')

    const pendingVerification = profiles?.filter((p) => !p.is_verified && p.role !== 'admin').length || 0

    setStats({
      users: profiles?.length || 0,
      donations: items?.length || 0,
      pendingVerification,
    })
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-eco-green mb-1">Welcome, {profile?.full_name}</h1>
      <p className="text-gray-500 mb-6">Platform overview</p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow text-center">
          <p className="text-3xl font-bold text-eco-green">{stats.users}</p>
          <p className="text-sm text-gray-500">Total Users</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow text-center">
          <p className="text-3xl font-bold text-blue-600">{stats.donations}</p>
          <p className="text-sm text-gray-500">Total Donations</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow text-center">
          <p className="text-3xl font-bold text-red-500">{stats.pendingVerification}</p>
          <p className="text-sm text-gray-500">Pending Verification</p>
        </div>
      </div>

      <Link to="/dashboard/verification" className="inline-block bg-eco-green text-white px-4 py-2 rounded font-medium">
        Review Pending Verifications
      </Link>
    </div>
  )
}
