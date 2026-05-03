import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getCollection, ObjectId } from '@/lib/mongodb'
import type { IProfile, IMedicalHistory } from '@/database/mongodb-schema'

// Returns the current patient's analysis history enriched with doctor review info
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profileCol = await getCollection<IProfile>('profiles')
    const patient = await profileCol.findOne({ clerkUserId: userId, isActive: true })
    if (!patient) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const histCol = await getCollection<IMedicalHistory>('medical_history')
    const analyses = await histCol
      .find({ userId: patient._id!, type: 'Analysis' })
      .sort({ date: -1 })
      .limit(50)
      .toArray()

    const tickets = analyses.map(a => {
      const details = (typeof a.details === 'object' ? a.details : {}) as Record<string, unknown>
      const doctorReviewed = Boolean(details.doctorReviewed)
      const ticketStatus = doctorReviewed ? 'Closed' : 'Open'

      return {
        id: a._id!.toString(),
        diagnosis: (details.Diagnosis as string) || a.data || 'Skin Analysis',
        riskLevel: (details.Risk_Level as string) || 'Low',
        confidence: (details.Confidence as string) || '',
        assessment: (details.Assessment as string) || '',
        recommendation: (details.Recommendation as string) || '',
        imageUrl: (details.imageUrl as string) || '',
        bodyPart: (details.bodyPart as string) || '',
        analysisDate: a.date,
        ticketStatus,
        // Doctor review info
        doctorReviewed,
        doctorName: (details.doctorName as string) || null,
        doctorMessage: (details.doctorMessage as string) || null,
        verdict: (details.verdict as string) || null,
        reviewedAt: (details.reviewedAt as string) || null,
        rawDetails: details,
      }
    })

    return NextResponse.json(tickets)
  } catch (err) {
    console.error('[Patient Skin Tickets GET]', err)
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
  }
}
