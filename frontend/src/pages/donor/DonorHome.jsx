import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'

export default function DonorHome() {
  const { user, profile } = useAuth()
  const [stats, setStats] = useState({ total: 0, active: 0, delivered: 0, pendingRequests: 0 })

  useEffect(() => {
    if (user) loadStats()
  }, [user])

  async function loadStats() {
    const { data: items } = await supabase.from('food_items').select('status').eq('donor_id', user.id)
    const { data: requests } = await supabase
      .from('claims')
      .select('id, food_items!inner(donor_id)')
      .eq('food_items.donor_id', user.id)
      .eq('status', 'pending')

    const total = items?.length || 0
    const active = items?.filter((i) => i.status === 'claimed' || i.status === 'available').length || 0
    const delivered = items?.filter((i) => i.status === 'delivered').length || 0

    setStats({ total, active, delivered, pendingRequests: requests?.length || 0 })
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-eco-green mb-1">Welcome, {profile?.full_name}</h1>
      <p className="text-gray-500 mb-6">Yahan tumhara donation summary hai</p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-3xl font-bold text-eco-green">{stats.total}</p>
          <p className="text-sm text-gray-500">Total Donations</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-3xl font-bold text-yellow-600">{stats.active}</p>
          <p className="text-sm text-gray-500">Active</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-3xl font-bold text-green-600">{stats.delivered}</p>
          <p className="text-sm text-gray-500">Delivered</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-3xl font-bold text-red-500">{stats.pendingRequests}</p>
          <p className="text-sm text-gray-500">Pending Pickup Requests</p>
        </div>
      </div>

      <Link to="/dashboard/donate" className="inline-block bg-eco-green text-white px-4 py-2 rounded font-medium">
        + Donate New Food
      </Link>
    </div>
  )
}
