import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'

const statusColors = {
  available: 'bg-blue-100 text-blue-700',
  claimed: 'bg-yellow-100 text-yellow-700',
  delivered: 'bg-green-100 text-green-700',
  expired: 'bg-red-100 text-red-700',
}

export default function DonationListPage({ title, statusFilter }) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (user) loadItems()
  }, [user])

  async function loadItems() {
    setLoading(true)
    let query = supabase.from('food_items').select('*').eq('donor_id', user.id).order('created_at', { ascending: false })
    if (statusFilter) query = query.in('status', statusFilter)
    const { data } = await query
    setItems(data || [])
    setLoading(false)
  }

  async function deleteItem(item) {
    if (!window.confirm(`"${item.food_name}" ko delete karna hai? Ye undo nahi ho sakta.`)) return

    setMessage('')

    // Pehle is item par bani claims aur impact_log entries delete karo
    // (agar hain), taaki foreign key error na aaye - fir item delete karo
    await supabase.from('claims').delete().eq('food_item_id', item.id)
    await supabase.from('impact_log').delete().eq('food_item_id', item.id)

    const { error } = await supabase.from('food_items').delete().eq('id', item.id)

    if (error) {
      setMessage('❌ Delete karne me error: ' + error.message)
      return
    }

    setMessage('✅ Item delete ho gaya.')
    loadItems()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-eco-green mb-4">{title}</h1>
      {message && <p className="text-sm p-2 bg-gray-50 rounded mb-3">{message}</p>}
      {loading && <p className="text-gray-400">Loading...</p>}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="bg-white p-4 rounded-lg shadow flex gap-3 items-center">
            <img src={item.image_url} alt={item.food_name} className="w-16 h-16 object-cover rounded" />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium">{item.food_name} — {item.quantity_kg}kg</p>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[item.status] || 'bg-gray-100'}`}>
                  {item.status}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Freshness: {item.freshness_score}/100 | PRI: {item.placement_readiness_index}
              </p>
            </div>
            <button
              onClick={() => deleteItem(item)}
              className="text-red-500 border border-red-200 px-2 py-1 rounded text-xs shrink-0"
            >
              Delete
            </button>
          </div>
        ))}
        {!loading && items.length === 0 && <p className="text-gray-400">Yahan abhi kuch nahi hai.</p>}
      </div>
    </div>
  )
}
