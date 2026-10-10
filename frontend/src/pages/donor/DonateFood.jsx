import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'
import { analyzeFoodFreshness, calculatePRI } from '../../utils/freshnessCheck'

export default function DonateFood() {
  const { user } = useAuth()
  const [foodName, setFoodName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!imageFile) {
      setMessage('Pehle food ki photo upload karo')
      return
    }

    setMessage('')
    setAnalyzing(true)

    const freshnessResult = await analyzeFoodFreshness(imageFile)
    setAnalyzing(false)
    setUploading(true)

    const fileName = `${user.id}/${Date.now()}_${imageFile.name}`
    const { error: uploadError } = await supabase.storage.from('food-images').upload(fileName, imageFile)

    if (uploadError) {
      setMessage('Image upload fail hui: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('food-images').getPublicUrl(fileName)
    const pri = calculatePRI(freshnessResult.score, 0)

    const { error: insertError } = await supabase.from('food_items').insert({
      donor_id: user.id,
      food_name: foodName,
      quantity_kg: parseFloat(quantity),
      image_url: urlData.publicUrl,
      freshness_score: freshnessResult.score,
      placement_readiness_index: pri,
      cooked_time: new Date().toISOString(),
    })

    setUploading(false)

    if (insertError) {
      setMessage('Save fail hua: ' + insertError.message)
      return
    }

    setMessage(`✅ Food listed! Freshness: ${freshnessResult.score}/100 (${freshnessResult.category}) — ${freshnessResult.reason}`)
    setFoodName('')
    setQuantity('')
    setImageFile(null)
    setImagePreview(null)
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-eco-green mb-4">Donate Food</h1>
      <form onSubmit={handleSubmit} className="bg-white p-5 rounded-xl shadow space-y-3">
        <input className="w-full border rounded p-2" placeholder="Food name (e.g. Rice & Dal)"
          value={foodName} onChange={(e) => setFoodName(e.target.value)} required />

        <input className="w-full border rounded p-2" type="number" step="0.1" placeholder="Quantity (kg)"
          value={quantity} onChange={(e) => setQuantity(e.target.value)} required />

        <input className="w-full border rounded p-2" type="file" accept="image/*"
          onChange={handleImageChange} required />

        {imagePreview && <img src={imagePreview} alt="preview" className="w-32 h-32 object-cover rounded" />}

        {message && <p className="text-sm p-2 bg-gray-50 rounded">{message}</p>}

        <button disabled={analyzing || uploading} type="submit"
          className="w-full bg-eco-green text-white rounded p-2 font-semibold disabled:opacity-50">
          {analyzing ? 'AI analyzing freshness...' : uploading ? 'Uploading...' : 'List This Food'}
        </button>
      </form>
    </div>
  )
}
