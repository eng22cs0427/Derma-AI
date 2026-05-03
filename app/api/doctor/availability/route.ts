import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getCollection } from '@/lib/mongodb'
import type { IDoctorAvailabilitySlot } from '@/database/mongodb-schema'

// GET: fetch all slots for a given month (year+month query params)
// POST: bulk-save slots for a date (doctor sets which times they're open)
// DELETE: remove a slot

export async function GET(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const year = searchParams.get('year') || String(new Date().getFullYear())
    const month = searchParams.get('month') || String(new Date().getMonth() + 1).padStart(2, '0')

    // Build date prefix for the month, e.g. "2026-05"
    const prefix = `${year}-${String(month).padStart(2, '0')}`

    const col = await getCollection<IDoctorAvailabilitySlot>('doctor_availability_slots')
    const slots = await col
      .find({ doctorClerkId: userId, date: { $regex: `^${prefix}` } })
      .sort({ date: 1, timeSlot: 1 })
      .toArray()

    return NextResponse.json(slots.map(s => ({
      id: s._id!.toString(),
      date: s.date,
      timeSlot: s.timeSlot,
      isBooked: s.isBooked,
      appointmentId: s.appointmentId?.toString() ?? null,
    })))
  } catch (err) {
    console.error('[Availability GET]', err)
    return NextResponse.json({ error: 'Failed to fetch slots' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    // body = { date: "2026-05-10", slots: ["09:00","09:30","10:00",...] }
    const { date, slots } = body as { date: string; slots: string[] }

    if (!date || !Array.isArray(slots)) {
      return NextResponse.json({ error: 'date and slots[] are required' }, { status: 400 })
    }

    const col = await getCollection<IDoctorAvailabilitySlot>('doctor_availability_slots')

    // Remove all non-booked slots for this date first (replacing with new set)
    await col.deleteMany({ doctorClerkId: userId, date, isBooked: false })

    if (slots.length > 0) {
      const docs: IDoctorAvailabilitySlot[] = slots.map(t => ({
        doctorClerkId: userId,
        date,
        timeSlot: t,
        isBooked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
      await col.insertMany(docs)
    }

    return NextResponse.json({ success: true, date, slotsSet: slots.length })
  } catch (err) {
    console.error('[Availability POST]', err)
    return NextResponse.json({ error: 'Failed to save slots' }, { status: 500 })
  }
}
