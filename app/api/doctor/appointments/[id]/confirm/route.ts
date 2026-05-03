import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getCollection, ObjectId } from '@/lib/mongodb'
import type { IAppointment, IProfile, IDoctorAvailabilitySlot } from '@/database/mongodb-schema'
import { sendDoctorConfirmedAppointmentEmail } from '@/lib/email'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: apptId } = await params
    if (!apptId || !ObjectId.isValid(apptId)) {
      return NextResponse.json({ error: 'Invalid appointment ID' }, { status: 400 })
    }

    const apptCol = await getCollection<IAppointment>('appointments')
    const appointment = await apptCol.findOne({ _id: new ObjectId(apptId) })

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    // Get the doctor's profile to pull meeting link and details
    const profileCol = await getCollection<IProfile & {
      specialty?: string
      hospitalName?: string
      meetingLink?: string
      contactNumber?: string
    }>('profiles')

    const doctorProfile = await profileCol.findOne({ clerkUserId: userId, isActive: true })
    if (!doctorProfile) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 })
    }

    const patientProfile = await profileCol.findOne({ _id: appointment.patientId })

    // Update appointment status to Confirmed and stamp meeting link from doctor's profile
    const meetingLink = doctorProfile.meetingLink ?? appointment.meetingLink ?? ''
    const now = new Date()

    await apptCol.updateOne(
      { _id: new ObjectId(apptId) },
      {
        $set: {
          status: 'Confirmed',
          confirmedAt: now,
          meetingLink,
          emailSent: false, // will flip after email
          updatedAt: now,
        },
      }
    )

    // Mark availability slot as booked
    const slotCol = await getCollection<IDoctorAvailabilitySlot>('doctor_availability_slots')
    await slotCol.updateOne(
      {
        doctorClerkId: userId,
        date: appointment.appointmentDate,
        timeSlot: appointment.appointmentTime,
      },
      { $set: { isBooked: true, appointmentId: new ObjectId(apptId), updatedAt: now } }
    )

    // Send email to patient
    const patientEmail = patientProfile?.email ?? ''
    const patientName = patientProfile?.fullName ?? appointment.doctorName ?? 'Patient'
    const doctorName = doctorProfile.fullName ?? appointment.doctorName

    if (patientEmail) {
      try {
        await sendDoctorConfirmedAppointmentEmail({
          to: patientEmail,
          patientName,
          doctorName,
          specialty: doctorProfile.specialty ?? appointment.specialty ?? 'Dermatologist',
          hospitalName: doctorProfile.hospitalName ?? '',
          hospitalAddress: (doctorProfile as Record<string, unknown>).hospitalAddress as string ?? '',
          date: appointment.appointmentDate,
          time: appointment.appointmentTime,
          meetingLink,
          fee: appointment.fee ?? appointment.billAmount ?? 0,
          doctorPhone: doctorProfile.contactNumber ?? '',
          licenseNumber: (doctorProfile as Record<string, unknown>).licenseNumber as string ?? '',
        })

        // Mark email sent
        await apptCol.updateOne(
          { _id: new ObjectId(apptId) },
          { $set: { emailSent: true } }
        )
      } catch (emailErr) {
        // Don't fail the whole confirm if email fails
        console.warn('[Appointment Confirm] Email send failed:', emailErr)
      }
    }

    return NextResponse.json({
      success: true,
      appointmentId: apptId,
      status: 'Confirmed',
      meetingLink,
      emailSent: !!patientEmail,
    })
  } catch (err) {
    console.error('[Appointment Confirm POST]', err)
    return NextResponse.json({ error: 'Failed to confirm appointment' }, { status: 500 })
  }
}
