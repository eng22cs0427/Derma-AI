import { NextResponse } from 'next/server'
import { getCollection, ObjectId } from '@/lib/mongodb'
import { sendAppointmentReminderEmail } from '@/lib/email'
import type { IAppointment, IProfile } from '@/database/mongodb-schema'

export async function GET() {
  try {
    // Basic auth using an API key if you want to secure the cron route
    // const authHeader = req.headers.get('authorization')
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return new Response('Unauthorized', { status: 401 })
    // }

    const apptCol = await getCollection<IAppointment>('appointments')
    const profilesCol = await getCollection<IProfile>('profiles')
    const pNotifCol = await getCollection('patient_notifications')
    const dNotifCol = await getCollection('doctor_notifications')

    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    // Find confirmed appointments where reminderSent is not true
    const appointments = await apptCol.find({
      status: 'Confirmed',
      reminderSent: { $ne: true }
    }).toArray()

    let remindersSentCount = 0

    for (const appt of appointments) {
      // appt.appointmentDate is "YYYY-MM-DD"
      // appt.appointmentTime is like "10:30 AM" or "14:30"
      if (!appt.appointmentDate || !appt.appointmentTime) continue

      let match = appt.appointmentTime.match(/(\d+):(\d+)\s*(AM|PM)/i)
      let h = 0, m = 0
      if (match) {
        h = parseInt(match[1], 10)
        m = parseInt(match[2], 10)
        const ampm = match[3].toUpperCase()
        if (ampm === 'PM' && h < 12) h += 12
        if (ampm === 'AM' && h === 12) h = 0
      } else {
        const parts = appt.appointmentTime.split(':')
        if (parts.length >= 2) {
          h = parseInt(parts[0], 10)
          m = parseInt(parts[1], 10)
        }
      }

      const [year, month, day] = appt.appointmentDate.split('-').map(Number)
      const apptDateObj = new Date(year, month - 1, day, h, m)

      // If the appointment is within the next 24 hours
      const diffMs = apptDateObj.getTime() - now.getTime()
      
      if (diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000) {
        // Send Reminder Email
        const patientProfile = await profilesCol.findOne({ _id: appt.patientId })
        const doctorProfile = await profilesCol.findOne({ clerkUserId: appt.doctorClerkId as string })

        if (patientProfile && patientProfile.email) {
          await sendAppointmentReminderEmail({
            to: patientProfile.email,
            patientName: patientProfile.fullName || 'Patient',
            doctorName: appt.doctorName,
            date: appt.appointmentDate,
            time: appt.appointmentTime,
            meetingLink: appt.meetingLink || undefined,
            type: appt.type || 'Video Call'
          })
        }

        if (doctorProfile && doctorProfile.email) {
          await sendAppointmentReminderEmail({
            to: doctorProfile.email,
            patientName: (patientProfile?.fullName) || 'Patient',
            doctorName: appt.doctorName,
            date: appt.appointmentDate,
            time: appt.appointmentTime,
            meetingLink: appt.meetingLink || undefined,
            type: appt.type || 'Video Call'
          })
        }

        // Add Patient Notification
        await pNotifCol.insertOne({
          patientId: appt.patientId,
          doctorId: doctorProfile?._id || new ObjectId(),
          title: 'Appointment Reminder',
          message: `Reminder: You have an upcoming ${appt.type} with Dr. ${appt.doctorName} tomorrow at ${appt.appointmentTime}.`,
          type: 'reminder',
          link: '/dashboard/appointments',
          read: false,
          createdAt: new Date()
        })

        // Add Doctor Notification
        await dNotifCol.insertOne({
          doctorClerkId: appt.doctorClerkId,
          patientId: appt.patientId,
          title: 'Upcoming Appointment Reminder',
          message: `Reminder: You have an upcoming ${appt.type} with ${patientProfile?.fullName || 'Patient'} tomorrow at ${appt.appointmentTime}.`,
          type: 'reminder',
          link: '/doctor-dashboard/appointments',
          read: false,
          createdAt: new Date()
        })

        // Mark as sent
        await apptCol.updateOne({ _id: appt._id }, { $set: { reminderSent: true } })
        remindersSentCount++
      }
    }

    return NextResponse.json({ success: true, remindersSentCount })
  } catch (error) {
    console.error('[CRON REMINDERS GET]', error)
    return NextResponse.json({ error: 'Failed to process reminders' }, { status: 500 })
  }
}
