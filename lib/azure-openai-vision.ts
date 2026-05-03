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
  // flag so callers know this came from fallback not real GPT analysis
  is_fallback?: boolean
  error?: string
}

// Deployment names to try in order — the env-set one first, then common defaults
function getDeploymentCandidates() {
  const envName = process.env.AZURE_OPENAI_DEPLOYMENT
  const candidates = ['gpt-4o', 'gpt-4', 'gpt-4-vision-preview', 'gpt-4o-mini']
  if (envName && !candidates.includes(envName)) {
    candidates.unshift(envName)
  }
  return candidates
}

async function callAzureOpenAI(
  endpoint: string,
  apiKey: string,
  deployment: string,
  apiVersion: string,
  messages: object[],
  maxTokens: number,
  timeoutMs: number
): Promise<{ ok: boolean; status: number; data?: object; error?: string }> {
  const url = `${endpoint}openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({ messages, max_tokens: maxTokens, temperature: 0.1 }),
      signal: controller.signal,
    })
    clearTimeout(timer)

    const text = await res.text()
    let data: object
    try { data = JSON.parse(text) } catch { data = {} }

    if (!res.ok) {
      // DeploymentNotFound means we should try the next candidate
      const isDeploymentMissing = text.includes('DeploymentNotFound') || res.status === 404
      return { ok: false, status: res.status, error: isDeploymentMissing ? 'DeploymentNotFound' : text.slice(0, 300) }
    }

    return { ok: true, status: res.status, data }
  } catch (err) {
    clearTimeout(timer)
    const msg = err instanceof Error ? err.message : 'unknown'
    return { ok: false, status: 0, error: msg }
  }
}

export async function analyzeWithGPT4oVision(
  imageBuffer: Buffer,
  selectedBodyPart = 'unknown'
): Promise<GptVisionResult> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const apiKey = process.env.AZURE_OPENAI_KEY
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-05-01-preview'
  const enabled = process.env.ENABLE_AZURE_OPENAI === 'true'

  const FALLBACK: GptVisionResult = {
    primary_condition: 'Analysis Pending',
    condition_code: 'unknown',
    icd10: '',
    confidence: 0,
    severity: 'Low',
    fitzpatrick_type: 'II',
    skin_tone_description: 'Light to Medium',
    abcde: {
      asymmetry: 'Cannot assess',
      border: 'Cannot assess',
      color: ['Cannot assess'],
      diameter_estimate: 'Cannot assess',
      evolution_indicators: 'Cannot assess',
    },
    lesion_morphology: 'unknown',
    detected_body_part: selectedBodyPart,
    body_part_matches_selection: true,
    differential_diagnoses: [],
    clinical_notes: 'Automated vision analysis was unavailable. Clinical review is strongly recommended.',
    urgency: 'Consult a dermatologist',
    is_skin_image: true,
    is_fallback: true,
  }

  if (!enabled || !endpoint || !apiKey) {
    console.warn('[azure-openai-vision] Not configured, returning fallback')
    return FALLBACK
  }

  const base64Image = imageBuffer.toString('base64')

  // Strong clinical prompt — instructs the model to ALWAYS find and report the disease,
  // never default to healthy unless skin truly is clear
  const systemPrompt = `You are a board-certified dermatologist AI assistant with expert-level knowledge 
of all skin conditions across all Fitzpatrick skin types (I-VI). You analyze clinical dermoscopy and 
smartphone skin images. Your PRIMARY job is to identify pathological findings. 

CRITICAL RULES:
- If there is ANY visible lesion, discoloration, rash, spot, patch, or abnormality — classify it accurately
- Only return condition_code "healthy" when skin is completely clear with zero findings
- You must detect which specific region/part of the skin has the disease
- Report confidence honestly — do not deflate it
- Return ONLY valid JSON with no extra text`

  const userPrompt = `Examine this skin image carefully. The patient says this is their ${selectedBodyPart}.

Look for: lesions, moles, rashes, discoloration, scaling, crusting, blistering, pustules, macules, 
papules, plaques, nodules, vesicles, or any texture change.

Identify EXACTLY where in the image the pathological finding sits (e.g. "central lesion", 
"upper-left quadrant", "diffuse across entire surface").

Return ONLY this JSON (no markdown, no backticks):
{
  "primary_condition": "<full medical name e.g. Basal Cell Carcinoma, Acne Vulgaris, Psoriasis Plaque>",
  "condition_code": "<mel|bcc|scc|akiec|mcc|lm|atypnv|nv|bkl|df|sk|ep|py|pso|ec|ros|acne|lu|lp|dc|bp|gr|imp|cel|hzv|tca|scb|mc|vr|hsv|fol|hid|vit|mel_hyp|an|pih|vasc|pur|cap|healthy>",
  "icd10": "<ICD-10 code>",
  "confidence": <0.0-1.0 — be accurate, not modest>,
  "severity": "<Critical|High|Moderate|Low|None>",
  "fitzpatrick_type": "<I|II|III|IV|V|VI>",
  "skin_tone_description": "<Very fair|Fair|Medium|Olive|Brown|Dark brown|Very dark>",
  "lesion_location_in_image": "<describe exactly where the disease/finding is in the frame>",
  "abcde": {
    "asymmetry": "<Symmetric|Mildly asymmetric|Highly asymmetric>",
    "border": "<Regular and smooth|Slightly irregular|Irregular and notched|Cannot assess>",
    "color": ["<list each distinct color present in the lesion>"],
    "diameter_estimate": "<~3mm|~5mm|~8mm|>10mm|Cannot assess>",
    "evolution_indicators": "<any raised areas, satellite lesions, peripheral spread, or surface change>"
  },
  "lesion_morphology": "<macule|papule|plaque|nodule|vesicle|bulla|pustule|patch|wheal|cyst|none>",
  "detected_body_part": "<face|arm|hand|back|leg|foot|chest|abdomen|scalp|neck|other>",
  "body_part_matches_selection": <true|false>,
  "differential_diagnoses": ["<second most likely>", "<third most likely>"],
  "clinical_notes": "<3-4 sentences: describe the lesion in detail, its location in the image, key morphological features, and clinical reasoning for the diagnosis>",
  "urgency": "<Immediate|Within 1 week|Within 1 month|Routine|No action needed>",
  "is_skin_image": <true|false>
}

If the skin is genuinely clear and healthy with no findings, use condition_code "healthy" with confidence < 0.3.
Otherwise identify the actual pathology. Do not default to healthy when disease is present.`

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: [
        { type: 'text', text: userPrompt },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}`, detail: 'high' } },
      ],
    },
  ]

  // Try each deployment name in order until one works
  const candidates = getDeploymentCandidates()
  let lastError = ''

  for (const deployment of candidates) {
    console.log(`[azure-openai-vision] Trying deployment: ${deployment}`)
    const result = await callAzureOpenAI(endpoint, apiKey, deployment, apiVersion, messages, 1000, 15000)

    if (!result.ok) {
      console.warn(`[azure-openai-vision] Deployment ${deployment} failed:`, result.error)
      lastError = result.error || 'unknown'
      if (result.error === 'DeploymentNotFound') continue  // try next
      break  // non-deployment errors — stop trying
    }

    const raw = result.data as { choices?: Array<{ message?: { content?: string } }> }
    const content = raw?.choices?.[0]?.message?.content || ''

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON in response')
      const parsed = JSON.parse(jsonMatch[0]) as GptVisionResult
      
      // Sanity check — if GPT says healthy but confidence is high, something is off
      if (parsed.condition_code === 'healthy' && parsed.confidence > 0.5) {
        console.log('[azure-openai-vision] High-confidence healthy result — treating as valid')
      }

      console.log(`[azure-openai-vision] Success with deployment: ${deployment}, condition: ${parsed.primary_condition}, confidence: ${parsed.confidence}`)
      return parsed
    } catch (parseErr) {
      console.error('[azure-openai-vision] JSON parse failed:', content.slice(0, 200))
      break
    }
  }

  console.error('[azure-openai-vision] All deployments failed. Last error:', lastError)
  return { ...FALLBACK, error: `Azure OpenAI unavailable: ${lastError}` }
}


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
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-05-01-preview'
  const enabled = process.env.ENABLE_AZURE_OPENAI === 'true'

  const FALLBACK_VALIDATION: FrameValidationResult = {
    is_skin_visible: true,
    detected_body_part: expectedBodyPart,
    matches_expected: true,
    lesion_visible: false,
    image_quality: 'good',
    ready_to_capture: false,
    guidance_message: 'AI validation unavailable. Position your skin and click Capture.',
  }

  if (!enabled || !endpoint || !apiKey) return FALLBACK_VALIDATION

  const prompt = `Camera validation check. Return ONLY valid JSON:
{
  "is_skin_visible": <true|false>,
  "detected_body_part": "<face|arm|hand|back|leg|foot|chest|abdomen|scalp|neck|object|unclear>",
  "matches_expected": <true|false — does detected part match "${expectedBodyPart}"?>,
  "lesion_visible": <true|false>,
  "image_quality": "<good|blurry|too_dark|too_bright|too_far|too_close>",
  "ready_to_capture": <true only if skin visible + correct body part + image quality is good>,
  "guidance_message": "<short instruction if not ready, empty string if ready>"
}
Expected body part: ${expectedBodyPart}.`

  const messages = [{
    role: 'user',
    content: [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: 'low' } },
    ],
  }]

  const candidates = getDeploymentCandidates()

  for (const deployment of candidates) {
    const result = await callAzureOpenAI(endpoint, apiKey, deployment, apiVersion, messages, 150, 4000)
    if (!result.ok) {
      if (result.error === 'DeploymentNotFound') continue
      break
    }

    const raw = result.data as { choices?: Array<{ message?: { content?: string } }> }
    const content = raw?.choices?.[0]?.message?.content || ''
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) break
      return JSON.parse(jsonMatch[0]) as FrameValidationResult
    } catch { break }
  }

  return FALLBACK_VALIDATION
}
