import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'

function getDismissedKey(userId) {
  return `ecofeast_dismissed_notifications_${userId}`
}

export default function Notifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    if (user) loadNotifications()
  }, [user])

  async function loadNotifications() {
    const { data } = await supabase
      .from('claims')
      .select('*, food_items!inner(food_name, donor_id), profiles:ngo_id(full_name, organization_name)')
      .eq('food_items.donor_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    const dismissed = JSON.parse(localStorage.getItem(getDismissedKey(user.id)) || '[]')
    setNotifications((data || []).filter((n) => !dismissed.includes(n.id)))
  }

  function deleteNotification(claimId) {
    const key = getDismissedKey(user.id)
    const dismissed = JSON.parse(localStorage.getItem(key) || '[]')
    dismissed.push(claimId)
    localStorage.setItem(key, JSON.stringify(dismissed))
    setNotifications((prev) => prev.filter((n) => n.id !== claimId))
  }

  function describeStatus(status) {
    if (status === 'pending') return 'ne claim kiya hai — pickup request pending hai'
    if (status === 'accepted') return 'ka pickup accept ho gaya hai'
    if (status === 'picked_up') return 'ka food deliver ho gaya'
    if (status === 'cancelled') return 'ka request reject/cancel ho gaya'
    return status
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-eco-green mb-4">Notifications</h1>
      <div className="space-y-2">
        {notifications.map((n) => (
          <div key={n.id} className="bg-white p-3 rounded-lg shadow text-sm flex justify-between items-start gap-2">
            <div className="flex-1">
              <span className="font-medium">{n.profiles?.organization_name || n.profiles?.full_name}</span>{' '}
              {describeStatus(n.status)} — <span className="font-medium">{n.food_items.food_name}</span>
              <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
            </div>
            <button
              onClick={() => deleteNotification(n.id)}
              className="text-red-500 border border-red-200 px-2 py-1 rounded text-xs shrink-0"
              title="Remove notification"
            >
              Delete
            </button>
          </div>
        ))}
        {notifications.length === 0 && <p className="text-gray-400">Koi notification abhi tak nahi hai.</p>}
      </div>
    </div>
  )
}
