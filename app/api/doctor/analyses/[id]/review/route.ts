import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getCollection, ObjectId } from '@/lib/mongodb'
import type { IProfile, IMedicalHistory } from '@/database/mongodb-schema'
import { sendEmail } from '@/lib/email-internal'

// POST: doctor reviews an analysis ticket — sends message to patient + closes ticket
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid analysis ID' }, { status: 400 })
    }

    const body = await req.json()
    const { doctorMessage, verdict } = body as { doctorMessage: string; verdict: string }

    if (!doctorMessage?.trim()) {
      return NextResponse.json({ error: 'Doctor message is required' }, { status: 400 })
    }

    const histCol = await getCollection<IMedicalHistory>('medical_history')
    const profileCol = await getCollection<IProfile & {
      specialty?: string; fullName?: string; contactNumber?: string
    }>('profiles')

    const analysis = await histCol.findOne({ _id: new ObjectId(id) })
    if (!analysis) return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })

    const patient = await profileCol.findOne({ _id: analysis.userId })
    const doctorProfile = await profileCol.findOne({ clerkUserId: userId, isActive: true })

    // Update the analysis record with doctor review
    await histCol.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'Completed',
          updatedAt: new Date(),
          details: {
            ...(typeof analysis.details === 'object' ? analysis.details : {}),
            doctorReviewed: true,
            doctorId: userId,
            doctorName: doctorProfile?.fullName ?? 'Doctor',
            doctorMessage,
            verdict: verdict ?? 'Reviewed',
            reviewedAt: new Date().toISOString(),
            ticketStatus: 'Closed',
          },
        },
      }
    )

    // Send email to patient
    const patientEmail = patient?.email ?? ''
    const patientName = patient?.fullName ?? 'Patient'
    const doctorName = doctorProfile?.fullName ?? 'Doctor'

    if (patientEmail) {
      const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const details = typeof analysis.details === 'object' ? analysis.details as Record<string, unknown> : {}
      const diagnosis = (details?.Diagnosis as string) || analysis.data || 'Skin Analysis'
      const riskLevel = (details?.Risk_Level as string) || 'Low'
      const isHighRisk = riskLevel.includes('High')

      await sendEmail({
        to: patientEmail,
        subject: `👨‍⚕️ Dr. ${doctorName} reviewed your skin analysis — ${verdict ?? 'See details'}`,
        htmlBody: `
          <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:0;background:#f0f4ff;">
            <div style="background:linear-gradient(135deg,#1d4ed8,#4f46e5);padding:28px 24px;text-align:center;border-radius:12px 12px 0 0;">
              <h1 style="color:white;margin:0;font-size:22px;">DermaSense AI</h1>
              <p style="color:#bfdbfe;margin:4px 0 0;font-size:12px;">Skin Analysis Review</p>
            </div>
            <div style="background:${isHighRisk ? '#fef2f2' : '#f0fdf4'};border-left:5px solid ${isHighRisk ? '#ef4444' : '#16a34a'};padding:14px 24px;">
              <p style="color:${isHighRisk ? '#991b1b' : '#166534'};font-weight:bold;margin:0;font-size:15px;">
                ${isHighRisk ? '⚠️' : '✅'} ${verdict ?? 'Analysis Reviewed'} — ${diagnosis}
              </p>
            </div>
            <div style="background:white;padding:24px;">
              <p style="color:#374151;">Hi <strong>${patientName}</strong>,</p>
              <p style="color:#6b7280;font-size:14px;">Dr. <strong>${doctorName}</strong> has reviewed your skin analysis and provided the following feedback:</p>
              <div style="background:#f8fafc;border-left:4px solid #1d4ed8;padding:16px;margin:16px 0;border-radius:4px;">
                <p style="color:#1e293b;margin:0;font-style:italic;line-height:1.6;">"${doctorMessage}"</p>
              </div>
              <table style="width:100%;border-collapse:collapse;margin-top:12px;">
                <tr><td style="padding:6px 0;color:#64748b;font-size:13px;width:130px;">Diagnosis</td><td style="color:#1e293b;font-size:13px;font-weight:600;">${diagnosis}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Risk Level</td><td style="color:${isHighRisk ? '#dc2626' : '#16a34a'};font-size:13px;font-weight:600;">${riskLevel}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Status</td><td style="color:#1e293b;font-size:13px;font-weight:600;">✅ Ticket Closed</td></tr>
              </table>
              ${isHighRisk ? '<div style="background:#fff7ed;border-radius:8px;padding:12px;margin-top:16px;"><p style="color:#92400e;margin:0;">⚕️ <strong>Please book an appointment with Dr. ' + doctorName + ' for a detailed in-person review.</strong></p></div>' : ''}
              <div style="text-align:center;margin-top:24px;">
                <a href="${APP_URL}/dashboard/skin-tickets" style="background:linear-gradient(135deg,#1d4ed8,#4f46e5);color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block;">View Full Report →</a>
              </div>
            </div>
            <div style="padding:14px 24px;text-align:center;background:#f8fafc;border-radius:0 0 12px 12px;border-top:1px solid #e2e8f0;">
              <p style="color:#9ca3af;font-size:11px;margin:0;">DermaSense AI · support@dermaai.com</p>
            </div>
          </div>`,
        textBody: `Dr. ${doctorName} reviewed your skin analysis.\n\nDiagnosis: ${diagnosis}\nRisk: ${riskLevel}\n\nDoctor's message:\n"${doctorMessage}"\n\nView: ${APP_URL}/dashboard/skin-tickets`,
      })
    }

    return NextResponse.json({
      success: true,
      analysisId: id,
      ticketStatus: 'Closed',
      emailSent: !!patientEmail,
    })
  } catch (err) {
    console.error('[Analysis Review POST]', err)
    return NextResponse.json({ error: 'Failed to review analysis' }, { status: 500 })
  }
}
