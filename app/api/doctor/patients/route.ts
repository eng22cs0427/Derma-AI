import { NextResponse } from 'next/server'
import { getCollection, ObjectId } from '@/lib/mongodb'
import type { IProfile, IMedicalHistory, IAppointment } from '@/database/mongodb-schema'

export async function GET() {
  try {
    const profiles = await getCollection<IProfile>('profiles')
    const histCol = await getCollection<IMedicalHistory>('medical_history')
    const apptCol = await getCollection<IAppointment>('appointments')

    const patients = await profiles
      .find({ role: { $ne: 'doctor' } })
      .sort({ createdAt: -1 })
      .toArray()

    const enriched = await Promise.all(
      patients.map(async (p) => {
        const pid = p._id!

        const [analysisDocs, apptCount] = await Promise.all([
          histCol
            .find({ userId: pid, type: 'Analysis' })
            .sort({ date: -1 })
            .limit(1)
            .toArray(),
          apptCol.countDocuments({ patientId: pid }),
        ])

        const totalAnalyses = await histCol.countDocuments({ userId: pid, type: 'Analysis' })
        const latest = analysisDocs[0]

        return {
          id: pid.toString(),
          full_name: p.fullName,
          email: p.email,
          gender: p.gender,
          date_of_birth: p.dateOfBirth,
          contact_number: p.contactNumber,
          city: p.city,
          created_at: p.createdAt,
          total_analyses: totalAnalyses,
          total_appointments: apptCount,
          latest_analysis: latest?.data ?? null,
          latest_analysis_date: latest?.date ?? null,
          latest_risk_level: (latest?.details as Record<string, string>)?.Risk_Level ?? null,
        }
      })
    )

    return NextResponse.json(enriched)
  } catch (error) {
    console.error('GET /api/doctor/patients error:', error)
    return NextResponse.json({ error: 'Failed to fetch patients' }, { status: 500 })
  }
}
