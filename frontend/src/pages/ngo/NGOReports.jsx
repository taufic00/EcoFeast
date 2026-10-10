import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'

// Reports page - is NGO ne ab tak kitna impact banaya hai (meals saved, CO2 saved)
// impact_log table food_item_id se linked hai, aur claims table batata hai
// kaunsa food_item is NGO ne liya tha - dono ko jodkar total nikalte hain
export default function NGOReports() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ totalMeals: 0, totalCO2: 0, totalDonations: 0 })
  const [monthlyBreakdown, setMonthlyBreakdown] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadReports()
  }, [user])

  async function loadReports() {
    setLoading(true)

    // Pehle is NGO ke saare picked_up claims ke food_item_ids nikalo
    const { data: claims } = await supabase
      .from('claims')
      .select('food_item_id, created_at')
      .eq('ngo_id', user.id)
      .eq('status', 'picked_up')

    if (!claims || claims.length === 0) {
      setStats({ totalMeals: 0, totalCO2: 0, totalDonations: 0 })
      setLoading(false)
      return
    }

    const foodItemIds = claims.map((c) => c.food_item_id)

    const { data: impactRows } = await supabase
      .from('impact_log')
      .select('meals_saved, co2_saved_kg, food_item_id, created_at')
      .in('food_item_id', foodItemIds)

    const totalMeals = impactRows?.reduce((sum, r) => sum + Number(r.meals_saved || 0), 0) || 0
    const totalCO2 = impactRows?.reduce((sum, r) => sum + Number(r.co2_saved_kg || 0), 0) || 0

    setStats({ totalMeals, totalCO2, totalDonations: claims.length })

    // Month ke hisaab se group karke chota breakdown banate hain
    const monthMap = {}
    impactRows?.forEach((r) => {
      const month = new Date(r.created_at).toLocaleString('default', { month: 'short', year: 'numeric' })
      if (!monthMap[month]) monthMap[month] = { meals: 0, co2: 0 }
      monthMap[month].meals += Number(r.meals_saved || 0)
      monthMap[month].co2 += Number(r.co2_saved_kg || 0)
    })
    setMonthlyBreakdown(Object.entries(monthMap))

    setLoading(false)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-eco-green mb-4">Impact Reports</h1>
      {loading && <p className="text-gray-400">Loading...</p>}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow text-center">
          <p className="text-3xl font-bold text-eco-green">{stats.totalDonations}</p>
          <p className="text-sm text-gray-500">Donations Received</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow text-center">
          <p className="text-3xl font-bold text-blue-600">{Math.round(stats.totalMeals)}</p>
          <p className="text-sm text-gray-500">Meals Saved</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow text-center">
          <p className="text-3xl font-bold text-green-600">{stats.totalCO2.toFixed(1)} kg</p>
          <p className="text-sm text-gray-500">CO2 Saved</p>
        </div>
      </div>

      {monthlyBreakdown.length > 0 && (
        <div className="bg-white p-4 rounded-xl shadow">
          <h2 className="font-semibold mb-3">Month-wise Breakdown</h2>
          {monthlyBreakdown.map(([month, data]) => (
            <div key={month} className="flex justify-between border-b py-2 text-sm">
              <span>{month}</span>
              <span>{Math.round(data.meals)} meals | {data.co2.toFixed(1)} kg CO2</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
