import { supabase } from '../lib/supabaseClient'

// Resizes the photo (max 1024px) and converts it to base64 so the upload is faster.
function resizeToBase64(file, maxSize = 1024) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1])
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('image load failed'))
    }
    img.src = url
  })
}

const UNUSABLE_MESSAGES = {
  blurry: 'The photo is blurry. Please take a clearer photo and try again.',
  dark: 'The photo is too dark. Please retake it in better lighting.',
  not_food: 'No food was detected in the photo. Please upload a photo of the food.',
  obscured: 'The food is not fully visible. Please retake the photo.',
}

function labelFor(score) {
  if (score >= 80) return 'good'
  if (score >= 60) return 'fair'
  if (score >= 40) return 'low'
  return 'poor'
}

// Result: { ok: true, score, category, foodDetected, issues, confidence, needsReview }
//  or: { ok: false, message }  (never returns a placeholder score)
export async function analyzeFoodFreshness(imageFile) {
  try {
    const base64Image = await resizeToBase64(imageFile)

    const { data, error } = await supabase.functions.invoke('analyze-food', {
      body: { image_base64: base64Image, mime_type: 'image/jpeg' },
    })

    if (error || !data || data.error) {
      console.error('analyze-food failed:', error || data)
      return { ok: false, message: 'The visual quality check is temporarily unavailable. Please try again in a few minutes.' }
    }

    if (!data.image_usable) {
      return {
        ok: false,
        message: UNUSABLE_MESSAGES[data.unusable_reason] || 'The photo could not be analyzed. Please take another photo.',
      }
    }

    const rawScore = Number(data.visual_quality)
    if (Number.isNaN(rawScore)) {
      return { ok: false, message: 'The analysis result was incomplete. Please try again.' }
    }

    // Deterministic adjustment: 10 points are deducted for each visible issue.
    const issues = Array.isArray(data.visible_issues) ? data.visible_issues : []
    const score = Math.max(0, Math.min(100, Math.round(rawScore - issues.length * 10)))
    const confidence = Number(data.confidence) || 0

    return {
      ok: true,
      score,
      category: labelFor(score),
      foodDetected: data.food_detected || null,
      issues,
      confidence,
      needsReview: Boolean(data.needs_human_review) || confidence < 0.6 || score < 40,
    }
  } catch (err) {
    console.error('Freshness check failed:', err)
    return { ok: false, message: 'The photo could not be processed. Please try again.' }
  }
}

export function calculatePRI(freshnessScore, hoursSinceCooked) {
  const timeDecayFactor = Math.max(0, 1 - hoursSinceCooked / 24)
  const pri = freshnessScore * 0.7 + timeDecayFactor * 100 * 0.3
  return Math.round(Math.max(0, Math.min(100, pri)))
}
