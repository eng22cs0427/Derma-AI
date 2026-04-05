import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { getCollection, ObjectId } from '@/lib/mongodb'
import type { IProfile } from '@/database/mongodb-schema'

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
      return NextResponse.json({ userId, email, fullName, avatarUrl: clerkUser?.imageUrl, role: 'doctor', _dbOffline: true })
    }

    return NextResponse.json({
      userId: doc.clerkUserId, email: doc.email, fullName: doc.fullName ?? '',
      avatarUrl: doc.avatarUrl ?? null, dateOfBirth: doc.dateOfBirth ?? null,
      gender: doc.gender ?? null, contactNumber: doc.contactNumber ?? null,
      address: doc.address ?? null, city: doc.city ?? null, state: doc.state ?? null,
      country: doc.country ?? null, postalCode: doc.postalCode ?? null, bio: doc.bio ?? null,
      role: doc.role ?? 'doctor', isOnboarded: doc.isOnboarded ?? false,
      createdAt: doc.createdAt, updatedAt: doc.updatedAt,
      specialty: doc.specialty ?? null, qualifications: doc.qualifications ?? null,
      experienceYears: doc.experienceYears ?? null, consultationFee: doc.consultationFee ?? null,
      hospitalName: doc.hospitalName ?? null, hospitalAddress: doc.hospitalAddress ?? null,
      availableDays: doc.availableDays ?? [], availableSlots: doc.availableSlots ?? {},
      isVerified: doc.isVerified ?? false, professionalBio: doc.professionalBio ?? null,
      rating: doc.rating ?? null, totalPatients: doc.totalPatients ?? 0,
      doctorImageUrl: doc.doctorImageUrl ?? null,
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
    const {
      fullName, dateOfBirth, gender, contactNumber, address, city, state, country, postalCode, bio, avatarUrl,
      specialty, qualifications, experienceYears, consultationFee, hospitalName,
      hospitalAddress, availableDays, availableSlots, professionalBio, doctorImageUrl,
    } = body

    const $set: Partial<IDoctorProfile> = { updatedAt: new Date() }
    if (fullName !== undefined) $set.fullName = fullName
    if (dateOfBirth !== undefined) $set.dateOfBirth = dateOfBirth || undefined
    if (gender !== undefined) $set.gender = gender ? (gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase()) : undefined
    if (contactNumber !== undefined) $set.contactNumber = contactNumber
    if (address !== undefined) $set.address = address
    if (city !== undefined) $set.city = city
    if (state !== undefined) $set.state = state
    if (country !== undefined) $set.country = country
    if (postalCode !== undefined) $set.postalCode = postalCode
    if (bio !== undefined) $set.bio = bio
    if (avatarUrl !== undefined) $set.avatarUrl = avatarUrl
    if (specialty !== undefined) $set.specialty = specialty
    if (qualifications !== undefined) $set.qualifications = qualifications
    if (experienceYears !== undefined) $set.experienceYears = parseInt(String(experienceYears), 10) || undefined
    if (consultationFee !== undefined) $set.consultationFee = parseFloat(String(consultationFee)) || undefined
    if (hospitalName !== undefined) $set.hospitalName = hospitalName
    if (hospitalAddress !== undefined) $set.hospitalAddress = hospitalAddress
    if (availableDays !== undefined) $set.availableDays = availableDays
    if (availableSlots !== undefined) $set.availableSlots = availableSlots
    if (professionalBio !== undefined) $set.professionalBio = professionalBio
    if (doctorImageUrl !== undefined) $set.doctorImageUrl = doctorImageUrl

    const col = await getCollection<IDoctorProfile>('profiles')
    await col.updateOne({ clerkUserId: userId }, { $set })
    const updated = await col.findOne({ clerkUserId: userId, isActive: true })

    return NextResponse.json({
      userId: updated!.clerkUserId, email: updated!.email, fullName: updated!.fullName,
      specialty: updated!.specialty, consultationFee: updated!.consultationFee,
      hospitalName: updated!.hospitalName, availableDays: updated!.availableDays,
      updatedAt: updated!.updatedAt,
    })
  } catch (error) {
    console.error('[Doctor Profile PUT]', error)
    return NextResponse.json({ error: 'Failed to update doctor profile' }, { status: 500 })
  }
}
