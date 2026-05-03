import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { getCollection } from '@/lib/mongodb'
import type { IProfile, IMedicalHistory } from '@/database/mongodb-schema'

export async function GET() {
  try {
    const profiles = await getCollection<IProfile>('profiles')
    const histCol = await getCollection<IMedicalHistory>('medical_history')

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [totalPatients, totalAnalyses, highRiskCases, recentAnalyses] = await Promise.all([
      profiles.countDocuments({ role: { $ne: 'doctor' } }),
      histCol.countDocuments({ type: 'Analysis' }),
      histCol.countDocuments({
        type: 'Analysis',
        $or: [
          { 'details.Risk_Level': 'Very High' },
          { 'details.Risk_Level': 'High' },
        ],
      }),
      histCol.countDocuments({ type: 'Analysis', date: { $gte: sevenDaysAgo } }),
    ])

    const user = await currentUser()
    let doctorName = 'Doctor'
    if (user) {
      const docProfile = await profiles.findOne({ clerkUserId: user.id })
      if (docProfile?.fullName) doctorName = docProfile.fullName.split(' ')[0]
    }

    return NextResponse.json({ totalPatients, totalAnalyses, highRiskCases, recentAnalyses, doctorName })
  } catch (error) {
    console.error('GET /api/doctor/stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
