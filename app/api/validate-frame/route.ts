import { type NextRequest, NextResponse } from 'next/server'
import { validateLiveFrame } from '@/lib/azure-openai-vision'

/**
 * DermaSense AI — Real-Time Frame Validation Endpoint
 * Called every 2 seconds from live camera to validate:
 * - Correct body part in frame
 * - Skin and lesion visibility
 * - Image quality (lighting, blur)
 *
 * NO database save — pure real-time feedback only.
 * Does NOT call ML model or Azure CV — GPT-4o only for speed.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageBase64, expectedBodyPart } = body

    if (!imageBase64 || !expectedBodyPart) {
      return NextResponse.json(
        {
          is_skin_visible: false,
          detected_body_part: 'unknown',
          matches_expected: false,
          lesion_visible: false,
          image_quality: 'good',
          ready_to_capture: false,
          guidance_message: 'Missing image or body part selection.',
        },
        { status: 400 }
      )
    }

    const result = await validateLiveFrame(imageBase64, expectedBodyPart)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[validate-frame] Error:', err)
    // Always return a valid shape — never crash the camera UI
    return NextResponse.json({
      is_skin_visible: true,
      detected_body_part: 'unknown',
      matches_expected: true,
      lesion_visible: false,
      image_quality: 'good',
      ready_to_capture: false,
      guidance_message: 'AI validation temporarily unavailable. You can still capture manually.',
    })
  }
}
