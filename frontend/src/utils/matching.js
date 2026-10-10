export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg) {
  return (deg * Math.PI) / 180
}

export function findBestNGOMatches(foodItem, ngoList) {
  const scored = ngoList.map((ngo) => {
    const distance = calculateDistance(foodItem.latitude, foodItem.longitude, ngo.latitude, ngo.longitude)
    const distanceScore = Math.max(0, 100 - distance * 2)
    const capacityScore = ngo.capacity_kg
      ? Math.min(100, (ngo.capacity_kg / foodItem.quantity_kg) * 50)
      : 50
    const urgencyWeight = foodItem.freshness_score < 50 ? 1.5 : 1
    const matchScore = (distanceScore * 0.5 + capacityScore * 0.3 + 20 * 0.2) * urgencyWeight
    return { ...ngo, distance: Math.round(distance * 10) / 10, matchScore: Math.round(matchScore) }
  })
  return scored.sort((a, b) => b.matchScore - a.matchScore)
}

export function calculateImpact(quantityKg) {
  const co2SavedKg = Math.round(quantityKg * 2.5 * 10) / 10
  const mealsSaved = Math.round(quantityKg / 0.4)
  return { co2SavedKg, mealsSaved }
}
