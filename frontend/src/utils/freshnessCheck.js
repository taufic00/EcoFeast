const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function analyzeFoodFreshness(imageFile) {
  try {
    const base64Image = await fileToBase64(imageFile)

    const prompt = `You are a food safety inspector. Look at this food image and respond ONLY in this exact JSON format, nothing else:
{"score": <number 0-100 representing freshness, 100=very fresh, 0=spoiled>, "category": "<one of: fresh, good, moderate, poor, spoiled>", "reason": "<one short sentence explaining why>"}`

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: imageFile.type, data: base64Image } }
            ]
          }
        ]
      })
    })

    const data = await response.json()
    const rawText = data.candidates[0].content.parts[0].text
    const cleanText = rawText.replace(/```json|```/g, '').trim()
    const result = JSON.parse(cleanText)

    return result
  } catch (error) {
    console.error('Freshness check failed:', error)
    return { score: 50, category: 'moderate', reason: 'AI analysis failed - manual review needed' }
  }
}

export function calculatePRI(freshnessScore, hoursSinceCooked) {
  const timeDecayFactor = Math.max(0, 1 - hoursSinceCooked / 24)
  const pri = freshnessScore * 0.7 + timeDecayFactor * 100 * 0.3
  return Math.round(Math.max(0, Math.min(100, pri)))
}
