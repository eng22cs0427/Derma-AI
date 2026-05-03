import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb'
import type { IDoctorAvailabilitySlot } from '@/database/mongodb-schema'

// Public endpoint — patients query slots for a specific doctor + date
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const doctorId = searchParams.get('doctorId')   // clerkUserId of doctor
    const date = searchParams.get('date')           // YYYY-MM-DD

    if (!doctorId || !date) {
      return NextResponse.json({ error: 'doctorId and date are required' }, { status: 400 })
    }

    const col = await getCollection<IDoctorAvailabilitySlot>('doctor_availability_slots')
    const slots = await col
      .find({ doctorClerkId: doctorId, date })
      .sort({ timeSlot: 1 })
      .toArray()

    return NextResponse.json(slots.map(s => ({
      id: s._id!.toString(),
      date: s.date,
      timeSlot: s.timeSlot,
      isBooked: s.isBooked,
    })))
  } catch (err) {
    console.error('[Doctor Slots GET]', err)
    return NextResponse.json({ error: 'Failed to fetch slots' }, { status: 500 })
  }
}
