import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'

// Dismiss (delete) kiye hue contacts localStorage me save karte hain
// - taaki refresh karne par bhi wapas na aayein, per user alag list
function getDismissedKey(userId) {
  return `ecofeast_dismissed_messages_${userId}`
}

export default function Messages() {
  const { user } = useAuth()
  const [contacts, setContacts] = useState([])

  useEffect(() => {
    if (user) loadContacts()
  }, [user])

  async function loadContacts() {
    const { data } = await supabase
      .from('claims')
      .select('*, food_items!inner(food_name, donor_id), profiles:ngo_id(full_name, organization_name, phone)')
      .eq('food_items.donor_id', user.id)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })

    const dismissed = JSON.parse(localStorage.getItem(getDismissedKey(user.id)) || '[]')
    setContacts((data || []).filter((c) => !dismissed.includes(c.id)))
  }

  function deleteContact(claimId) {
    const key = getDismissedKey(user.id)
    const dismissed = JSON.parse(localStorage.getItem(key) || '[]')
    dismissed.push(claimId)
    localStorage.setItem(key, JSON.stringify(dismissed))
    setContacts((prev) => prev.filter((c) => c.id !== claimId))
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-eco-green mb-1">Messages</h1>
      <p className="text-gray-500 text-sm mb-4">Filhal simple contact list hai — direct call kar sakte ho.</p>

      <div className="space-y-2">
        {contacts.map((c) => (
          <div key={c.id} className="bg-white p-3 rounded-lg shadow flex justify-between items-center gap-2">
            <div className="flex-1">
              <p className="font-medium">{c.profiles?.organization_name || c.profiles?.full_name}</p>
              <p className="text-sm text-gray-500">Re: {c.food_items.food_name} — status: {c.status}</p>
            </div>
            {c.profiles?.phone && (
              <a href={`tel:${c.profiles.phone}`} className="bg-eco-green text-white px-3 py-1.5 rounded text-sm font-medium">
                Call
              </a>
            )}
            <button
              onClick={() => deleteContact(c.id)}
              className="text-red-500 border border-red-200 px-2 py-1.5 rounded text-sm"
              title="Remove from list"
            >
              Delete
            </button>
          </div>
        ))}
        {contacts.length === 0 && <p className="text-gray-400">Koi contact abhi tak nahi hai.</p>}
      </div>
    </div>
  )
}
