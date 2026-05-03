import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getCollection, ObjectId } from '@/lib/mongodb'
import type { IAppointment, IProfile, IDoctorAvailabilitySlot, IDoctorNotification, IPatientNotification } from '@/database/mongodb-schema'
import { sendEmail } from '@/lib/email-internal'

function parseAppointmentDateTime(dateStr: string, timeStr: string): Date {
  // dateStr: "YYYY-MM-DD", timeStr: "HH:mm AM/PM"
  const [datePart] = dateStr.split('T')
  const dateObj = new Date(datePart)
  
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (match) {
    let hours = parseInt(match[1], 10)
    const minutes = parseInt(match[2], 10)
    const ampm = match[3].toUpperCase()
    if (ampm === 'PM' && hours < 12) hours += 12
    if (ampm === 'AM' && hours === 12) hours = 0
    dateObj.setHours(hours, minutes, 0, 0)
  }
  return dateObj
}

// GET /api/appointments/[id] — fetch appointment details
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params

    const apptCol = await getCollection<IAppointment>('appointments')
    const appt = await apptCol.findOne({ _id: new ObjectId(id) })
    if (!appt) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ ...appt, id: appt._id!.toString() })
  } catch (err) {
    console.error('[Appointment GET by ID]', err)
    return NextResponse.json({ error: 'Failed to fetch appointment' }, { status: 500 })
  }
}

// PATCH /api/appointments/[id] — doctor confirms/rejects, or patient cancels
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { action, notes } = body // action: 'confirm' | 'reject' | 'cancel' | 'complete'
    const { id } = await params

    const apptCol = await getCollection<IAppointment>('appointments')
    const appt = await apptCol.findOne({ _id: new ObjectId(id) })
    if (!appt) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })

    const profileCol = await getCollection<IProfile>('profiles')
    const userProfile = await profileCol.findOne({ clerkUserId: userId })
    const isPatient = userProfile?.role === 'patient' || (!userProfile?.role)
    const isDoctor = userProfile?.role === 'doctor'

    const now = new Date()
    const apptDateTime = parseAppointmentDateTime(appt.appointmentDate, appt.appointmentTime)
    const hoursDifference = (apptDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    // Patient cancelling
    if (action === 'cancel' && isPatient) {
      if (hoursDifference < 24) {
        return NextResponse.json({ error: 'Appointments can only be cancelled at least 24 hours in advance.' }, { status: 400 })
      }
    }

    let newStatus: IAppointment['status'] = appt.status
    if (action === 'confirm') newStatus = 'Confirmed'
    if (action === 'reject') newStatus = 'Cancelled'
    if (action === 'cancel') newStatus = 'Cancelled'
    if (action === 'complete') newStatus = 'Completed'

    await apptCol.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: newStatus, notes: notes || appt.notes, confirmedAt: now, updatedAt: now } }
    )

    // Unbook the slot if cancelled or rejected
    if (newStatus === 'Cancelled') {
      const slotCol = await getCollection<IDoctorAvailabilitySlot>('doctor_availability_slots')
      if (appt.doctorClerkId) {
        await slotCol.updateOne(
          { doctorClerkId: appt.doctorClerkId, date: appt.appointmentDate, timeSlot: appt.appointmentTime },
          { $set: { isBooked: false, updatedAt: now } }
        )
      }
    }

    const doctorNotifCol = await getCollection<IDoctorNotification>('doctor_notifications')
    const patientNotifCol = await getCollection<IPatientNotification>('patient_notifications')
    
    // Fire confirmation email to patient when doctor confirms
    if (action === 'confirm') {
      const patient = await profileCol.findOne({ _id: appt.patientId })
      const doctor = await profileCol.findOne({ clerkUserId: appt.doctorClerkId!, role: 'doctor' })

      if (patient) {
        const meetingLink = appt.meetingLink || (doctor as any)?.meetingLink || ''
        const emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f0fdf4; border-radius: 12px;">
            <div style="background: #065f46; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
              <h1 style="color: white; margin: 0; font-size: 22px;">DermaSense AI</h1>
              <p style="color: #6ee7b7; margin: 4px 0 0; font-size: 13px;">Appointment Confirmed</p>
            </div>
            <h2 style="color: #065f46;">Your appointment is confirmed!</h2>
            <p style="color: #374151;">Dear ${patient.fullName || 'Patient'},</p>
            <p style="color: #374151;">${appt.doctorName} has confirmed your appointment.</p>
            
            <div style="background: white; border: 1px solid #d1fae5; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #065f46; margin-top: 0;">Appointment Details</h3>
              <p style="margin: 6px 0;"><strong>Doctor:</strong> ${appt.doctorName}</p>
              <p style="margin: 6px 0;"><strong>Specialty:</strong> ${appt.specialty || ''}</p>
              <p style="margin: 6px 0;"><strong>Date:</strong> ${appt.appointmentDate}</p>
              <p style="margin: 6px 0;"><strong>Time:</strong> ${appt.appointmentTime}</p>
              <p style="margin: 6px 0;"><strong>Type:</strong> ${appt.appointmentType || 'Video Call'}</p>
              ${appt.fee ? `<p style="margin: 6px 0;"><strong>Fee:</strong> ₹${appt.fee}</p>` : ''}
              ${meetingLink ? `<p style="margin: 6px 0;"><strong>Meeting Link:</strong> <a href="${meetingLink}" style="color: #059669;">${meetingLink}</a></p>` : ''}
            </div>
            
            ${doctor ? `
            <div style="background: white; border: 1px solid #d1fae5; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #065f46; margin-top: 0;">Doctor Information</h3>
              <p style="margin: 6px 0;"><strong>Hospital:</strong> ${(doctor as any).hospitalName || ''}</p>
              <p style="margin: 6px 0;"><strong>Contact:</strong> ${doctor.contactNumber || ''}</p>
              <p style="margin: 6px 0;"><strong>Email:</strong> ${doctor.email}</p>
            </div>` : ''}

            <p style="color: #6b7280; font-size: 13px;">Please have your skin analysis report ready before the consultation. You can access your reports from the DermaSense AI dashboard.</p>
            <p style="color: #6b7280; font-size: 13px;">If you need to cancel or reschedule, please do so at least 24 hours in advance through your dashboard.</p>
          </div>
        `

        await sendEmail({
          to: patient.email,
          subject: `Your appointment with ${appt.doctorName} is confirmed — ${appt.appointmentDate}`,
          htmlBody: emailHtml,
          textBody: `Your appointment with ${appt.doctorName} on ${appt.appointmentDate} at ${appt.appointmentTime} is confirmed. ${meetingLink ? `Meeting link: ${meetingLink}` : ''}`,
        })

        if (doctor) {
          await patientNotifCol.insertOne({
            patientId: patient._id!,
            doctorId: doctor._id,
            title: 'Appointment Confirmed',
            message: `Your appointment with ${appt.doctorName} on ${appt.appointmentDate} at ${appt.appointmentTime} has been confirmed.`,
            type: 'Appointment',
            read: false,
            createdAt: now
          })
        }
      }
    }

    // Doctor rejects appointment
    if (action === 'reject') {
      const patient = await profileCol.findOne({ _id: appt.patientId })
      const doctor = await profileCol.findOne({ clerkUserId: appt.doctorClerkId!, role: 'doctor' })
      if (patient) {
        await sendEmail({
          to: patient.email,
          subject: `Appointment request update — ${appt.appointmentDate}`,
          htmlBody: `<p>Dear ${patient.fullName || 'Patient'},</p><p>Unfortunately, your appointment request with ${appt.doctorName} on ${appt.appointmentDate} could not be confirmed at this time. Please try booking a different slot.</p>`,
          textBody: `Your appointment request with ${appt.doctorName} on ${appt.appointmentDate} was not confirmed. Please rebook.`,
        })

        if (doctor) {
          await patientNotifCol.insertOne({
            patientId: patient._id!,
            doctorId: doctor._id,
            title: 'Appointment Declined',
            message: `Your appointment request with ${appt.doctorName} for ${appt.appointmentDate} was declined.`,
            type: 'Appointment',
            read: false,
            createdAt: now
          })
        }
      }
    }

    // Patient cancels appointment
    if (action === 'cancel' && isPatient) {
      const doctor = await profileCol.findOne({ clerkUserId: appt.doctorClerkId!, role: 'doctor' })
      const patient = await profileCol.findOne({ _id: appt.patientId })
      if (doctor && patient) {
        await doctorNotifCol.insertOne({
          doctorId: doctor._id!,
          patientId: patient._id,
          title: 'Appointment Cancelled',
          message: `${patient.fullName || 'A patient'} cancelled their appointment on ${appt.appointmentDate} at ${appt.appointmentTime}.`,
          type: 'Appointment',
          read: false,
          createdAt: now
        })

        await sendEmail({
          to: doctor.email,
          subject: `Appointment Cancelled — ${appt.appointmentDate}`,
          htmlBody: `<p>Dear Dr. ${doctor.fullName || 'Doctor'},</p><p>${patient.fullName || 'A patient'} has cancelled their appointment scheduled for ${appt.appointmentDate} at ${appt.appointmentTime}.</p>`,
          textBody: `${patient.fullName || 'A patient'} has cancelled their appointment on ${appt.appointmentDate} at ${appt.appointmentTime}.`,
        })
      }
    }

    return NextResponse.json({ success: true, status: newStatus })
  } catch (err) {
    console.error('[Appointment PATCH]', err)
    return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 })
  }
}
