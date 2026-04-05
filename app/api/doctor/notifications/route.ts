import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { getCollection, ObjectId } from '@/lib/mongodb'
import type { IProfile, IMedicalHistory, IDoctorNotification } from '@/database/mongodb-schema'

export async function GET() {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const email = user.emailAddresses?.[0]?.emailAddress || ''
    const profiles = await getCollection<IProfile>('profiles')
    const docProfile = await profiles.findOne({ $or: [{ clerkUserId: user.id }, { email }] })
    const docId = docProfile?._id

    const histCol = await getCollection<IMedicalHistory>('medical_history')
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

    // Recent analyses from all patients
    const recentAnalyses = await histCol
      .find({ type: 'Analysis', date: { $gte: last24h } })
      .sort({ date: -1 })
      .limit(10)
      .toArray()

    const analysisItems = await Promise.all(
      recentAnalyses.map(async (r) => {
        const patient = await profiles.findOne({ _id: r.userId })
        const details = r.details as Record<string, string> | undefined
        return {
          id: `ana_${r._id!.toString()}`,
          patientName: patient?.fullName || 'Unknown Patient',
          patientEmail: patient?.email || '',
          diagnosis: details?.Diagnosis || r.data,
          riskLevel: details?.Risk_Level || 'Low',
          date: r.date,
          message: `${patient?.fullName || 'A patient'} submitted a new skin analysis`,
          type: 'Analysis',
          link: '/doctor-dashboard/analyses',
        }
      })
    )

    let notificationItems = [...analysisItems]

    // Doctor-specific appointment notifications
    if (docId) {
      const notifCol = await getCollection<IDoctorNotification>('doctor_notifications')
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)

      const apptNotifs = await notifCol
        .find({ doctorId: docId, createdAt: { $gte: threeDaysAgo } })
        .sort({ createdAt: -1 })
        .limit(15)
        .toArray()

      const apptItems = await Promise.all(
        apptNotifs.map(async (n) => {
          const patient = n.patientId ? await profiles.findOne({ _id: n.patientId }) : null
          return {
            id: `appt_${n._id!.toString()}`,
            patientName: patient?.fullName || 'Patient',
            patientEmail: '' as string,
            diagnosis: '' as string,
            riskLevel: '' as string,
            message: n.message,
            title: n.title as string,
            type: n.type as string,
            date: n.createdAt,
            link: n.link as string,
          }
        })
      )

      notificationItems = [...notificationItems, ...apptItems]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 20)
    }

    return NextResponse.json({ count: notificationItems.length, notifications: notificationItems })
  } catch (error) {
    console.error('[doctor/notifications GET]', error)
    return NextResponse.json({ count: 0, notifications: [] }, { status: 200 })
  }
}
