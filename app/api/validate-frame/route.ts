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
 * Strict 3-second timeout so the UI never hangs.
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

    // Enforce a strict 3-second server-side timeout
    const result = await Promise.race([
      validateLiveFrame(imageBase64, expectedBodyPart),
      new Promise<ReturnType<typeof validateLiveFrame>>(resolve =>
        setTimeout(
          () =>
            resolve(
              Promise.resolve({
                is_skin_visible: true,
                detected_body_part: expectedBodyPart,
                matches_expected: true,
                lesion_visible: false,
                image_quality: 'good' as const,
                ready_to_capture: false,
                guidance_message:
                  'AI check timed out — ensure good lighting, then capture manually.',
              })
            ),
          3000
        )
      ),
    ])

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
      guidance_message: 'AI validation unavailable. Use good lighting and capture manually.',
    })
  }
}
