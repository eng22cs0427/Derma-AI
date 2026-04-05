import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { getUserProfile, updateUserProfile } from '@/lib/profile-sync'

function isDbError(err: unknown): boolean {
  const msg = ((err as Error)?.message ?? '').toLowerCase()
  return msg.includes('timeout') || msg.includes('econnrefused') || msg.includes('network')
}

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let profile
    try {
      profile = await getUserProfile(userId)
    } catch (dbErr) {
      if (isDbError(dbErr)) {
        const clerkUser = await currentUser()
        const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? ''
        const fullName = `${clerkUser?.firstName ?? ''} ${clerkUser?.lastName ?? ''}`.trim() || email.split('@')[0]
        console.warn('[Profile API] DB unreachable — returning Clerk fallback for', userId)
        return NextResponse.json({
          userId, email, fullName,
          avatarUrl: clerkUser?.imageUrl ?? null,
          role: 'patient', isActive: true, isOnboarded: true,
          _dbOffline: true,
        }, { status: 200 })
      }
      throw dbErr
    }

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    return NextResponse.json({
      userId: profile.userId, email: profile.email, fullName: profile.fullName,
      avatarUrl: profile.avatarUrl, dateOfBirth: profile.dateOfBirth, gender: profile.gender,
      contactNumber: profile.contactNumber, address: profile.address, city: profile.city,
      state: profile.state, country: profile.country, postalCode: profile.postalCode,
      bio: profile.bio, role: profile.role || 'patient', isActive: profile.isActive,
      isOnboarded: profile.isOnboarded, medicalInfo: profile.medicalInfo,
      createdAt: profile.createdAt, updatedAt: profile.updatedAt,
    })
  } catch (error) {
    console.error('GET /api/profile error:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const {
      fullName, dateOfBirth, gender, contactNumber, address, city, state,
      country, postalCode, bio, avatarUrl, isOnboarded, medicalInfo,
    } = body

    const updates: Record<string, unknown> = {}
    if (fullName !== undefined) updates.fullName = fullName
    if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth === '' ? null : dateOfBirth
    if (gender !== undefined) updates.gender = gender || null
    if (contactNumber !== undefined) updates.contactNumber = contactNumber
    if (address !== undefined) updates.address = address
    if (city !== undefined) updates.city = city
    if (state !== undefined) updates.state = state
    if (country !== undefined) updates.country = country
    if (postalCode !== undefined) updates.postalCode = postalCode
    if (bio !== undefined) updates.bio = bio
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl
    if (isOnboarded !== undefined) updates.isOnboarded = isOnboarded
    if (medicalInfo !== undefined) updates.medicalInfo = medicalInfo

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    await updateUserProfile(userId, updates as Parameters<typeof updateUserProfile>[1])
    const updatedProfile = await getUserProfile(userId)
    return NextResponse.json(updatedProfile)
  } catch (error) {
    console.error('PUT /api/profile error:', error)
    if (isDbError(error)) {
      return NextResponse.json({ error: 'Database unreachable. Try again shortly.', _dbOffline: true }, { status: 503 })
    }
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
