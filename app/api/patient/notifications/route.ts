import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getCollection } from '@/lib/mongodb'
import type { IProfile, IPatientNotification } from '@/database/mongodb-schema'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profiles = await getCollection<IProfile>('profiles')
    const patientProfile = await profiles.findOne({ clerkUserId: userId })
    if (!patientProfile) {
      return NextResponse.json({ count: 0, notifications: [] }, { status: 200 })
    }

    const notifCol = await getCollection<IPatientNotification>('patient_notifications')
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const notifications = await notifCol
      .find({ patientId: patientProfile._id!, createdAt: { $gte: thirtyDaysAgo } })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray()

    const enriched = await Promise.all(
      notifications.map(async (n) => {
        let doctorName = 'Doctor'
        if (n.doctorId) {
          const doc = await profiles.findOne({ _id: n.doctorId })
          if (doc && doc.fullName) doctorName = doc.fullName
        }

        return {
          id: n._id!.toString(),
          title: n.title,
          message: n.message,
          type: n.type,
          doctorName,
          date: n.createdAt,
          link: n.link,
          read: n.read,
        }
      })
    )

    return NextResponse.json({ count: enriched.filter(n => !n.read).length, notifications: enriched })
  } catch (error) {
    console.error('[patient/notifications GET]', error)
    return NextResponse.json({ count: 0, notifications: [] }, { status: 200 })
  }
}
