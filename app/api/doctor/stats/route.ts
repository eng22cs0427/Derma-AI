import { NextResponse } from 'next/server'
import { query } from '@/lib/aws-database'

// GET summary stats for the doctor dashboard
export async function GET() {
  try {
    const [patientCount, analysisCount, highRiskCount, recentCount] = await Promise.all([
      query(`SELECT COUNT(*) AS count FROM profiles WHERE role = 'patient' AND is_active = true`, []),
      query(`SELECT COUNT(*) AS count FROM medical_history WHERE type = 'Analysis'`, []),
      query(`SELECT COUNT(*) AS count FROM medical_history WHERE type = 'Analysis' AND (details->>'Risk_Level' = 'Very High' OR details->>'Risk_Level' = 'High')`, []),
      query(`SELECT COUNT(*) AS count FROM medical_history WHERE type = 'Analysis' AND date >= NOW() - INTERVAL '7 days'`, []),
    ])

    return NextResponse.json({
      totalPatients: parseInt(patientCount.rows[0].count),
      totalAnalyses: parseInt(analysisCount.rows[0].count),
      highRiskCases: parseInt(highRiskCount.rows[0].count),
      recentAnalyses: parseInt(recentCount.rows[0].count),
    })
  } catch (error) {
    console.error('GET /api/doctor/stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
