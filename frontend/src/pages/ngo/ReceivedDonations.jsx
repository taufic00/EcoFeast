import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'

// Ye un saare food items ki list hai jo NGO ne successfully pickup kar liye hain
// (claims.status = 'picked_up'). Ye "Received Donations" ka record hai.
export default function ReceivedDonations() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadReceived()
  }, [user])

  async function loadReceived() {
    setLoading(true)
    const { data } = await supabase
      .from('claims')
      .select('*, food_items(food_name, quantity_kg, image_url)')
      .eq('ngo_id', user.id)
      .eq('status', 'picked_up')
      .order('created_at', { ascending: false })

    setItems(data || [])
    setLoading(false)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-eco-green mb-4">Received Donations</h1>
      {loading && <p className="text-gray-400">Loading...</p>}

      <div className="space-y-3">
        {items.map((claim) => (
          <div key={claim.id} className="bg-white p-4 rounded-lg shadow flex gap-3 items-center">
            <img src={claim.food_items?.image_url} alt="" className="w-16 h-16 object-cover rounded" />
            <div className="flex-1">
              <p className="font-medium">{claim.food_items?.food_name} — {claim.food_items?.quantity_kg}kg</p>
              <p className="text-sm text-gray-500">Received on: {new Date(claim.created_at).toLocaleDateString()}</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-700">Received</span>
          </div>
        ))}
        {!loading && items.length === 0 && <p className="text-gray-400">Abhi tak koi donation receive nahi hui.</p>}
      </div>
    </div>
  )
}
