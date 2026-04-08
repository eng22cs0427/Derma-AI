/**
 * MongoDB Atlas Connection Singleton
 * Optimised for Vercel serverless — caches client across warm invocations.
 */
import { MongoClient, Db, Collection, ObjectId } from 'mongodb'

const uri = process.env.MONGODB_URI!
const DB_NAME = process.env.MONGODB_DB_NAME || 'dermasense_db'

if (!uri && process.env.NODE_ENV !== 'test') {
  console.warn('[MongoDB] MONGODB_URI not set — database calls will fail')
}

declare global {
  // eslint-disable-next-line no-var
  var __mongoClient: MongoClient | undefined
}

// Module-level cache — survives warm serverless re-invocations in production
let _moduleClient: MongoClient | undefined

async function connect(): Promise<Db> {
  // Use cached client (global for dev HMR, module-level for prod serverless)
  const cached = global.__mongoClient ?? _moduleClient
  if (cached) {
    return cached.db(DB_NAME)
  }

  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set. Add it to your Vercel project settings.')
  }

  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  })

  await client.connect()

  // Cache in both global (dev) AND module-level (prod) so Vercel keeps it warm
  global.__mongoClient = client
  _moduleClient = client

  const db = client.db(DB_NAME)

  // Ensure indexes on first connect (non-fatal)
  try {
    await ensureIndexes(db)
  } catch {
    // Non-fatal — indexes may already exist
  }

  return db
}

async function ensureIndexes(db: Db) {
  await db.collection('profiles').createIndex({ clerkUserId: 1 }, { unique: true })
  await db.collection('profiles').createIndex({ email: 1 }, { unique: true })
  await db.collection('profiles').createIndex({ role: 1 })

  await db.collection('skin_analyses').createIndex({ userId: 1 })
  await db.collection('skin_analyses').createIndex({ createdAt: -1 })
  await db.collection('skin_analyses').createIndex({ riskLevel: 1 })

  await db.collection('medical_history').createIndex({ userId: 1 })
  await db.collection('medical_history').createIndex({ date: -1 })
  await db.collection('medical_history').createIndex({ type: 1 })

  await db.collection('appointments').createIndex({ patientId: 1 })
  await db.collection('appointments').createIndex({ doctorId: 1 })
  await db.collection('appointments').createIndex({ appointmentDate: -1 })

  await db.collection('orders').createIndex({ userId: 1 })
  await db.collection('orders').createIndex({ orderNumber: 1 }, { unique: true })

  await db.collection('doctor_notifications').createIndex({ doctorId: 1 })
  await db.collection('doctor_notifications').createIndex({ createdAt: -1 })

  await db.collection('audit_logs').createIndex({ userId: 1 })
  await db.collection('audit_logs').createIndex({ createdAt: -1 })
}

export async function getDb(): Promise<Db> {
  return await connect()
}

export async function getCollection<T extends object = Record<string, unknown>>(
  name: string
): Promise<Collection<T>> {
  const db = await getDb()
  return db.collection<T>(name)
}

export { ObjectId }
