import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

const statusColors = {
  available: 'bg-blue-100 text-blue-700',
  claimed: 'bg-yellow-100 text-yellow-700',
  delivered: 'bg-green-100 text-green-700',
  expired: 'bg-red-100 text-red-700',
}

export default function Donations() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadDonations()
  }, [])

  async function loadDonations() {
    setLoading(true)
    const { data } = await supabase
      .from('food_items')
      .select('*, profiles:donor_id(full_name, organization_name)')
      .order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  const filteredItems = filter === 'all' ? items : items.filter((i) => i.status === filter)

  return (
    <div>
      <h1 className="text-2xl font-bold text-eco-green mb-4">All Donations</h1>

      <div className="flex gap-2 mb-4">
        {['all', 'available', 'claimed', 'delivered', 'expired'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
              filter === f ? 'bg-eco-green text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading && <p className="text-gray-400">Loading...</p>}

      <div className="space-y-2">
        {filteredItems.map((item) => (
          <div key={item.id} className="bg-white p-3 rounded-lg shadow flex gap-3 items-center">
            <img src={item.image_url} alt="" className="w-14 h-14 object-cover rounded" />
            <div className="flex-1">
              <p className="font-medium">{item.food_name} — {item.quantity_kg}kg</p>
              <p className="text-sm text-gray-500">
                Donor: {item.profiles?.organization_name || item.profiles?.full_name}
              </p>
              <p className="text-xs text-gray-400">{new Date(item.created_at).toLocaleString()}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[item.status] || 'bg-gray-100'}`}>
              {item.status}
            </span>
          </div>
        ))}
        {!loading && filteredItems.length === 0 && <p className="text-gray-400">Koi donation nahi mili.</p>}
      </div>
    </div>
  )
}
