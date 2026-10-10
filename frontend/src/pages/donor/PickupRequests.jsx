import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'
import { calculateImpact } from '../../utils/matching'

export default function PickupRequests() {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    if (user) loadRequests()
  }, [user])

  async function loadRequests() {
    setLoading(true)
    console.log('[PickupRequests] Loading for donor id:', user.id)

    const { data: myItems, error: itemsError } = await supabase
      .from('food_items')
      .select('id, food_name, quantity_kg, image_url, status')
      .eq('donor_id', user.id)

    console.log('[PickupRequests] My food items:', myItems, 'error:', itemsError)

    if (itemsError) {
      setMessage('❌ Items fetch karne me error: ' + itemsError.message)
      setLoading(false)
      return
    }

    const myItemIds = (myItems || []).map((i) => i.id)
    if (myItemIds.length === 0) {
      setRequests([])
      setLoading(false)
      return
    }

    const { data: claims, error: claimsError } = await supabase
      .from('claims')
      .select('*')
      .in('food_item_id', myItemIds)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    console.log('[PickupRequests] Pending claims:', claims, 'error:', claimsError)

    if (claimsError) {
      setMessage('❌ Requests fetch karne me error: ' + claimsError.message)
      setLoading(false)
      return
    }

    const enriched = await Promise.all(
      (claims || []).map(async (claim) => {
        const foodItem = myItems.find((i) => i.id === claim.food_item_id)
        const { data: ngoProfile } = await supabase
          .from('profiles')
          .select('full_name, organization_name, phone')
          .eq('id', claim.ngo_id)
          .single()
        return { ...claim, foodItem, ngoProfile }
      })
    )

    setRequests(enriched)
    setLoading(false)
  }

  async function acceptRequest(claim) {
    setBusyId(claim.id)
    setMessage('')
    const { error } = await supabase.from('claims').update({ status: 'accepted' }).eq('id', claim.id)
    setBusyId(null)

    if (error) {
      setMessage('❌ Accept karne me error: ' + error.message)
      return
    }
    setMessage('✅ Request accept ki.')
    loadRequests()
  }

  async function rejectRequest(claim) {
    setBusyId(claim.id)
    setMessage('')
    const { error: e1 } = await supabase.from('claims').update({ status: 'cancelled' }).eq('id', claim.id)
    const { error: e2 } = await supabase.from('food_items').update({ status: 'available' }).eq('id', claim.food_item_id)
    setBusyId(null)

    if (e1 || e2) {
      setMessage('❌ Reject karne me error: ' + (e1?.message || e2?.message))
      return
    }
    setMessage('Request reject kar di, item dubara available hai.')
    loadRequests()
  }

  async function markDelivered(claim) {
    setBusyId(claim.id)
    setMessage('')
    const { error: e1 } = await supabase.from('claims').update({ status: 'picked_up' }).eq('id', claim.id)
    const { error: e2 } = await supabase.from('food_items').update({ status: 'delivered' }).eq('id', claim.food_item_id)

    if (e1 || e2) {
      setBusyId(null)
      setMessage('❌ Mark karne me error: ' + (e1?.message || e2?.message))
      return
    }

    const impact = calculateImpact(claim.foodItem?.quantity_kg || 0)
    await supabase.from('impact_log').insert({
      food_item_id: claim.food_item_id,
      meals_saved: impact.mealsSaved,
      co2_saved_kg: impact.co2SavedKg,
    })

    setBusyId(null)
    setMessage('✅ Delivered mark kar diya!')
    loadRequests()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-eco-green mb-4">Pickup Requests</h1>
      {message && <p className="text-sm p-2 bg-green-50 rounded mb-3">{message}</p>}
      {loading && <p className="text-gray-400">Loading...</p>}

      <div className="space-y-3">
        {requests.map((claim) => (
          <div key={claim.id} className="bg-white p-4 rounded-lg shadow">
            <p className="font-medium">{claim.foodItem?.food_name} — {claim.foodItem?.quantity_kg}kg</p>
            <p className="text-sm text-gray-500">
              NGO: {claim.ngoProfile?.organization_name || claim.ngoProfile?.full_name} | Phone: {claim.ngoProfile?.phone || 'N/A'}
            </p>
            <p className="text-sm text-gray-500 mb-2">Distance: {claim.distance_km ?? 'N/A'} km</p>
            <div className="flex gap-2 flex-wrap">
              <button disabled={busyId === claim.id} onClick={() => acceptRequest(claim)}
                className="bg-eco-green text-white px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50">
                Accept Request
              </button>
              <button disabled={busyId === claim.id} onClick={() => rejectRequest(claim)}
                className="bg-red-100 text-red-700 px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50">
                Reject
              </button>
              <button disabled={busyId === claim.id} onClick={() => markDelivered(claim)}
                className="bg-gray-700 text-white px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50">
                Mark as Picked Up
              </button>
            </div>
          </div>
        ))}
        {!loading && requests.length === 0 && <p className="text-gray-400">Koi pending pickup request nahi hai.</p>}
      </div>
    </div>
  )
}
