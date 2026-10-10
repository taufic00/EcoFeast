import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'

const statusLabels = {
  pending: { text: 'Waiting for donor to accept', color: 'bg-yellow-100 text-yellow-700' },
  accepted: { text: 'Accepted — go pickup now', color: 'bg-green-100 text-green-700' },
  picked_up: { text: 'Picked up (completed)', color: 'bg-blue-100 text-blue-700' },
  cancelled: { text: 'Rejected by donor', color: 'bg-red-100 text-red-700' },
}

function getDismissedKey(userId) {
  return `ecofeast_dismissed_requests_${userId}`
}

export default function NGOMyRequests() {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadRequests()
  }, [user])

  async function loadRequests() {
    setLoading(true)

    const { data, error } = await supabase
      .from('claims')
      .select('*, food_items(donor_id, food_name, quantity_kg, image_url)')
      .eq('ngo_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('My Requests load error:', error)
      setRequests([])
      setLoading(false)
      return
    }

    const enriched = await Promise.all(
      (data || []).map(async (claim) => {
        if (!claim.food_items) return claim
        const { data: donorProfile } = await supabase
          .from('profiles')
          .select('full_name, organization_name, phone, address, latitude, longitude')
          .eq('id', claim.food_items.donor_id)
          .single()
        return { ...claim, donorProfile }
      })
    )

    const dismissed = JSON.parse(localStorage.getItem(getDismissedKey(user.id)) || '[]')
    setRequests(enriched.filter((r) => !dismissed.includes(r.id)))
    setLoading(false)
  }

  function deleteRequest(claimId) {
    const key = getDismissedKey(user.id)
    const dismissed = JSON.parse(localStorage.getItem(key) || '[]')
    dismissed.push(claimId)
    localStorage.setItem(key, JSON.stringify(dismissed))
    setRequests((prev) => prev.filter((r) => r.id !== claimId))
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-eco-green mb-4">My Requests</h1>
      {loading && <p className="text-gray-400">Loading...</p>}

      <div className="space-y-3">
        {requests.map((claim) => {
          const label = statusLabels[claim.status] || { text: claim.status, color: 'bg-gray-100' }
          return (
            <div key={claim.id} className="bg-white p-4 rounded-lg shadow">
              <div className="flex gap-3 items-center mb-2">
                <img src={claim.food_items?.image_url} alt="" className="w-14 h-14 object-cover rounded" />
                <div className="flex-1">
                  <p className="font-medium">{claim.food_items?.food_name} — {claim.food_items?.quantity_kg}kg</p>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${label.color}`}>{label.text}</span>
                </div>
                <button
                  onClick={() => deleteRequest(claim.id)}
                  className="text-red-500 border border-red-200 px-2 py-1 rounded text-xs shrink-0"
                  title="Remove from list"
                >
                  Delete
                </button>
              </div>

              {(claim.status === 'accepted' || claim.status === 'picked_up') && claim.donorProfile && (
                <div className="bg-gray-50 p-3 rounded text-sm mt-2">
                  <p className="font-medium mb-1">📍 Pickup Location:</p>
                  <p>{claim.donorProfile.organization_name || claim.donorProfile.full_name}</p>
                  <p>{claim.donorProfile.address}</p>
                  <p>Phone: {claim.donorProfile.phone}</p>
                  {claim.donorProfile.latitude && (
                    <a className="text-eco-green underline" target="_blank" rel="noreferrer"
                      href={`https://www.google.com/maps?q=${claim.donorProfile.latitude},${claim.donorProfile.longitude}`}>
                      Open in Google Maps
                    </a>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {!loading && requests.length === 0 && <p className="text-gray-400">Abhi tak koi request nahi bheji.</p>}
      </div>
    </div>
  )
}
