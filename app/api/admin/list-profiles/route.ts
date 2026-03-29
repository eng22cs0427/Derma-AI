/**
 * GET /api/admin/list-profiles
 * Dev-only: lists all profiles so we can see what emails/roles exist.
 * Remove this file before going to production.
 */
import { NextResponse } from 'next/server'
import { query } from '@/lib/aws-database'

export async function GET() {
  try {
    const result = await query(
      `SELECT email, full_name, role, is_onboarded, created_at
       FROM profiles WHERE is_active = true ORDER BY created_at DESC`,
      []
    )
    return NextResponse.json({ profiles: result.rows })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
