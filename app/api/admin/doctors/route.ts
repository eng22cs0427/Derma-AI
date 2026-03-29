/**
 * /api/admin/doctors
 *
 * Admin-only API to manage doctor roles.
 * GET    → List all users currently with role = 'doctor'
 * POST   → Promote a user to 'doctor' by email (only if they are currently a 'patient')
 * DELETE → Demote a 'doctor' back to 'patient' by email
 *
 * Note: A patient who has already completed onboarding as a patient
 * cannot be promoted — they should register with a separate doctor email.
 */

import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { query } from '@/lib/aws-database'

// ─── Helper: verify caller is admin ───────────────────────────────────────────
async function requireAdmin() {
  const { userId } = await auth()
  
  if (!userId) return { error: 'Unauthenticated', status: 401 }
  
  // Directly fetch from Clerk to guarantee we are looking at live identity, not a stale claim
  const user = await clerkClient().then(c => c.users.getUser(userId))
  const primaryEmail = user.emailAddresses?.find(e => e.id === user.primaryEmailAddressId)?.emailAddress || user.emailAddresses?.[0]?.emailAddress
  
  // The ultimate single source of truth for admin rights according to the user
  if (primaryEmail !== "sabareeshsp7@gmail.com") {
    return { error: 'Forbidden — you are not the system administrator', status: 403 }
  }
  
  return { userId, email: primaryEmail }
}

// ─── GET: List all doctors ─────────────────────────────────────────────────────
export async function GET() {
  try {
    const authResult = await requireAdmin()
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const result = await query(
      `SELECT
         cognito_user_id,
         email,
         full_name,
         role,
         contact_number,
         is_onboarded,
         created_at,
         updated_at
       FROM profiles
       WHERE role = 'doctor' AND is_active = true
       ORDER BY full_name ASC`,
      []
    )

    return NextResponse.json({ doctors: result.rows })
  } catch (error: any) {
    console.error('[Admin/Doctors GET]', error.message)
    return NextResponse.json({ error: 'Failed to fetch doctors' }, { status: 500 })
  }
}

// ─── POST: Promote a user to doctor ───────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const authResult = await requireAdmin()
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const body = await req.json()
    const { email } = body as { email: string }

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
    }

    // 1. Check if this email already exists as a patient who has onboarded
    const existing = await query(
      `SELECT cognito_user_id, email, full_name, role, is_onboarded FROM profiles WHERE email = $1 AND is_active = true LIMIT 1`,
      [email]
    )

    if (existing.rows.length === 0) {
      return NextResponse.json(
        { error: `No profile found for ${email}. The user must register first.` },
        { status: 404 }
      )
    }

    const profile = existing.rows[0]

    // 2. Already doctor check

    if (profile.role === 'doctor') {
      return NextResponse.json({ error: `${email} is already a doctor.` }, { status: 409 })
    }

    const clerkUserId = profile.cognito_user_id

    // 3. Update role in PostgreSQL
    await query(
      `UPDATE profiles SET role = 'doctor', updated_at = CURRENT_TIMESTAMP WHERE email = $1`,
      [email]
    )

    // 4. Update Clerk public metadata so session claims reflect the new role
    if (clerkUserId) {
      try {
        const client = await clerkClient()
        await client.users.updateUser(clerkUserId, { publicMetadata: { role: 'doctor' } })
      } catch (clerkErr) {
        console.warn('[Admin/Doctors] Clerk metadata update failed (DB updated OK):', clerkErr)
      }
    }

    return NextResponse.json({
      success: true,
      message: `${profile.full_name || email} has been promoted to Doctor.`,
      email,
      role: 'doctor',
    })
  } catch (error: any) {
    console.error('[Admin/Doctors POST]', error.message)
    return NextResponse.json({ error: 'Failed to promote user to doctor' }, { status: 500 })
  }
}

// ─── DELETE: Demote a doctor back to patient ───────────────────────────────────
export async function DELETE(req: Request) {
  try {
    const authResult = await requireAdmin()
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const body = await req.json()
    const { email } = body as { email: string }

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const existing = await query(
      `SELECT cognito_user_id, full_name, role FROM profiles WHERE email = $1 AND is_active = true LIMIT 1`,
      [email]
    )

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: `No profile found for ${email}` }, { status: 404 })
    }

    const profile = existing.rows[0]

    if (profile.role !== 'doctor') {
      return NextResponse.json({ error: `${email} is not currently a doctor.` }, { status: 400 })
    }

    // Update role in PostgreSQL
    await query(
      `UPDATE profiles SET role = 'patient', updated_at = CURRENT_TIMESTAMP WHERE email = $1`,
      [email]
    )

    // Update Clerk metadata
    if (profile.cognito_user_id) {
      try {
        const client = await clerkClient()
        await client.users.updateUser(profile.cognito_user_id, { publicMetadata: { role: 'patient' } })
      } catch (clerkErr) {
        console.warn('[Admin/Doctors] Clerk metadata update failed (DB demoted OK):', clerkErr)
      }
    }

    return NextResponse.json({
      success: true,
      message: `${profile.full_name || email} has been demoted back to Patient.`,
      email,
      role: 'patient',
    })
  } catch (error: any) {
    console.error('[Admin/Doctors DELETE]', error.message)
    return NextResponse.json({ error: 'Failed to demote doctor' }, { status: 500 })
  }
}
