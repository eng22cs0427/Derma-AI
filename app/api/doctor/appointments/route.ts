import { NextResponse } from 'next/server'
import { query } from '@/lib/aws-database'

// GET all appointments for the doctor dashboard
export async function GET(request: Request) {
  try {
    // We join the profiles table to get the patient's full name, email, contact, etc.
    const sql = `
      SELECT
        a.id,
        a.patient_id,
        a.doctor_name,
        a.specialty,
        a.appointment_date,
        a.appointment_time,
        a.status,
        a.created_at,
        p.full_name AS patient_name,
        p.email AS patient_email,
        p.contact_number AS patient_contact,
        p.gender AS patient_gender,
        p.city AS patient_city
      FROM appointments a
      JOIN profiles p ON a.patient_id = p.id
      ORDER BY a.created_at DESC
      LIMIT 100
    `

    const result = await query(sql)
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('GET /api/doctor/appointments error:', error)
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
  }
}
