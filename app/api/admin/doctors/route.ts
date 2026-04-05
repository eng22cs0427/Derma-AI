import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { getCollection } from '@/lib/mongodb'
import type { IProfile } from '@/database/mongodb-schema'

async function requireAdmin() {
  const { userId } = await auth()
  if (!userId) return { error: 'Unauthenticated', status: 401 }
  const user = await clerkClient().then((c) => c.users.getUser(userId))
  const primaryEmail = user.emailAddresses?.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress || user.emailAddresses?.[0]?.emailAddress
  if (primaryEmail !== 'sabareeshsp7@gmail.com') {
    return { error: 'Forbidden — admin only', status: 403 }
  }
  return { userId, email: primaryEmail }
}

export async function GET() {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const col = await getCollection<IProfile>('profiles')
    const doctors = await col.find({ role: 'doctor', isActive: true }).sort({ fullName: 1 }).toArray()
    return NextResponse.json({
      doctors: doctors.map((d) => ({
        clerkUserId: d.clerkUserId, email: d.email, full_name: d.fullName,
        role: d.role, contact_number: d.contactNumber, is_onboarded: d.isOnboarded,
        created_at: d.createdAt, updated_at: d.updatedAt,
      })),
    })
  } catch (error: unknown) {
    console.error('[Admin/Doctors GET]', error)
    return NextResponse.json({ error: 'Failed to fetch doctors' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const a = await requireAdmin()
    if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
    const { email } = await req.json() as { email: string }
    if (!email?.includes('@')) return NextResponse.json({ error: 'Valid email required' }, { status: 400 })

    const col = await getCollection<IProfile>('profiles')
    const profile = await col.findOne({ email, isActive: true })
    if (!profile) return NextResponse.json({ error: `No profile for ${email}. User must register first.` }, { status: 404 })
    if (profile.role === 'doctor') return NextResponse.json({ error: `${email} is already a doctor.` }, { status: 409 })

    await col.updateOne({ email }, { $set: { role: 'doctor', updatedAt: new Date() } })
    if (profile.clerkUserId) {
      try {
        const client = await clerkClient()
        await client.users.updateUser(profile.clerkUserId, { publicMetadata: { role: 'doctor' } })
      } catch (e) { console.warn('[Admin/Doctors] Clerk update failed:', e) }
    }
    return NextResponse.json({ success: true, message: `${profile.fullName || email} promoted to Doctor.` })
  } catch (error: unknown) {
    console.error('[Admin/Doctors POST]', error)
    return NextResponse.json({ error: 'Failed to promote to doctor' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const a = await requireAdmin()
    if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
    const { email } = await req.json() as { email: string }
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const col = await getCollection<IProfile>('profiles')
    const profile = await col.findOne({ email, isActive: true })
    if (!profile) return NextResponse.json({ error: `No profile for ${email}` }, { status: 404 })
    if (profile.role !== 'doctor') return NextResponse.json({ error: `${email} is not a doctor.` }, { status: 400 })

    await col.updateOne({ email }, { $set: { role: 'patient', updatedAt: new Date() } })
    if (profile.clerkUserId) {
      try {
        const client = await clerkClient()
        await client.users.updateUser(profile.clerkUserId, { publicMetadata: { role: 'patient' } })
      } catch (e) { console.warn('[Admin/Doctors] Clerk update failed:', e) }
    }
    return NextResponse.json({ success: true, message: `${profile.fullName || email} demoted to Patient.` })
  } catch (error: unknown) {
    console.error('[Admin/Doctors DELETE]', error)
    return NextResponse.json({ error: 'Failed to demote doctor' }, { status: 500 })
  }
}
