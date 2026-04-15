/**
 * DermaSense AI — Azure OpenAI GPT-4o Vision Utility
 * Provides: Deep medical visual reasoning for 40+ skin conditions
 * Body-part aware, ABCDE analysis, Fitzpatrick typing, ICD-10 coding
 */

export interface GptVisionResult {
  primary_condition: string
  condition_code: string
  icd10: string
  confidence: number
  severity: 'Critical' | 'High' | 'Moderate' | 'Low' | 'None'
  fitzpatrick_type: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI'
  skin_tone_description: string
  abcde: {
    asymmetry: string
    border: string
    color: string[]
    diameter_estimate: string
    evolution_indicators: string
  }
  lesion_morphology: string
  detected_body_part: string
  body_part_matches_selection: boolean
  differential_diagnoses: string[]
  clinical_notes: string
  urgency: string
  is_skin_image: boolean
  error?: string
}

const FALLBACK_RESULT: GptVisionResult = {
  primary_condition: 'Healthy Skin',
  condition_code: 'healthy',
  icd10: 'Z00.0',
  confidence: 0.2,
  severity: 'None',
  fitzpatrick_type: 'II',
  skin_tone_description: 'Light',
  abcde: {
    asymmetry: 'Symmetric',
    border: 'Regular',
    color: ['Uniform skin tone'],
    diameter_estimate: 'N/A',
    evolution_indicators: 'Unable to assess — AI service unavailable',
  },
  lesion_morphology: 'none',
  detected_body_part: 'unknown',
  body_part_matches_selection: true,
  differential_diagnoses: [],
  clinical_notes: 'GPT-4o Vision analysis was unavailable. Please consult a dermatologist for accurate diagnosis.',
  urgency: 'Routine',
  is_skin_image: true,
}

export async function analyzeWithGPT4oVision(
  imageBuffer: Buffer,
  selectedBodyPart: string = 'unknown'
): Promise<GptVisionResult> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const apiKey = process.env.AZURE_OPENAI_KEY
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'dermasense-gpt4o'
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-05-01-preview'
  const enabled = process.env.ENABLE_AZURE_OPENAI === 'true'

  if (!enabled || !endpoint || !apiKey) {
    console.warn('[azure-openai-vision] GPT-4o Vision not configured — returning fallback')
    return FALLBACK_RESULT
  }

  try {
    const base64Image = imageBuffer.toString('base64')

    const systemPrompt = `You are a board-certified AI dermatologist assistant with expertise in all skin conditions across all Fitzpatrick skin types (I-VI). You analyze clinical skin images and return structured medical assessments. Always be accurate, medically precise, and return only valid JSON.`

    const userPrompt = `Analyze this skin image. The patient has indicated they are scanning their ${selectedBodyPart}.

Return ONLY valid JSON (no markdown, no extra text):
{
  "primary_condition": "<full condition name e.g. Melanoma, Acne Vulgaris>",
  "condition_code": "<code: mel|bcc|scc|akiec|mcc|lm|atypnv|nv|bkl|df|sk|ep|py|pso|ec|ros|acne|lu|lp|dc|bp|gr|imp|cel|hzv|tca|scb|mc|vr|hsv|fol|hid|vit|mel_hyp|an|pih|vasc|pur|cap|healthy>",
  "icd10": "<ICD-10 code>",
  "confidence": <number 0.0-1.0>,
  "severity": "<Critical|High|Moderate|Low|None>",
  "fitzpatrick_type": "<I|II|III|IV|V|VI>",
  "skin_tone_description": "<e.g. Very fair, Fair, Medium, Olive, Brown, Dark brown, Very dark>",
  "abcde": {
    "asymmetry": "<Symmetric|Mildly asymmetric|Highly asymmetric>",
    "border": "<Regular and smooth|Slightly irregular|Irregular and notched|Cannot assess>",
    "color": ["<list each distinct color visible in the lesion>"],
    "diameter_estimate": "<e.g. ~3mm, ~5mm, ~8mm, >10mm, Cannot assess>",
    "evolution_indicators": "<Describe any signs of change, raised areas, or satellite lesions if visible>"
  },
  "lesion_morphology": "<macule|papule|plaque|nodule|vesicle|bulla|pustule|patch|wheal|cyst|none>",
  "detected_body_part": "<what body part is actually visible in the image>",
  "body_part_matches_selection": <true|false>,
  "differential_diagnoses": ["<second most likely condition>", "<third most likely condition>"],
  "clinical_notes": "<2-3 sentences of medically precise clinical narrative including key findings and reasoning>",
  "urgency": "<Immediate|Within 1 week|Within 1 month|Routine|No action needed>",
  "is_skin_image": <true|false>
}

Important: If no lesion is visible and skin appears healthy, use condition_code "healthy" with low confidence. If this is not a skin image, set is_skin_image to false.`

    const url = `${endpoint}openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${base64Image}`, detail: 'high' },
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.1,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      const errText = await response.text()
      console.error('[azure-openai-vision] API error:', errText.slice(0, 300))
      return { ...FALLBACK_RESULT, error: `GPT-4o API error: ${response.status}` }
    }

    const data = await response.json()
    const rawContent = data.choices?.[0]?.message?.content || ''

    // Parse JSON from response
    let parsed: GptVisionResult
    try {
      // Extract JSON even if wrapped in markdown code blocks
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawContent)
    } catch {
      console.error('[azure-openai-vision] Failed to parse GPT-4o JSON:', rawContent.slice(0, 200))
      return { ...FALLBACK_RESULT, error: 'Failed to parse GPT-4o response' }
    }

    return parsed
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.warn('[azure-openai-vision] Request timed out')
      return { ...FALLBACK_RESULT, error: 'GPT-4o request timed out' }
    }
    console.error('[azure-openai-vision] Error:', err)
    return { ...FALLBACK_RESULT, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Lightweight frame validation — checks body part match, skin visibility, lesion presence
 * Used by /api/validate-frame (runs every 2s from live camera)
 */
export interface FrameValidationResult {
  is_skin_visible: boolean
  detected_body_part: string
  matches_expected: boolean
  lesion_visible: boolean
  image_quality: 'good' | 'blurry' | 'too_dark' | 'too_bright' | 'too_far' | 'too_close'
  ready_to_capture: boolean
  guidance_message: string
}

export async function validateLiveFrame(
  imageBase64: string,
  expectedBodyPart: string
): Promise<FrameValidationResult> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const apiKey = process.env.AZURE_OPENAI_KEY
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'dermasense-gpt4o'
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-05-01-preview'
  const enabled = process.env.ENABLE_AZURE_OPENAI === 'true'

  const FALLBACK_VALIDATION: FrameValidationResult = {
    is_skin_visible: true,
    detected_body_part: expectedBodyPart,
    matches_expected: true,
    lesion_visible: false,
    image_quality: 'good',
    ready_to_capture: false,
    guidance_message: 'AI validation unavailable. Position your skin lesion inside the ring and click Capture.',
  }

  if (!enabled || !endpoint || !apiKey) return FALLBACK_VALIDATION

  try {
    const prompt = `You are a medical camera assistant. Analyze this camera frame quickly and return ONLY valid JSON:
{
  "is_skin_visible": <true|false>,
  "detected_body_part": "<face|arm|hand|back|leg|foot|chest|abdomen|scalp|neck|object|unclear>",
  "matches_expected": <true|false based on whether detected body part matches "${expectedBodyPart}">,
  "lesion_visible": <true|false - is any mole, rash, spot, discoloration, or skin lesion clearly visible?>,
  "image_quality": "<good|blurry|too_dark|too_bright|too_far|too_close>",
  "ready_to_capture": <true only if: is_skin_visible=true AND matches_expected=true AND image_quality='good'>,
  "guidance_message": "<short 1-sentence instruction if not ready, empty string if ready>"
}
Expected body part: ${expectedBodyPart}. Ready = skin visible + correct body part + good quality.`

    const url = `${endpoint}openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: 'low' } },
            ],
          },
        ],
        max_tokens: 200,
        temperature: 0,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)
    if (!response.ok) return FALLBACK_VALIDATION

    const data = await response.json()
    const rawContent = data.choices?.[0]?.message?.content || ''
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return FALLBACK_VALIDATION

    const parsed: FrameValidationResult = JSON.parse(jsonMatch[0])
    return parsed
  } catch {
    return FALLBACK_VALIDATION
  }
}
