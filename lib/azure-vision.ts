/**
 * DermaSense AI — Azure Computer Vision Utility (Enhanced)
 * Provides: skin confidence, Fitzpatrick estimation, ABCDE pre-analysis, quality score
 */

const AZURE_CV_ENDPOINT = process.env.AZURE_VISION_ENDPOINT || ''
const AZURE_CV_KEY = process.env.AZURE_VISION_KEY || ''

const SKIN_TAGS = [
  'skin', 'lesion', 'mole', 'rash', 'spot', 'dermatology', 'body', 'arm', 'face',
  'hand', 'leg', 'foot', 'chest', 'back', 'neck', 'scalp', 'ear', 'human', 'person',
  'dermis', 'epidermis', 'pigment', 'freckle', 'birthmark', 'wart', 'bump',
]

const IRREGULAR_BORDER_TAGS = ['asymmetric', 'irregular', 'jagged', 'notched', 'uneven']

export interface AzureVisionResult {
  skinConfidence: number
  isSkinImage: boolean
  tags: string[]
  dominantColor: string
  fitzpatrickEstimate: string
  skinToneDescription: string
  borderIrregularityHint: boolean
  imageQuality: 'good' | 'poor' | 'blurry' | 'too_dark' | 'too_bright'
  qualityScore: number
  rawDescription: string
  error?: string
}

function estimateFitzpatrick(
  dominantColor: string,
  accentColor: string
): { type: string; description: string } {
  const warm = ['brown', 'beige', 'tan', 'olive', 'caramel']
  const dark = ['dark brown', 'dark', 'black', 'ebony', 'mahogany']
  const fair = ['white', 'pink', 'pale', 'ivory', 'cream', 'light']
  const lower = (dominantColor + ' ' + accentColor).toLowerCase()
  if (dark.some(c => lower.includes(c))) return { type: 'V-VI', description: 'Deep Dark (Brown to Black)' }
  if (warm.some(c => lower.includes(c))) return { type: 'III-IV', description: 'Medium Brown to Olive' }
  if (fair.some(c => lower.includes(c))) return { type: 'I-II', description: 'Fair to Light' }
  return { type: 'II-III', description: 'Light to Medium' }
}

/**
 * Analyzes image using Azure Computer Vision REST API (no SDK version conflicts)
 */
export async function analyzeImageWithAzure(imageBuffer: Buffer): Promise<AzureVisionResult> {
  const fallback: AzureVisionResult = {
    skinConfidence: 0.5,
    isSkinImage: true,
    tags: ['skin'],
    dominantColor: 'unknown',
    fitzpatrickEstimate: 'II-III',
    skinToneDescription: 'Light to Medium',
    borderIrregularityHint: false,
    imageQuality: 'good',
    qualityScore: 0.7,
    rawDescription: 'Azure CV not configured',
  }

  if (!AZURE_CV_ENDPOINT || !AZURE_CV_KEY) {
    return { ...fallback, error: 'Azure CV credentials missing' }
  }

  try {
    const url = `${AZURE_CV_ENDPOINT.replace(/\/$/, '')}/computervision/imageanalysis:analyze?api-version=2023-02-01-preview&features=tags,description,color`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_CV_KEY,
        'Content-Type': 'application/octet-stream',
      },
      body: imageBuffer,
    })

    if (!response.ok) {
      console.warn('[azure-vision] API returned', response.status)
      return { ...fallback, error: `Azure CV API error: ${response.status}` }
    }

    const data = await response.json() as {
      tagsResult?: { values?: Array<{ name: string; confidence: number }> }
      captionResult?: { text?: string; confidence?: number }
      colorResult?: { dominantColorForeground?: string; dominantColorBackground?: string }
    }

    const allTags = (data.tagsResult?.values ?? []).map(t => t.name?.toLowerCase() || '')
    const matchedSkinTags = allTags.filter(t => SKIN_TAGS.includes(t))

    const skinConf = (data.tagsResult?.values ?? [])
      .filter(t => SKIN_TAGS.includes(t.name?.toLowerCase() || ''))
      .reduce((sum, t) => sum + (t.confidence ?? 0), 0)

    const skinConfidence = matchedSkinTags.length > 0
      ? Math.min(skinConf / matchedSkinTags.length, 1)
      : 0.1

    const borderIrregularityHint = allTags.some(t => IRREGULAR_BORDER_TAGS.includes(t))

    const dominantColor = data.colorResult?.dominantColorForeground ?? 'unknown'
    const accentColor = data.colorResult?.dominantColorBackground ?? ''
    const fitzpatrick = estimateFitzpatrick(dominantColor, accentColor)

    const descConf = data.captionResult?.confidence ?? 0
    const qualityScore = Math.min(descConf * 1.2, 1)
    const imageQuality: AzureVisionResult['imageQuality'] = qualityScore < 0.3 ? 'poor' : 'good'

    return {
      skinConfidence,
      isSkinImage: skinConfidence > 0.25,
      tags: allTags,
      dominantColor,
      fitzpatrickEstimate: fitzpatrick.type,
      skinToneDescription: fitzpatrick.description,
      borderIrregularityHint,
      imageQuality,
      qualityScore,
      rawDescription: data.captionResult?.text ?? '',
    }
  } catch (err) {
    console.error('[azure-vision] Error:', err)
    return {
      ...fallback,
      error: err instanceof Error ? err.message : 'Azure CV error',
    }
  }
}
