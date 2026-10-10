import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { calculateDistance } from '../utils/matching'

const statusBadge = {
  available: { text: 'Available', color: 'bg-blue-100 text-blue-700' },
  claimed: { text: 'Unavailable — already claimed', color: 'bg-yellow-100 text-yellow-700' },
  delivered: { text: 'Unavailable — delivered', color: 'bg-gray-200 text-gray-600' },
  expired: { text: 'Unavailable — expired', color: 'bg-red-100 text-red-700' },
}

function getHiddenKey(userId) {
  return `ecofeast_hidden_food_${userId}`
}

export default function NGODashboard() {
  const { user, profile } = useAuth()
  const [items, setItems] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [requestingId, setRequestingId] = useState(null)

  useEffect(() => {
    if (user) loadFood()
  }, [user])

  async function loadFood() {
    setLoading(true)
    const { data: foodItems, error } = await supabase
      .from('food_items')
      .select('*, profiles:donor_id(full_name, organization_name, latitude, longitude, address)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Load food error:', error)
      setLoading(false)
      return
    }

    const withDistance = (foodItems || []).map((item) => {
      const distance = profile?.latitude && item.profiles?.latitude
        ? calculateDistance(profile.latitude, profile.longitude, item.profiles.latitude, item.profiles.longitude)
        : null
      return { ...item, distance }
    })

    const hidden = JSON.parse(localStorage.getItem(getHiddenKey(user.id)) || '[]')
    setItems(withDistance.filter((i) => !hidden.includes(i.id)))
    setLoading(false)
  }

  function hideItem(itemId) {
    const key = getHiddenKey(user.id)
    const hidden = JSON.parse(localStorage.getItem(key) || '[]')
    hidden.push(itemId)
    localStorage.setItem(key, JSON.stringify(hidden))
    setItems((prev) => prev.filter((i) => i.id !== itemId))
  }

  async function claimItem(item) {
    setRequestingId(item.id)
    setMessage('')

    const { error: claimError } = await supabase.from('claims').insert({
      food_item_id: item.id,
      ngo_id: user.id,
      distance_km: item.distance,
      status: 'pending',
    })

    if (claimError) {
      setMessage(`❌ "${item.food_name}" ke liye request fail hui: ${claimError.message}`)
      setRequestingId(null)
      return
    }

    const { error: updateError } = await supabase
      .from('food_items')
      .update({ status: 'claimed' })
      .eq('id', item.id)

    if (updateError) {
      setMessage(`❌ Item status update fail hua: ${updateError.message}`)
      setRequestingId(null)
      return
    }

    setMessage(`✅ "${item.food_name}" ke liye pickup request bhej di. "My Requests" tab me status dikhega.`)
    setRequestingId(null)
    loadFood()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-eco-green mb-1">Welcome, {profile?.organization_name || profile?.full_name}</h1>
      <p className="text-gray-500 mb-6">Saare food items — available aur unavailable dono</p>

      {message && <p className="text-sm p-2 bg-green-50 rounded mb-4">{message}</p>}
      {loading && <p className="text-gray-400 mb-4">Loading...</p>}

      <div className="space-y-3">
        {items.map((item) => {
          const badge = statusBadge[item.status] || { text: item.status, color: 'bg-gray-100' }
          const isAvailable = item.status === 'available'
          return (
            <div key={item.id} className="bg-white p-4 rounded-lg shadow flex gap-3 items-center">
              <img src={item.image_url} alt={item.food_name} className="w-16 h-16 object-cover rounded" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="font-medium">{item.food_name} — {item.quantity_kg}kg</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.color}`}>{badge.text}</span>
                </div>
                <p className="text-sm text-gray-500">
                  From: {item.profiles?.organization_name || item.profiles?.full_name}
                </p>
                <p className="text-sm text-gray-500">
                  Freshness: {item.freshness_score}/100 | PRI: {item.placement_readiness_index}
                  {item.distance !== null && ` | ${item.distance} km away`}
                </p>
              </div>
              <div className="flex flex-col gap-1 items-end">
                {isAvailable && (
                  <button
                    onClick={() => claimItem(item)}
                    disabled={requestingId === item.id}
                    className="bg-eco-green text-white px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50"
                  >
                    {requestingId === item.id ? 'Sending...' : 'Request Pickup'}
                  </button>
                )}
                <button
                  onClick={() => hideItem(item.id)}
                  className="text-red-500 border border-red-200 px-2 py-1 rounded text-xs"
                  title="Apni list se hide karo"
                >
                  Delete
                </button>
              </div>
            </div>
          )
        })}
        {!loading && items.length === 0 && <p className="text-gray-400">Abhi koi food list nahi hua kisi donor ne.</p>}
      </div>
    </div>
  )
}
