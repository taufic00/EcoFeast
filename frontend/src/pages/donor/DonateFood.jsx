import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'
import { analyzeFoodFreshness, calculatePRI } from '../../utils/freshnessCheck'
import { CATEGORIES, UNITS, categoryLabel, defaultUnitFor } from '../../utils/categories'

const MAX_FILE_MB = 10
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

export default function DonateFood() {
  const { user } = useAuth()
  const [category, setCategory] = useState('food')
  const [foodName, setFoodName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('kg')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState(null)
  const [needs, setNeeds] = useState([])

  const isFood = category === 'food'

  useEffect(() => {
    loadNeeds(category)
  }, [category])

  // Active requirements from verified organizations for the selected category.
  async function loadNeeds(selected) {
    const { data, error } = await supabase
      .from('requirements')
      .select(
        'id, item_name, quantity_remaining, unit, priority, expires_at, ngo:ngo_id(organization_name, full_name, address, is_verified)'
      )
      .eq('status', 'active')
      .eq('category', selected)

    if (error) {
      console.error('Failed to load NGO requirements:', error)
      setNeeds([])
      return
    }

    const now = new Date()
    const filtered = (data || [])
      .filter((r) => r.ngo?.is_verified && (!r.expires_at || new Date(r.expires_at) > now))
      .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    setNeeds(filtered)
  }

  function handleCategoryChange(value) {
    setCategory(value)
    setUnit(defaultUnitFor(value))
  }

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      setMessage({ type: 'error', text: 'Unsupported file type. Please use a JPG, PNG or WEBP image.' })
      return
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setMessage({ type: 'error', text: `The image is too large. The maximum size is ${MAX_FILE_MB} MB.` })
      return
    }

    setMessage(null)
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!imageFile) {
      setMessage({ type: 'error', text: 'A photo is required. Take a photo or upload one from your gallery.' })
      return
    }

    setMessage(null)

    // The AI visual quality check applies to food only.
    let analysis = null
    if (isFood) {
      setAnalyzing(true)
      analysis = await analyzeFoodFreshness(imageFile)
      setAnalyzing(false)

      // If the analysis fails or the photo is unusable, nothing is listed (no placeholder score).
      if (!analysis.ok) {
        setMessage({ type: 'error', text: analysis.message })
        return
      }
    }

    setUploading(true)

    const ext = imageFile.type === 'image/png' ? 'png' : imageFile.type === 'image/webp' ? 'webp' : 'jpg'
    const fileName = `${user.id}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('food-images').upload(fileName, imageFile)

    if (uploadError) {
      setMessage({ type: 'error', text: `The image could not be uploaded: ${uploadError.message}` })
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('food-images').getPublicUrl(fileName)

    const { error: insertError } = await supabase.from('food_items').insert({
      donor_id: user.id,
      food_name: foodName.trim(),
      category,
      unit,
      quantity_kg: parseFloat(quantity),
      image_url: urlData.publicUrl,
      freshness_score: analysis ? analysis.score : null,
      placement_readiness_index: analysis ? calculatePRI(analysis.score, 0) : null,
      cooked_time: isFood ? new Date().toISOString() : null,
    })

    setUploading(false)

    if (insertError) {
      console.error('Insert failed:', insertError)
      setMessage({ type: 'error', text: `The donation could not be saved: ${insertError.message}` })
      return
    }

    let text = `Your ${categoryLabel(category).toLowerCase()} donation has been listed.`
    if (analysis) {
      const issues = analysis.issues.length ? ` Visible issues: ${analysis.issues.join(', ')}.` : ''
      const review = analysis.needsReview ? ' Human review is recommended before acceptance.' : ''
      text += ` Visual quality: ${analysis.score}/100 (${analysis.category}), confidence ${Math.round(analysis.confidence * 100)}%.${issues}${review}`
    }
    setMessage({ type: 'success', text })
    setFoodName('')
    setQuantity('')
    setImageFile(null)
    setImagePreview(null)
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-eco-green mb-4">Donate Items</h1>
      <form onSubmit={handleSubmit} className="bg-white p-5 rounded-xl shadow space-y-3">
        <label className="text-sm block">
          Category
          <select className="w-full border rounded p-2 mt-1" value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>

        {needs.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
            <p className="font-medium text-green-800 mb-1">
              Verified organizations currently needing {categoryLabel(category).toLowerCase()}
            </p>
            <ul className="space-y-1 text-green-900">
              {needs.slice(0, 5).map((n) => (
                <li key={n.id}>
                  {n.ngo?.organization_name || n.ngo?.full_name}: {n.item_name}, {n.quantity_remaining} {n.unit} still needed
                  {n.priority === 'high' && ' (high priority)'}
                </li>
              ))}
            </ul>
          </div>
        )}

        <input className="w-full border rounded p-2"
          placeholder={isFood ? 'Item name (e.g. Rice and dal)' : 'Item name (e.g. Winter jackets)'}
          value={foodName} onChange={(e) => setFoodName(e.target.value)} required />

        <div className="grid grid-cols-2 gap-3">
          <input className="w-full border rounded p-2" type="number" min="0" step="0.1" placeholder="Quantity"
            value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
          <select className="w-full border rounded p-2" value={unit} onChange={(e) => setUnit(e.target.value)}>
            {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Take a photo (on a phone)</label>
          <input className="w-full border rounded p-2" type="file" accept="image/*" capture="environment"
            onChange={handleImageChange} />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Or choose a photo from your gallery</label>
          <input className="w-full border rounded p-2" type="file" accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange} />
        </div>

        {imagePreview && <img src={imagePreview} alt="Selected item preview" className="w-32 h-32 object-cover rounded" />}

        {message && (
          <p className={`text-sm p-2 rounded ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message.text}
          </p>
        )}

        <button disabled={analyzing || uploading} type="submit"
          className="w-full bg-eco-green text-white rounded p-2 font-semibold disabled:opacity-50">
          {analyzing ? 'Running visual quality check...' : uploading ? 'Uploading...' : 'List donation'}
        </button>

        {isFood && (
          <p className="text-xs text-gray-500">
            AI visual analysis cannot guarantee food safety. Final acceptance should follow applicable food-safety
            procedures and human review.
          </p>
        )}
      </form>
    </div>
  )
}
