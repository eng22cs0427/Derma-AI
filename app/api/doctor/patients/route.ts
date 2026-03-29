import { NextResponse } from 'next/server'
import { query } from '@/lib/aws-database'

// GET all patients with their latest analysis summary
export async function GET() {
  try {
    const result = await query(
      `SELECT 
        p.id,
        p.full_name,
        p.email,
        p.gender,
        p.date_of_birth,
        p.contact_number,
        p.city,
        p.created_at,
        COUNT(DISTINCT mh.id) FILTER (WHERE mh.type = 'Analysis') AS total_analyses,
        COUNT(DISTINCT a.id) AS total_appointments,
        (
          SELECT mh2.data FROM medical_history mh2
          WHERE mh2.user_id = p.id AND mh2.type = 'Analysis'
          ORDER BY mh2.date DESC LIMIT 1
        ) AS latest_analysis,
        (
          SELECT mh2.date FROM medical_history mh2
          WHERE mh2.user_id = p.id AND mh2.type = 'Analysis'
          ORDER BY mh2.date DESC LIMIT 1
        ) AS latest_analysis_date,
        (
          SELECT (mh2.details->>'Risk_Level') FROM medical_history mh2
          WHERE mh2.user_id = p.id AND mh2.type = 'Analysis'
          ORDER BY mh2.date DESC LIMIT 1
        ) AS latest_risk_level
       FROM profiles p
       LEFT JOIN medical_history mh ON mh.user_id = p.id
       LEFT JOIN appointments a ON a.user_id = p.id
       WHERE p.role = 'patient' AND p.is_active = true
       GROUP BY p.id
       ORDER BY latest_analysis_date DESC NULLS LAST`,
      []
    )
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('GET /api/doctor/patients error:', error)
    return NextResponse.json({ error: 'Failed to fetch patients' }, { status: 500 })
  }
}
