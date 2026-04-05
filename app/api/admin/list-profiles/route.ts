import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb'
import type { IProfile } from '@/database/mongodb-schema'

export async function GET() {
  try {
    const col = await getCollection<IProfile>('profiles')
    const profiles = await col
      .find({ isActive: true })
      .sort({ createdAt: -1 })
      .project({ email: 1, fullName: 1, role: 1, isOnboarded: 1, createdAt: 1 })
      .toArray()

    return NextResponse.json({
      profiles: profiles.map((p) => ({
        email: p.email,
        full_name: p.fullName,
        role: p.role,
        is_onboarded: p.isOnboarded,
        created_at: p.createdAt,
      })),
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
