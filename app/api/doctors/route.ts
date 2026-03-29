import { NextResponse } from 'next/server';
import { query } from '@/lib/aws-database';

export async function GET() {
  try {
    const result = await query(
      `SELECT id, full_name, email, avatar_url, specialty 
       FROM profiles 
       WHERE role = 'doctor' AND is_active = true`
    );

    const doctors = result.rows.map(doc => ({
      id: doc.id,
      name: doc.full_name || doc.email.split('@')[0],
      specialty: doc.specialty || "General Dermatology",
      subspecialty: "Clinical Dermatology",
      hospital: "DermaSense Certified Partner",
      rating: 5.0,
      reviews: 1,
      experience: 5,
      image: doc.avatar_url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E",
      availableToday: true,
      nextAvailable: "Today",
      consultationFee: 500,
      location: "Online",
      about: `Certified DermaSense affiliated practitioner specializing in skin analysis and consultation.`,
      education: ["MD Dermatology"],
      languages: ["English"],
      telemedicine: true,
      isRealDoctor: true
    }));

    return NextResponse.json(doctors, { status: 200 });
  } catch (error) {
    console.error('GET /api/doctors error:', error);
    return NextResponse.json([], { status: 200 }); // Degrade gracefully
  }
}
