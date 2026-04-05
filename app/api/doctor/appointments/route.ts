import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb'
import type { IProfile, IAppointment } from '@/database/mongodb-schema'

export async function GET() {
  try {
    const apptCol = await getCollection<IAppointment>('appointments')
    const profiles = await getCollection<IProfile>('profiles')

    const appointments = await apptCol
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray()

    const enriched = await Promise.all(
      appointments.map(async (a) => {
        const patient = await profiles.findOne({ _id: a.patientId })
        return {
          id: a._id!.toString(),
          patient_id: a.patientId.toString(),
          doctor_name: a.doctorName,
          specialty: a.specialty,
          appointment_date: a.appointmentDate,
          appointment_time: a.appointmentTime,
          status: a.status,
          type: a.type,
          fee: a.fee,
          created_at: a.createdAt,
          patient_name: patient?.fullName ?? 'Unknown',
          patient_email: patient?.email ?? '',
          patient_contact: patient?.contactNumber ?? '',
          patient_gender: patient?.gender ?? '',
          patient_city: patient?.city ?? '',
        }
      })
    )

    return NextResponse.json(enriched)
  } catch (error) {
    console.error('GET /api/doctor/appointments error:', error)
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
  }
}
