/**
 * /api/doctor/profile
 *
 * GET  — Fetch the logged-in doctor's full profile (profiles + doctors table joined)
 * PUT  — Update professional details stored in the doctors table
 *
 * The `doctors` table stores professional information (specialty, hospital, fee, etc.)
 * The `profiles` table stores personal info (name, contact, address, etc.)
 * Both are updated via this single endpoint — keeps the UI simple.
 */

import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { query } from '@/lib/aws-database'

function isDbTimeout(err: unknown): boolean {
  const code = (err as any)?.code ?? ''
  const msg = ((err as Error)?.message ?? '').toLowerCase()
  return code === 'ETIMEDOUT' || msg.includes('etimedout') || msg.includes('timeout') || msg.includes('connection terminated')
}

// ─── GET: Full doctor profile ──────────────────────────────────────────────────
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let rows: any[] = []
    try {
      const result = await query(
        `SELECT
           p.cognito_user_id,
           p.email,
           p.full_name,
           p.avatar_url,
           p.date_of_birth,
           p.gender,
           p.contact_number,
           p.address,
           p.city,
           p.state,
           p.country,
           p.postal_code,
           p.bio,
           p.role,
           p.is_onboarded,
           p.created_at,
           p.updated_at,
           -- Professional details from doctors table (NULL if not yet filled)
           d.id            AS doctor_record_id,
           d.specialty,
           d.qualifications,
           d.experience_years,
           d.consultation_fee,
           d.hospital_name,
           d.hospital_address,
           d.available_days,
           d.available_slots,
           d.is_verified,
           d.bio           AS professional_bio,
           d.rating,
           d.total_patients,
           d.doctor_image_url
         FROM profiles p
         LEFT JOIN doctors d ON d.profile_id = p.id
         WHERE p.cognito_user_id = $1 AND p.is_active = true
         LIMIT 1`,
        [userId]
      )
      rows = result.rows
    } catch (dbErr) {
      if (isDbTimeout(dbErr)) {
        // Fallback from Clerk when DB is offline
        const clerkUser = await currentUser()
        const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? ''
        const fullName = `${clerkUser?.firstName ?? ''} ${clerkUser?.lastName ?? ''}`.trim()
        return NextResponse.json({
          userId, email, fullName,
          avatarUrl: clerkUser?.imageUrl ?? null,
          role: 'doctor', _dbOffline: true,
        } , { status: 200 })
      }
      throw dbErr
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 })
    }

    const r = rows[0]
    return NextResponse.json({
      // Personal
      userId:          r.cognito_user_id,
      email:           r.email,
      fullName:        r.full_name ?? '',
      avatarUrl:       r.avatar_url ?? null,
      dateOfBirth:     r.date_of_birth ?? null,
      gender:          r.gender ?? null,
      contactNumber:   r.contact_number ?? null,
      address:         r.address ?? null,
      city:            r.city ?? null,
      state:           r.state ?? null,
      country:         r.country ?? null,
      postalCode:      r.postal_code ?? null,
      bio:             r.bio ?? null,
      role:            r.role ?? 'doctor',
      isOnboarded:     r.is_onboarded ?? false,
      createdAt:       r.created_at,
      updatedAt:       r.updated_at,
      // Professional
      doctorRecordId:   r.doctor_record_id ?? null,
      specialty:        r.specialty ?? null,
      qualifications:   r.qualifications ?? null,
      experienceYears:  r.experience_years ?? null,
      consultationFee:  r.consultation_fee ?? null,
      hospitalName:     r.hospital_name ?? null,
      hospitalAddress:  r.hospital_address ?? null,
      availableDays:    r.available_days ?? [],
      availableSlots:   r.available_slots ?? {},
      isVerified:       r.is_verified ?? false,
      professionalBio:  r.professional_bio ?? null,
      rating:           r.rating ?? null,
      totalPatients:    r.total_patients ?? 0,
      doctorImageUrl:   r.doctor_image_url ?? null,
    }, { status: 200 })

  } catch (error: any) {
    console.error('[Doctor Profile GET]', error.message)
    return NextResponse.json({ error: 'Failed to fetch doctor profile' }, { status: 500 })
  }
}

// ─── PUT: Update doctor profile (personal + professional) ─────────────────────
export async function PUT(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
      // Personal fields (profiles table)
      fullName, dateOfBirth, gender, contactNumber,
      address, city, state, country, postalCode, bio, avatarUrl,
      // Professional fields (doctors table)
      specialty, qualifications, experienceYears, consultationFee,
      hospitalName, hospitalAddress, availableDays, availableSlots,
      professionalBio, doctorImageUrl,
    } = body

    // 1. Look up the DB UUID from cognito_user_id
    const profileRes = await query(
      `SELECT id FROM profiles WHERE cognito_user_id = $1 AND is_active = true LIMIT 1`,
      [userId]
    )
    if (profileRes.rows.length === 0) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    const profileDbId = profileRes.rows[0].id

    // 2. Update personal fields in profiles table
    const personalFields: string[] = []
    const personalParams: unknown[] = []
    let pi = 1

    const addPersonal = (col: string, val: unknown) => {
      if (val !== undefined) {
        personalFields.push(`${col} = $${pi++}`)
        personalParams.push(val === '' ? null : val)
      }
    }

    addPersonal('full_name', fullName)
    addPersonal('date_of_birth', dateOfBirth)
    addPersonal('gender', gender ? gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase() : gender)
    addPersonal('contact_number', contactNumber)
    addPersonal('address', address)
    addPersonal('city', city)
    addPersonal('state', state)
    addPersonal('country', country)
    addPersonal('postal_code', postalCode)
    addPersonal('bio', bio)
    addPersonal('avatar_url', avatarUrl)

    if (personalFields.length > 0) {
      personalFields.push(`updated_at = CURRENT_TIMESTAMP`)
      personalParams.push(userId)
      await query(
        `UPDATE profiles SET ${personalFields.join(', ')} WHERE cognito_user_id = $${pi}`,
        personalParams
      )
    }

    // 3. Upsert professional fields in doctors table
    const profFields: string[] = []
    const profParams: unknown[] = []
    let di = 1

    const addProf = (col: string, val: unknown) => {
      if (val !== undefined) {
        profFields.push(`${col} = $${di++}`)
        profParams.push(val)
      }
    }

    addProf('specialty', specialty)
    addProf('qualifications', qualifications)
    addProf('experience_years', experienceYears ? parseInt(String(experienceYears), 10) : undefined)
    addProf('consultation_fee', consultationFee ? parseFloat(String(consultationFee)) : undefined)
    addProf('hospital_name', hospitalName)
    addProf('hospital_address', hospitalAddress)
    addProf('available_days', availableDays ? JSON.stringify(availableDays) : undefined)
    addProf('available_slots', availableSlots ? JSON.stringify(availableSlots) : undefined)
    addProf('bio', professionalBio)
    addProf('doctor_image_url', doctorImageUrl)

    if (profFields.length > 0) {
      // Insert columns for the INSERT part of upsert
      const insertCols = profFields.map(f => f.split(' = ')[0])
      const insertParamPlaceholders = profParams.map((_, i) => `$${i + 1}`)
      const updateClauses = profFields.map((f, i) => `${f.split(' = ')[0]} = $${i + 1}`)

      await query(
        `INSERT INTO doctors (profile_id, ${insertCols.join(', ')}, updated_at)
         VALUES ($${di}, ${insertParamPlaceholders.join(', ')}, CURRENT_TIMESTAMP)
         ON CONFLICT (profile_id)
         DO UPDATE SET ${updateClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP`,
        [...profParams, profileDbId]
      )
    }

    // 4. Re-fetch the updated profile
    const updated = await GET_profile(userId)
    return NextResponse.json(updated, { status: 200 })

  } catch (error: any) {
    console.error('[Doctor Profile PUT]', error.message)
    if (isDbTimeout(error)) {
      return NextResponse.json(
        { error: 'Database unreachable — changes could not be saved.', _dbOffline: true },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: 'Failed to update doctor profile' }, { status: 500 })
  }
}

// ─── Internal helper to re-fetch profile after update ─────────────────────────
async function GET_profile(userId: string) {
  const result = await query(
    `SELECT p.*, d.id AS doctor_record_id, d.specialty, d.qualifications,
            d.experience_years, d.consultation_fee, d.hospital_name, d.hospital_address,
            d.available_days, d.available_slots, d.is_verified, d.bio AS professional_bio,
            d.rating, d.total_patients, d.doctor_image_url
     FROM profiles p
     LEFT JOIN doctors d ON d.profile_id = p.id
     WHERE p.cognito_user_id = $1 AND p.is_active = true LIMIT 1`,
    [userId]
  )
  const r = result.rows[0]
  return {
    userId: r.cognito_user_id, email: r.email, fullName: r.full_name ?? '',
    avatarUrl: r.avatar_url, dateOfBirth: r.date_of_birth, gender: r.gender,
    contactNumber: r.contact_number, address: r.address, city: r.city,
    state: r.state, country: r.country, postalCode: r.postal_code, bio: r.bio,
    role: r.role, isOnboarded: r.is_onboarded, createdAt: r.created_at, updatedAt: r.updated_at,
    doctorRecordId: r.doctor_record_id, specialty: r.specialty,
    qualifications: r.qualifications, experienceYears: r.experience_years,
    consultationFee: r.consultation_fee, hospitalName: r.hospital_name,
    hospitalAddress: r.hospital_address, availableDays: r.available_days ?? [],
    availableSlots: r.available_slots ?? {}, isVerified: r.is_verified ?? false,
    professionalBio: r.professional_bio, rating: r.rating,
    totalPatients: r.total_patients ?? 0, doctorImageUrl: r.doctor_image_url,
  }
}
