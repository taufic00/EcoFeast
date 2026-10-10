import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function Reports() {
  const [stats, setStats] = useState({
    totalDonors: 0, totalNGOs: 0, totalDonations: 0,
    totalDelivered: 0, totalMeals: 0, totalCO2: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    setLoading(true)

    const { data: profiles } = await supabase.from('profiles').select('role')
    const { data: items } = await supabase.from('food_items').select('status')
    const { data: impact } = await supabase.from('impact_log').select('meals_saved, co2_saved_kg')

    const totalDonors = profiles?.filter((p) => p.role === 'donor').length || 0
    const totalNGOs = profiles?.filter((p) => p.role === 'ngo').length || 0
    const totalDonations = items?.length || 0
    const totalDelivered = items?.filter((i) => i.status === 'delivered').length || 0
    const totalMeals = impact?.reduce((sum, r) => sum + Number(r.meals_saved || 0), 0) || 0
    const totalCO2 = impact?.reduce((sum, r) => sum + Number(r.co2_saved_kg || 0), 0) || 0

    setStats({ totalDonors, totalNGOs, totalDonations, totalDelivered, totalMeals, totalCO2 })
    setLoading(false)
  }

  const cards = [
    { label: 'Total Donors', value: stats.totalDonors, color: 'text-eco-green' },
    { label: 'Total NGOs', value: stats.totalNGOs, color: 'text-blue-600' },
    { label: 'Total Donations Listed', value: stats.totalDonations, color: 'text-purple-600' },
    { label: 'Successfully Delivered', value: stats.totalDelivered, color: 'text-green-600' },
    { label: 'Meals Saved', value: Math.round(stats.totalMeals), color: 'text-orange-600' },
    { label: 'CO2 Saved (kg)', value: stats.totalCO2.toFixed(1), color: 'text-teal-600' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-eco-green mb-4">Platform Reports & Analytics</h1>
      {loading && <p className="text-gray-400">Loading...</p>}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white p-4 rounded-xl shadow text-center">
            <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-sm text-gray-500 mt-1">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
