import { NextResponse } from 'next/server'
import { getCollection, ObjectId } from '@/lib/mongodb'
import type { IProfile, IMedicalHistory } from '@/database/mongodb-schema'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')

    const histCol = await getCollection<IMedicalHistory>('medical_history')
    const profiles = await getCollection<IProfile>('profiles')

    const filter: Record<string, unknown> = { type: 'Analysis' }
    if (patientId && ObjectId.isValid(patientId)) {
      filter.userId = new ObjectId(patientId)
    }

    const analyses = await histCol
      .find(filter)
      .sort({ date: -1 })
      .limit(200)
      .toArray()

    // Enrich with patient data
    const enriched = await Promise.all(
      analyses.map(async (a) => {
        const patient = await profiles.findOne({ _id: a.userId })
        return {
          id: a._id!.toString(),
          data: a.data,
          details: a.details,
          date: a.date,
          patient_id: a.userId.toString(),
          patient_name: patient?.fullName ?? 'Unknown',
          patient_email: patient?.email ?? '',
          date_of_birth: patient?.dateOfBirth,
          gender: patient?.gender,
          contact_number: patient?.contactNumber,
        }
      })
    )

    return NextResponse.json(enriched)
  } catch (error) {
    console.error('GET /api/doctor/analyses error:', error)
    return NextResponse.json({ error: 'Failed to fetch analyses' }, { status: 500 })
  }
}
