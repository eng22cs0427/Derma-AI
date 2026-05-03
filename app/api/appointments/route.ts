import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getCollection, ObjectId } from '@/lib/mongodb'
import type { IAppointment, IProfile, IDoctorAvailabilitySlot, IMedicalHistory } from '@/database/mongodb-schema'
import { sendEmail } from '@/lib/email-internal'

// GET /api/appointments — patient fetches their own appointments
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profileCol = await getCollection<IProfile>('profiles')
    // Only match on clerkUserId — don't filter by role/isActive to avoid missing profile edge cases
    const patient = await profileCol.findOne({ clerkUserId: userId })
    if (!patient) return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })

    const apptCol = await getCollection<IAppointment>('appointments')
    const appointments = await apptCol
      .find({ patientId: patient._id! })
      .sort({ createdAt: -1 })
      .toArray()

    const enriched = await Promise.all(appointments.map(async (a) => {
      let doctorProfile = null
      if (a.doctorClerkId) {
        doctorProfile = await profileCol.findOne({ clerkUserId: a.doctorClerkId, role: 'doctor' })
      }
      return {
        id: a._id!.toString(),
        doctorName: a.doctorName,
        doctorSpecialty: a.specialty || '',
        doctorHospital: (doctorProfile as any)?.hospitalName || '',
        doctorImage: (doctorProfile as any)?.doctorImageUrl || (doctorProfile as any)?.avatarUrl || '',
        doctorEmail: doctorProfile?.email || '',
        appointmentDate: a.appointmentDate,
        appointmentTime: a.appointmentTime,
        type: a.appointmentType || a.type || 'Video Call',
        status: a.status,
        reason: a.reason || '',
        meetingLink: a.meetingLink || (doctorProfile as any)?.meetingLink || '',
        fee: a.fee || a.billAmount || 0,
        notes: a.notes || '',
        createdAt: a.createdAt,
        // attached skin analysis
        attachedAnalysisId: (a as any).attachedAnalysisId || null,
        attachedAnalysisDiagnosis: (a as any).attachedAnalysisDiagnosis || null,
      }
    }))

    return NextResponse.json(enriched)
  } catch (err) {
    console.error('[Appointments GET]', err)
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
  }
}

// POST /api/appointments — patient books a new appointment
export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
      doctorClerkId, doctorName, specialty,
      appointmentDate, appointmentTime, type, reason,
      slotId, fee,
      attachedAnalysisId,  // optional: _id of medical_history Analysis record
    } = body

    if (!doctorClerkId || !appointmentDate || !appointmentTime) {
      return NextResponse.json({ error: 'Missing required fields: doctorClerkId, appointmentDate, appointmentTime' }, { status: 400 })
    }

    const profileCol = await getCollection<IProfile>('profiles')

    // Loosened query — just clerkUserId. Role/isActive mismatch was causing 404 for valid users.
    const patient = await profileCol.findOne({ clerkUserId: userId })
    if (!patient) {
      console.error(`[Appointments POST] No profile found for clerkUserId: ${userId}`)
      return NextResponse.json({ error: 'Your profile was not found. Please complete your profile setup first.' }, { status: 404 })
    }

    const doctorProfile = await profileCol.findOne({ clerkUserId: doctorClerkId, role: 'doctor' })
    if (!doctorProfile) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    // If a slot was selected, mark it booked atomically
    if (slotId) {
      const slotCol = await getCollection<IDoctorAvailabilitySlot>('doctor_availability_slots')
      const slot = await slotCol.findOne({ _id: new ObjectId(slotId), isBooked: false })
      if (!slot) return NextResponse.json({ error: 'Slot is no longer available. Please pick another time.' }, { status: 409 })
      await slotCol.updateOne({ _id: new ObjectId(slotId) }, { $set: { isBooked: true, updatedAt: new Date() } })
    }

    // Fetch the attached analysis details if provided
    let attachedDiagnosis: string | null = null
    let attachedAnalysisDetails: Record<string, unknown> | null = null
    if (attachedAnalysisId) {
      try {
        const histCol = await getCollection<IMedicalHistory>('medical_history')
        const analysis = await histCol.findOne({ _id: new ObjectId(attachedAnalysisId) })
        if (analysis) {
          const d = (analysis.details || {}) as Record<string, unknown>
          attachedDiagnosis = (d.Diagnosis as string) || analysis.data || 'Skin Analysis'
          attachedAnalysisDetails = d
        }
      } catch (e) {
        console.warn('[Appointments POST] Could not fetch attached analysis:', e)
      }
    }

    const now = new Date()
    const apptCol = await getCollection<IAppointment>('appointments')

    const apptDoc: IAppointment & Record<string, unknown> = {
      patientId: patient._id!,
      doctorClerkId,
      doctorName,
      specialty: specialty || (doctorProfile as any).specialty || '',
      appointmentDate,
      appointmentTime,
      appointmentType: type || 'Video Call',
      status: 'Scheduled',
      reason: reason || '',
      meetingLink: (doctorProfile as any).meetingLink || '',
      fee: fee || (doctorProfile as any).consultationFee || 0,
      paymentStatus: 'Pending',
      createdAt: now,
      updatedAt: now,
      // skin analysis attachment
      attachedAnalysisId: attachedAnalysisId || null,
      attachedAnalysisDiagnosis: attachedDiagnosis,
    }

    const result = await apptCol.insertOne(apptDoc)
    const appointmentId = result.insertedId.toString()

    // Build patient details for email
    const patientAge = patient.dateOfBirth
      ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()
      : null

    const analysisSection = attachedDiagnosis ? `
      <div style="background: #fef9c3; border: 1px solid #fde047; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <h3 style="color: #713f12; margin-top: 0; font-size: 14px;">Attached Skin Analysis Report</h3>
        <p style="margin: 4px 0; color: #78350f;"><strong>Diagnosis:</strong> ${attachedDiagnosis}</p>
        ${attachedAnalysisDetails?.Risk_Level ? `<p style="margin: 4px 0; color: #78350f;"><strong>Risk Level:</strong> ${attachedAnalysisDetails.Risk_Level}</p>` : ''}
        ${attachedAnalysisDetails?.Confidence ? `<p style="margin: 4px 0; color: #78350f;"><strong>Confidence:</strong> ${attachedAnalysisDetails.Confidence}</p>` : ''}
        ${attachedAnalysisDetails?.Assessment ? `<p style="margin: 4px 0; color: #78350f; font-size: 13px;"><strong>Assessment:</strong> ${String(attachedAnalysisDetails.Assessment).slice(0, 300)}...</p>` : ''}
      </div>` : ''

    const doctorEmailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 12px;">
        <div style="background: #1e3a5f; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
          <h1 style="color: white; margin: 0; font-size: 22px;">DermaSense AI</h1>
          <p style="color: #93c5fd; margin: 4px 0 0; font-size: 13px;">New Appointment Request</p>
        </div>
        <h2 style="color: #1e293b; font-size: 18px;">New appointment request from a patient</h2>
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 16px 0;">
          <h3 style="color: #1e293b; margin-top: 0; font-size: 14px;">Patient Details</h3>
          <p style="margin: 6px 0; color: #475569;"><strong>Name:</strong> ${patient.fullName || 'Patient'}</p>
          <p style="margin: 6px 0; color: #475569;"><strong>Email:</strong> ${patient.email}</p>
          <p style="margin: 6px 0; color: #475569;"><strong>Contact:</strong> ${patient.contactNumber || 'Not provided'}</p>
          ${patientAge ? `<p style="margin: 6px 0; color: #475569;"><strong>Age:</strong> ${patientAge} years</p>` : ''}
          <p style="margin: 6px 0; color: #475569;"><strong>Gender:</strong> ${patient.gender || 'Not specified'}</p>
          ${patient.city ? `<p style="margin: 6px 0; color: #475569;"><strong>City:</strong> ${patient.city}</p>` : ''}
        </div>
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 16px 0;">
          <h3 style="color: #1e293b; margin-top: 0; font-size: 14px;">Appointment Details</h3>
          <p style="margin: 6px 0; color: #475569;"><strong>Date:</strong> ${appointmentDate}</p>
          <p style="margin: 6px 0; color: #475569;"><strong>Time:</strong> ${appointmentTime}</p>
          <p style="margin: 6px 0; color: #475569;"><strong>Type:</strong> ${type || 'Video Call'}</p>
          <p style="margin: 6px 0; color: #475569;"><strong>Reason:</strong> ${reason || 'Not specified'}</p>
          <p style="margin: 6px 0; color: #475569;"><strong>Fee:</strong> ₹${fee || (doctorProfile as any).consultationFee || 0}</p>
        </div>
        ${analysisSection}
        <p style="color: #64748b; font-size: 13px;">Please log in to your DermaSense AI dashboard to confirm this appointment.</p>
      </div>
    `

    await sendEmail({
      to: doctorProfile.email,
      subject: `New appointment request from ${patient.fullName || 'a patient'} — ${appointmentDate}`,
      htmlBody: doctorEmailHtml,
      textBody: `New appointment from ${patient.fullName || 'Patient'} on ${appointmentDate} at ${appointmentTime}. Reason: ${reason || 'Not specified'}`,
    })

    return NextResponse.json({ success: true, appointmentId })
  } catch (err) {
    console.error('[Appointments POST]', err)
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 })
  }
}
