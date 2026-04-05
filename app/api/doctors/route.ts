import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb'
import type { IProfile } from '@/database/mongodb-schema'

interface IDoctorProfile extends IProfile {
  specialty?: string
  consultationFee?: number
  hospitalName?: string
  rating?: number
  totalPatients?: number
  doctorImageUrl?: string
  availableDays?: string[]
  qualifications?: string
  experienceYears?: number
}

export async function GET() {
  try {
    const col = await getCollection<IDoctorProfile>('profiles')
    const doctors = await col.find({ role: 'doctor', isActive: true }).toArray()

    return NextResponse.json(
      doctors.map((doc) => ({
        id: doc._id!.toString(),
        clerkUserId: doc.clerkUserId,
        name: doc.fullName || doc.email.split('@')[0],
        email: doc.email,
        specialty: doc.specialty || 'General Dermatology',
        subspecialty: 'Clinical Dermatology',
        hospital: doc.hospitalName || 'DermaSense Certified Partner',
        rating: doc.rating || 5.0,
        experience: doc.experienceYears || 5,
        consultationFee: doc.consultationFee || 500,
        image: doc.doctorImageUrl || doc.avatarUrl || '',
        availableToday: true,
        nextAvailable: 'Today',
        location: 'Online',
        qualifications: doc.qualifications || 'MD Dermatology',
        languages: ['English'],
        telemedicine: true,
        isRealDoctor: true,
      }))
    )
  } catch (error) {
    console.error('GET /api/doctors error:', error)
    return NextResponse.json([], { status: 200 })
  }
}
