import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { calculateDistance } from '../utils/matching'
import { CATEGORIES, categoryLabel } from '../utils/categories'

const statusBadge = {
  available: { text: 'Available', color: 'bg-blue-100 text-blue-700' },
  claimed: { text: 'Unavailable: already claimed', color: 'bg-yellow-100 text-yellow-700' },
  delivered: { text: 'Unavailable: delivered', color: 'bg-gray-200 text-gray-600' },
  expired: { text: 'Unavailable: expired', color: 'bg-red-100 text-red-700' },
}

function getHiddenKey(userId) {
  return `ecofeast_hidden_food_${userId}`
}

export default function NGODashboard() {
  const { user, profile } = useAuth()
  const [items, setItems] = useState([])
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [requestingId, setRequestingId] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (user) loadItems()
  }, [user])

  async function loadItems() {
    setLoading(true)
    const { data: foodItems, error } = await supabase
      .from('food_items')
      .select('*, profiles:donor_id(full_name, organization_name, latitude, longitude, address)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to load donations:', error)
      setMessage({ type: 'error', text: 'Unable to load donations. Please refresh the page and try again.' })
      setLoading(false)
      return
    }

    const withDistance = (foodItems || []).map((item) => {
      const distance =
        profile?.latitude && item.profiles?.latitude
          ? Math.round(
              calculateDistance(profile.latitude, profile.longitude, item.profiles.latitude, item.profiles.longitude) * 10
            ) / 10
          : null
      return { ...item, distance }
    })

    const hidden = JSON.parse(localStorage.getItem(getHiddenKey(user.id)) || '[]')
    setItems(withDistance.filter((i) => !hidden.includes(i.id)))
    setLoading(false)
  }

  // Hides the item from this NGO's own view only. The donor's data is not changed.
  function hideItem(itemId) {
    const key = getHiddenKey(user.id)
    const hidden = JSON.parse(localStorage.getItem(key) || '[]')
    hidden.push(itemId)
    localStorage.setItem(key, JSON.stringify(hidden))
    setItems((prev) => prev.filter((i) => i.id !== itemId))
  }

  async function claimItem(item) {
    setRequestingId(item.id)
    setMessage(null)

    const { error: claimError } = await supabase.from('claims').insert({
      food_item_id: item.id,
      ngo_id: user.id,
      distance_km: item.distance,
      status: 'pending',
    })

    if (claimError) {
      console.error('Claim failed:', claimError)
      setMessage({ type: 'error', text: `The pickup request for "${item.food_name}" could not be sent: ${claimError.message}` })
      setRequestingId(null)
      return
    }

    const { error: updateError } = await supabase.from('food_items').update({ status: 'claimed' }).eq('id', item.id)

    if (updateError) {
      console.error('Status update failed:', updateError)
      setMessage({ type: 'error', text: `The donation status could not be updated: ${updateError.message}` })
      setRequestingId(null)
      return
    }

    setMessage({
      type: 'success',
      text: `Pickup request sent for "${item.food_name}". Track its status under My Pickup Requests.`,
    })
    setRequestingId(null)
    loadItems()
  }

  const counts = items.reduce((acc, i) => {
    const c = i.category || 'food'
    acc[c] = (acc[c] || 0) + 1
    return acc
  }, {})

  const visibleItems = items.filter((i) => {
    const matchesCategory = categoryFilter === 'all' || (i.category || 'food') === categoryFilter
    const matchesSearch = !search.trim() || i.food_name.toLowerCase().includes(search.trim().toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-eco-green mb-1">
        Welcome, {profile?.organization_name || profile?.full_name}
      </h1>
      <p className="text-gray-500 mb-4">All donations on the platform, available and unavailable.</p>

      <div className="flex gap-2 flex-wrap mb-3">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`px-3 py-1 rounded-full text-sm border ${categoryFilter === 'all' ? 'bg-eco-green text-white border-eco-green' : 'text-gray-600'}`}
        >
          All ({items.length})
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategoryFilter(c.value)}
            className={`px-3 py-1 rounded-full text-sm border ${categoryFilter === c.value ? 'bg-eco-green text-white border-eco-green' : 'text-gray-600'}`}
          >
            {c.label} ({counts[c.value] || 0})
          </button>
        ))}
      </div>

      <input
        className="w-full border rounded p-2 mb-4"
        placeholder="Search by item name"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {message && (
        <p className={`text-sm p-2 rounded mb-4 ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message.text}
        </p>
      )}
      {loading && <p className="text-gray-400 mb-4">Loading donations...</p>}

      <div className="space-y-3">
        {visibleItems.map((item) => {
          const badge = statusBadge[item.status] || { text: item.status, color: 'bg-gray-100' }
          const isAvailable = item.status === 'available'
          const isFood = (item.category || 'food') === 'food'
          return (
            <div key={item.id} className="bg-white p-4 rounded-lg shadow flex gap-3 items-center">
              <img src={item.image_url} alt={item.food_name} className="w-16 h-16 object-cover rounded" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="font-medium">
                    {item.food_name}: {item.quantity_kg} {item.unit || 'kg'}
                  </p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {categoryLabel(item.category || 'food')}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.color}`}>{badge.text}</span>
                </div>
                <p className="text-sm text-gray-500">
                  Donor: {item.profiles?.organization_name || item.profiles?.full_name}
                </p>
                <p className="text-sm text-gray-500">
                  {isFood && item.freshness_score !== null && `Visual quality: ${item.freshness_score}/100 | Readiness index: ${item.placement_readiness_index}`}
                  {item.distance !== null && `${isFood && item.freshness_score !== null ? ' | ' : ''}${item.distance} km away`}
                </p>
              </div>
              <div className="flex flex-col gap-1 items-end">
                {isAvailable && (
                  <button
                    onClick={() => claimItem(item)}
                    disabled={requestingId === item.id}
                    className="bg-eco-green text-white px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50"
                  >
                    {requestingId === item.id ? 'Sending...' : 'Request pickup'}
                  </button>
                )}
                <button
                  onClick={() => hideItem(item.id)}
                  className="text-gray-500 border px-2 py-1 rounded text-xs"
                  title="Hide this item from your list. The donor's listing is not affected."
                >
                  Hide
                </button>
              </div>
            </div>
          )
        })}
        {!loading && visibleItems.length === 0 && (
          <p className="text-gray-400">No donations match your filters.</p>
        )}
      </div>
    </div>
  )
}
