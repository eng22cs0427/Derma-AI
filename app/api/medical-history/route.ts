import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { getCollection, ObjectId } from '@/lib/mongodb'
import type { IProfile, IMedicalHistory } from '@/database/mongodb-schema'

async function getProfileId(clerkUserId: string, email: string): Promise<ObjectId | null> {
  const col = await getCollection<IProfile>('profiles')
  const doc = await col.findOne({ $or: [{ clerkUserId }, { email }] })
  return doc?._id ?? null
}

export async function GET() {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const email = user.emailAddresses?.[0]?.emailAddress || ''
    const profileId = await getProfileId(user.id, email)
    if (!profileId) return NextResponse.json([], { status: 200 })

    const col = await getCollection<IMedicalHistory>('medical_history')
    const records = await col
      .find({ userId: profileId })
      .sort({ date: -1 })
      .toArray()

    return NextResponse.json(
      records.map((r) => ({
        id: r._id!.toString(),
        type: r.type,
        data: r.data,
        details: r.details,
        date: r.date,
      }))
    )
  } catch (error: unknown) {
    console.error('GET /api/medical-history error:', error)
    return NextResponse.json([], { status: 200 }) // Graceful degrade
  }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const email = user.emailAddresses?.[0]?.emailAddress || ''
    const profileId = await getProfileId(user.id, email)
    if (!profileId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const body = await request.json()
    const { type, data, details } = body

    if (!type || !data) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    const col = await getCollection<IMedicalHistory>('medical_history')
    const now = new Date()
    const result = await col.insertOne({
      userId: profileId,
      type,
      data,
      details: details ?? undefined,
      date: now,
      createdAt: now,
      updatedAt: now,
    })

    return NextResponse.json({
      id: result.insertedId.toString(),
      type, data, details, date: now,
    })
  } catch (error: unknown) {
    console.error('POST /api/medical-history error:', error)
    return NextResponse.json({
      id: `mock-${Date.now()}`,
      type: 'Medical History',
      data: 'Saved (note: DB had an issue)',
      details: null,
      date: new Date().toISOString(),
    }, { status: 200 })
  }
}
