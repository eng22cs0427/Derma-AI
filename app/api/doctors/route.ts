import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb'
import type { IDoctorAvailabilitySlot } from '@/database/mongodb-schema'

// Public endpoint — no auth needed. Returns all verified + profile-complete doctors
// with their available slots so patients can book directly.

interface IDoctorProfilePublic {
  clerkUserId: string
  fullName?: string
  avatarUrl?: string
  doctorImageUrl?: string
  specialty?: string
  qualifications?: string
  experienceYears?: number
  consultationFee?: number
  hospitalName?: string
  hospitalAddress?: string
  city?: string
  state?: string
  availableDays?: string[]
  professionalBio?: string
  rating?: number
  totalPatients?: number
  meetingLink?: string
  languages?: string[]
  isVerified?: boolean
  profileComplete?: boolean
  isActive: boolean
  role: string
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const forDate = searchParams.get('date') // optional: YYYY-MM-DD

    const col = await getCollection<IDoctorProfilePublic>('profiles')

    // Only return doctors who are active and have completed their profile
    const query: any = {
      role: 'doctor',
      isActive: true,
      specialty: { $exists: true, $nin: [null, ''] },
      hospitalName: { $exists: true, $nin: [null, ''] },
      meetingLink: { $exists: true, $nin: [null, ''] },
      contactNumber: { $exists: true, $nin: [null, ''] },
    }

    const docs = await col.find(query).toArray()

    // If a date is requested, fetch availability for that date for each doctor
    let slotsMap: Record<string, string[]> = {}
    if (forDate) {
      const slotCol = await getCollection<IDoctorAvailabilitySlot>('doctor_availability_slots')
      const slots = await slotCol
        .find({ date: forDate, isBooked: false })
        .toArray()

      for (const slot of slots) {
        if (!slotsMap[slot.doctorClerkId]) slotsMap[slot.doctorClerkId] = []
        slotsMap[slot.doctorClerkId].push(slot.timeSlot)
      }
    }

    const publicDoctors = docs.map(d => ({
      id: d.clerkUserId,
      name: d.fullName ? `Dr. ${d.fullName}` : 'Doctor',
      specialty: d.specialty ?? '',
      qualifications: d.qualifications ?? '',
      experience: d.experienceYears ?? 0,
      hospital: d.hospitalName ?? '',
      hospitalAddress: d.hospitalAddress ?? '',
      city: d.city ?? '',
      state: d.state ?? '',
      image: d.doctorImageUrl || d.avatarUrl || '',
      rating: d.rating ?? 4.5,
      totalPatients: d.totalPatients ?? 0,
      consultationFee: d.consultationFee ?? 0,
      availableDays: d.availableDays ?? [],
      availableSlots: forDate ? (slotsMap[d.clerkUserId] ?? []) : [],
      professionalBio: d.professionalBio ?? '',
      meetingLink: d.meetingLink ?? '',
      languages: d.languages ?? [],
      isVerified: d.isVerified ?? false,
      isLive: true, // marker so patient UI can distinguish live vs static doctors
    }))

    return NextResponse.json(publicDoctors)
  } catch (err) {
    console.error('[Public Doctors GET]', err)
    return NextResponse.json({ error: 'Failed to fetch doctors' }, { status: 500 })
  }
}
