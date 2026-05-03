import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getCollection, ObjectId } from '@/lib/mongodb'
import type { IAppointment, IProfile } from '@/database/mongodb-schema'

// GET /api/doctor/appointments — doctor sees all appointments for them
export async function GET(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status') // optional filter

    const apptCol = await getCollection<IAppointment>('appointments')
    const profileCol = await getCollection<IProfile>('profiles')

    const query: any = { doctorClerkId: userId }
    if (statusFilter) query.status = statusFilter

    const appointments = await apptCol
      .find(query)
      .sort({ createdAt: -1 })
      .toArray()

    // Attach patient profile info for each appointment
    const enriched = await Promise.all(appointments.map(async (a) => {
      const patient = await profileCol.findOne({ _id: a.patientId })
      const patientAge = patient?.dateOfBirth
        ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()
        : null

      return {
        id: a._id!.toString(),
        patientName: patient?.fullName || 'Patient',
        patientEmail: patient?.email || '',
        patientContact: patient?.contactNumber || '',
        patientGender: patient?.gender || '',
        patientAge,
        patientCity: patient?.city || '',
        appointmentDate: a.appointmentDate,
        appointmentTime: a.appointmentTime,
        type: a.appointmentType || a.type || 'Video Call',
        status: a.status,
        reason: a.reason || '',
        fee: a.fee || 0,
        notes: a.notes || '',
        meetingLink: a.meetingLink || '',
        createdAt: a.createdAt,
        attachedAnalysisId: (a as any).attachedAnalysisId || null,
        attachedAnalysisDiagnosis: (a as any).attachedAnalysisDiagnosis || null,
      }
    }))

    return NextResponse.json(enriched)
  } catch (err) {
    console.error('[Doctor Appointments GET]', err)
    return NextResponse.json({ error: 'Failed to load appointments' }, { status: 500 })
  }
}
