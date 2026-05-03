import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { getCollection } from '@/lib/mongodb'
import type { IProfile } from '@/database/mongodb-schema'

// Extends IProfile with all doctor-specific fields stored in same collection
interface IDoctorProfile extends IProfile {
  specialty?: string
  qualifications?: string
  experienceYears?: number
  consultationFee?: number
  hospitalName?: string
  hospitalAddress?: string
  availableDays?: string[]
  availableSlots?: Record<string, unknown>
  isVerified?: boolean
  professionalBio?: string
  rating?: number
  totalPatients?: number
  doctorImageUrl?: string
  // New mandatory fields
  meetingLink?: string
  licenseNumber?: string
  licenseDocumentUrl?: string
  languages?: string[]
  profileComplete?: boolean
}

// These fields must be filled before the doctor can access the dashboard
const MANDATORY_FIELDS: (keyof IDoctorProfile)[] = [
  'contactNumber',
  'specialty',
  'qualifications',
  'experienceYears',
  'hospitalName',
  'hospitalAddress',
  'meetingLink',
  'licenseNumber',
]

function checkProfileComplete(doc: IDoctorProfile): boolean {
  return MANDATORY_FIELDS.every(field => {
    const val = doc[field]
    if (val === undefined || val === null || val === '') return false
    return true
  })
}

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const col = await getCollection<IDoctorProfile>('profiles')
    const doc = await col.findOne({ clerkUserId: userId, isActive: true })

    if (!doc) {
      const clerkUser = await currentUser()
      const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? ''
      const fullName = `${clerkUser?.firstName ?? ''} ${clerkUser?.lastName ?? ''}`.trim()
      return NextResponse.json({
        userId, email, fullName,
        avatarUrl: clerkUser?.imageUrl,
        role: 'doctor',
        profileComplete: false,
        _dbOffline: true,
      })
    }

    const profileComplete = checkProfileComplete(doc)

    return NextResponse.json({
      userId: doc.clerkUserId,
      email: doc.email,
      fullName: doc.fullName ?? '',
      avatarUrl: doc.avatarUrl ?? null,
      dateOfBirth: doc.dateOfBirth ?? null,
      gender: doc.gender ?? null,
      contactNumber: doc.contactNumber ?? null,
      address: doc.address ?? null,
      city: doc.city ?? null,
      state: doc.state ?? null,
      country: doc.country ?? null,
      postalCode: doc.postalCode ?? null,
      bio: doc.bio ?? null,
      role: doc.role ?? 'doctor',
      isOnboarded: doc.isOnboarded ?? false,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      specialty: doc.specialty ?? null,
      qualifications: doc.qualifications ?? null,
      experienceYears: doc.experienceYears ?? null,
      consultationFee: doc.consultationFee ?? null,
      hospitalName: doc.hospitalName ?? null,
      hospitalAddress: doc.hospitalAddress ?? null,
      availableDays: doc.availableDays ?? [],
      availableSlots: doc.availableSlots ?? {},
      isVerified: doc.isVerified ?? false,
      professionalBio: doc.professionalBio ?? null,
      rating: doc.rating ?? null,
      totalPatients: doc.totalPatients ?? 0,
      doctorImageUrl: doc.doctorImageUrl ?? null,
      meetingLink: doc.meetingLink ?? null,
      licenseNumber: doc.licenseNumber ?? null,
      licenseDocumentUrl: doc.licenseDocumentUrl ?? null,
      languages: doc.languages ?? [],
      profileComplete,
    })
  } catch (error) {
    console.error('[Doctor Profile GET]', error)
    return NextResponse.json({ error: 'Failed to fetch doctor profile' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()

    // Validate meeting link if provided
    if (body.meetingLink && !isValidUrl(body.meetingLink)) {
      return NextResponse.json(
        { error: 'Meeting link must be a valid URL (starting with http:// or https://)' },
        { status: 400 }
      )
    }

    // Validate phone number format
    if (body.contactNumber) {
      const phoneClean = body.contactNumber.replace(/\D/g, '')
      if (phoneClean.length < 10 || phoneClean.length > 15) {
        return NextResponse.json(
          { error: 'Contact number must be 10–15 digits' },
          { status: 400 }
        )
      }
    }

    const $set: Partial<IDoctorProfile> = { updatedAt: new Date() }

    const fields: (keyof IDoctorProfile)[] = [
      'fullName', 'dateOfBirth', 'gender', 'contactNumber', 'address',
      'city', 'state', 'country', 'postalCode', 'bio', 'avatarUrl',
      'specialty', 'qualifications', 'experienceYears', 'consultationFee',
      'hospitalName', 'hospitalAddress', 'availableDays', 'availableSlots',
      'professionalBio', 'doctorImageUrl', 'meetingLink', 'licenseNumber',
      'licenseDocumentUrl', 'languages',
    ]

    for (const field of fields) {
      if (body[field] !== undefined) {
        if (field === 'experienceYears') {
          ;($set as Record<string, unknown>)[field] = parseInt(String(body[field]), 10) || undefined
        } else if (field === 'consultationFee') {
          ;($set as Record<string, unknown>)[field] = parseFloat(String(body[field])) || undefined
        } else if (field === 'gender' && body[field]) {
          ;($set as Record<string, unknown>)[field] =
            body[field].charAt(0).toUpperCase() + body[field].slice(1).toLowerCase()
        } else {
          ;($set as Record<string, unknown>)[field] = body[field]
        }
      }
    }

    const col = await getCollection<IDoctorProfile>('profiles')
    await col.updateOne({ clerkUserId: userId }, { $set })

    const updated = await col.findOne({ clerkUserId: userId, isActive: true })
    if (!updated) {
      return NextResponse.json({ error: 'Profile not found after update' }, { status: 404 })
    }

    const profileComplete = checkProfileComplete(updated)
    // Mark isOnboarded once mandatory fields are all filled
    if (profileComplete && !updated.isOnboarded) {
      await col.updateOne({ clerkUserId: userId }, { $set: { isOnboarded: true, profileComplete: true } })
    }

    return NextResponse.json({
      userId: updated.clerkUserId,
      email: updated.email,
      fullName: updated.fullName,
      specialty: updated.specialty,
      consultationFee: updated.consultationFee,
      hospitalName: updated.hospitalName,
      availableDays: updated.availableDays,
      meetingLink: updated.meetingLink,
      licenseNumber: updated.licenseNumber,
      contactNumber: updated.contactNumber,
      profileComplete,
      updatedAt: updated.updatedAt,
    })
  } catch (error) {
    console.error('[Doctor Profile PUT]', error)
    return NextResponse.json({ error: 'Failed to update doctor profile' }, { status: 500 })
  }
}
