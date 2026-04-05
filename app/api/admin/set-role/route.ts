import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { getCollection } from '@/lib/mongodb'
import type { IProfile } from '@/database/mongodb-schema'

export async function POST(req: Request) {
  try {
    const { sessionClaims } = await auth()
    const requesterRole = (sessionClaims?.publicMetadata as Record<string, unknown>)?.role
    if (requesterRole !== 'admin') {
      // Allow in dev for easy setup; enforce in production
      if (process.env.NODE_ENV === 'production') {
        return new NextResponse('Unauthorized — admin only', { status: 403 })
      }
    }

    const body = await req.json()
    const { email, role } = body

    if (!email || !role) return new NextResponse('Missing email or role', { status: 400 })
    if (!['doctor', 'patient', 'admin'].includes(role)) return new NextResponse('Invalid role', { status: 400 })

    const client = await clerkClient()

    // Find user in Clerk
    const users = await client.users.getUserList({ emailAddress: [email] })
    if (users.data.length === 0) {
      return new NextResponse(`User ${email} not found in Clerk`, { status: 404 })
    }

    const clerkUserId = users.data[0].id

    // Update Clerk metadata
    await client.users.updateUser(clerkUserId, { publicMetadata: { role } })

    // Update MongoDB
    const col = await getCollection<IProfile>('profiles')
    await col.updateOne(
      { $or: [{ email }, { clerkUserId }] },
      { $set: { role, updatedAt: new Date() } }
    )

    return NextResponse.json({ success: true, message: `Updated ${email} to role ${role}` })
  } catch (error) {
    console.error('[SET_ROLE_ERROR]', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
