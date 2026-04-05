/**
 * MongoDB Atlas Connection Singleton
 * Replaces: lib/aws-database.ts (PostgreSQL / AWS RDS)
 * Free tier: MongoDB Atlas M0 (512MB) + $50 credit
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

async function connect(): Promise<Db> {
  if (global.__mongoClient) {
    return global.__mongoClient.db(DB_NAME)
  }

  const client = new MongoClient(uri || '', {
    maxPoolSize: 10,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 10000,
  })

  await client.connect()

  if (process.env.NODE_ENV !== 'production') {
    global.__mongoClient = client
  }

  const db = client.db(DB_NAME)

  // Ensure indexes on first connect
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
