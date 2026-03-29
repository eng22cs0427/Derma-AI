import { NextResponse } from 'next/server'
import { query } from '@/lib/aws-database'

// GET all analyses across all patients for doctor review
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId') // optional filter

    let sql = `
      SELECT
        mh.id,
        mh.data,
        mh.details,
        mh.date,
        p.id AS patient_id,
        p.full_name AS patient_name,
        p.email AS patient_email,
        p.date_of_birth,
        p.gender,
        p.contact_number
      FROM medical_history mh
      JOIN profiles p ON mh.user_id = p.id
      WHERE mh.type = 'Analysis'
    `
    const params: string[] = []

    if (patientId) {
      sql += ` AND p.id = $1`
      params.push(patientId)
    }

    sql += ` ORDER BY mh.date DESC LIMIT 200`

    const result = await query(sql, params)
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('GET /api/doctor/analyses error:', error)
    return NextResponse.json({ error: 'Failed to fetch analyses' }, { status: 500 })
  }
}
