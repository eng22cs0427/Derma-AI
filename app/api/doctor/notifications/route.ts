import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { query } from '@/lib/aws-database'

// GET — returns recent new analyses and appointment notifications
export async function GET() {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const primaryEmail = user.emailAddresses?.[0]?.emailAddress || '';

    // Need doctor profile ID
    const docRes = await query(
      `SELECT id FROM profiles WHERE cognito_user_id = $1 OR email = $2 LIMIT 1`,
      [user.id, primaryEmail]
    );

    let docId = docRes.rows[0]?.id;

    // 1. Fetch analyses from last 24 hours
    const analysisRes = await query(
      `SELECT
         mh.id, mh.data, mh.details, mh.date,
         p.full_name AS patient_name, p.email AS patient_email
       FROM medical_history mh
       JOIN profiles p ON mh.user_id = p.id
       WHERE mh.type = 'Analysis' AND mh.date >= NOW() - INTERVAL '24 hours'
       ORDER BY mh.date DESC LIMIT 10`,
      []
    )

    let notificationItems = analysisRes.rows.map(r => ({
      id: "ana_" + r.id,
      patientName: r.patient_name || 'Unknown Patient',
      patientEmail: r.patient_email || '',
      diagnosis: (typeof r.details === 'string' ? JSON.parse(r.details) : r.details)?.Diagnosis || r.data,
      riskLevel: (typeof r.details === 'string' ? JSON.parse(r.details) : r.details)?.Risk_Level || 'Low',
      date: r.date,
      message: `${r.patient_name || 'A patient'} submitted a new skin analysis`,
      type: "Analysis",
      link: "/doctor-dashboard/analyses"
    }));

    // 2. Fetch specific doctor appointments notifications
    if (docId) {
      const apptRes = await query(
        `SELECT
           dn.id, dn.title, dn.message, dn.created_at, dn.link, dn.type,
           p.full_name AS patient_name
         FROM doctor_notifications dn
         LEFT JOIN profiles p ON dn.patient_id = p.id
         WHERE dn.doctor_id = $1 AND dn.created_at >= NOW() - INTERVAL '3 days'
         ORDER BY dn.created_at DESC LIMIT 15`,
        [docId]
      );

      const apptItems = apptRes.rows.map(r => ({
         id: "appt_" + r.id,
         patientName: r.patient_name || 'Patient',
         patientEmail: '',
         diagnosis: '',
         riskLevel: '',
         message: r.message,
         title: r.title,
         type: r.type,
         date: r.created_at,
         link: r.link
      }));

      notificationItems = [...notificationItems, ...apptItems].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ).slice(0, 20);
    }

    return NextResponse.json({
      count: notificationItems.length,
      notifications: notificationItems
    })
  } catch (error) {
    console.error('[doctor/notifications GET]', error)
    return NextResponse.json({ count: 0, notifications: [] }, { status: 200 })
  }
}
