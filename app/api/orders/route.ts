import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { getCollection, ObjectId } from '@/lib/mongodb'
import type { IProfile, IOrder } from '@/database/mongodb-schema'

async function getProfileId(clerkUserId: string, email: string): Promise<ObjectId | null> {
  const col = await getCollection<IProfile>('profiles')
  const doc = await col.findOne({ $or: [{ clerkUserId }, { email }] })
  return doc?._id ?? null
}

export async function GET() {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const email = user.emailAddresses?.[0]?.emailAddress || ''
    const profileId = await getProfileId(user.id, email)
    if (!profileId) return NextResponse.json([], { status: 200 })

    const col = await getCollection<IOrder>('orders')
    const orders = await col.find({ userId: profileId }).sort({ createdAt: -1 }).toArray()

    return NextResponse.json(orders.map((o) => ({ ...o, id: o._id!.toString() })))
  } catch (error) {
    console.error('GET /api/orders error:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const email = user.emailAddresses?.[0]?.emailAddress || ''
    const col = await getCollection<IProfile>('profiles')
    let profileDoc = await col.findOne({ $or: [{ clerkUserId: user.id }, { email }] })

    if (!profileDoc) {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || email.split('@')[0]
      const now = new Date()
      const res = await col.insertOne({
        clerkUserId: user.id, email, fullName,
        role: 'patient', isActive: true, isOnboarded: false,
        createdAt: now, updatedAt: now,
      })
      profileDoc = await col.findOne({ _id: res.insertedId })
    }

    const body = await request.json()
    const {
      orderNumber, items, subtotal, tax, shippingCost, totalAmount,
      paymentMethod, paymentStatus, orderStatus, deliveryAddress,
    } = body

    const now = new Date()
    const orderCol = await getCollection<IOrder>('orders')
    const result = await orderCol.insertOne({
      orderNumber,
      userId: profileDoc!._id!,
      items,
      subtotal,
      tax,
      shippingCost,
      totalAmount,
      paymentMethod: paymentMethod === 'cod' ? 'COD' : 'Credit Card',
      paymentStatus: paymentMethod === 'cod' ? 'Pending' : 'Paid',
      orderStatus: orderStatus || 'Confirmed',
      deliveryAddress,
      createdAt: now,
      updatedAt: now,
    })

    return NextResponse.json({ id: result.insertedId.toString(), orderNumber }, { status: 200 })
  } catch (error) {
    console.error('POST /api/orders error:', error)
    return NextResponse.json({ error: 'Failed to save order' }, { status: 500 })
  }
}
