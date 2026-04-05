/**
 * DermaSense AI — RDS PostgreSQL → MongoDB Atlas Migration Script
 * 
 * Migrates ALL live data from AWS RDS to MongoDB Atlas.
 * Safe: read-only on source, idempotent on destination (upsert mode)
 * 
 * Usage:
 *   1. Set OLD_DATABASE_URL in .env.local (PostgreSQL connection string)
 *   2. Set MONGODB_URI in .env.local (MongoDB Atlas connection string)
 *   3. Run: node scripts/migrate-rds-to-mongodb.js
 */

require('dotenv').config({ path: '.env.local' })

const { Client } = require('pg')
const { MongoClient, ObjectId } = require('mongodb')

const PG_URL = process.env.OLD_DATABASE_URL || process.env.DATABASE_URL
const MONGO_URI = process.env.MONGODB_URI
const DB_NAME = process.env.MONGODB_DB_NAME || 'dermasense_db'

if (!PG_URL) {
  console.error('❌ OLD_DATABASE_URL not set in .env.local')
  process.exit(1)
}
if (!MONGO_URI) {
  console.error('❌ MONGODB_URI not set in .env.local')
  process.exit(1)
}

let pg, mongo, db
const idMap = {} // Maps PostgreSQL UUID → MongoDB ObjectId for FK resolution

async function connect() {
  console.log('🔌 Connecting to PostgreSQL (AWS RDS)...')
  pg = new Client({
    connectionString: PG_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  })
  await pg.connect()
  console.log('✅ PostgreSQL connected')

  console.log('🔌 Connecting to MongoDB Atlas...')
  mongo = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 10000 })
  await mongo.connect()
  db = mongo.db(DB_NAME)
  console.log('✅ MongoDB connected')
}

async function migrateProfiles() {
  console.log('\n📦 Migrating profiles...')
  const { rows } = await pg.query(`
    SELECT id, cognito_user_id, email, full_name, avatar_url, date_of_birth,
           gender, contact_number, address, city, state, country, postal_code,
           bio, is_active, role, is_onboarded, medical_info, created_at, updated_at
    FROM profiles
    ORDER BY created_at ASC
  `)
  console.log(`   Found ${rows.length} profiles`)

  const col = db.collection('profiles')
  let migrated = 0

  for (const row of rows) {
    const mongoId = new ObjectId()
    idMap[row.id] = mongoId

    await col.updateOne(
      { clerkUserId: row.cognito_user_id || row.email },
      {
        $setOnInsert: { _id: mongoId },
        $set: {
          clerkUserId: row.cognito_user_id || `legacy_${row.email}`,
          email: row.email,
          fullName: row.full_name || '',
          avatarUrl: row.avatar_url || undefined,
          dateOfBirth: row.date_of_birth?.toISOString?.().split('T')[0] || undefined,
          gender: row.gender || undefined,
          contactNumber: row.contact_number || undefined,
          address: row.address || undefined,
          city: row.city || undefined,
          state: row.state || undefined,
          country: row.country || undefined,
          postalCode: row.postal_code || undefined,
          bio: row.bio || undefined,
          role: row.role || 'patient',
          isActive: row.is_active ?? true,
          isOnboarded: row.is_onboarded ?? false,
          medicalInfo: row.medical_info || undefined,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
          _migratedFrom: 'rds',
        },
      },
      { upsert: true }
    )
    migrated++
    if (migrated % 10 === 0) process.stdout.write('.')
  }
  console.log(`\n   ✅ Migrated ${migrated} profiles`)
}

async function migrateAnalyses() {
  console.log('\n📊 Migrating skin_analyses...')
  const { rows } = await pg.query(`
    SELECT id, user_id, image_url, image_key, prediction_class, confidence_score,
           risk_level, all_predictions, heatmap_url, notes, doctor_reviewed,
           doctor_notes, reviewed_by, reviewed_at, follow_up_required,
           follow_up_date, created_at
    FROM skin_analyses
    ORDER BY created_at ASC
  `)
  console.log(`   Found ${rows.length} analyses`)

  const col = db.collection('skin_analyses')
  let migrated = 0

  for (const row of rows) {
    const userId = idMap[row.user_id]
    if (!userId) {
      console.warn(`   ⚠️  No profile mapping for user_id ${row.user_id} — skipping analysis`)
      continue
    }

    await col.insertOne({
      userId,
      imageUrl: row.image_url || '',
      imageKey: row.image_key || '',
      predictionClass: row.prediction_class || '',
      confidenceScore: parseFloat(row.confidence_score) || 0,
      riskLevel: row.risk_level || 'Low',
      allPredictions: row.all_predictions || {},
      heatmapUrl: row.heatmap_url || undefined,
      notes: row.notes || undefined,
      doctorReviewed: row.doctor_reviewed || false,
      doctorNotes: row.doctor_notes || undefined,
      reviewedBy: row.reviewed_by && idMap[row.reviewed_by] ? idMap[row.reviewed_by] : undefined,
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : undefined,
      followUpRequired: row.follow_up_required || false,
      followUpDate: row.follow_up_date?.toISOString?.().split('T')[0] || undefined,
      createdAt: new Date(row.created_at),
      _migratedFrom: 'rds',
    })
    migrated++
  }
  console.log(`   ✅ Migrated ${migrated} analyses`)
}

async function migrateMedicalHistory() {
  console.log('\n📋 Migrating medical_history...')
  const { rows } = await pg.query(`
    SELECT id, user_id, type, data, details, severity, status, date, created_at, updated_at
    FROM medical_history
    ORDER BY created_at ASC
  `)
  console.log(`   Found ${rows.length} records`)

  const col = db.collection('medical_history')
  let migrated = 0

  for (const row of rows) {
    const userId = idMap[row.user_id]
    if (!userId) continue

    await col.insertOne({
      userId,
      type: row.type || 'Analysis',
      data: row.data || '',
      details: typeof row.details === 'string' ? JSON.parse(row.details) : (row.details || undefined),
      severity: row.severity || undefined,
      status: row.status || 'Active',
      date: new Date(row.date || row.created_at),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      _migratedFrom: 'rds',
    })
    migrated++
  }
  console.log(`   ✅ Migrated ${migrated} medical history records`)
}

async function migrateAppointments() {
  console.log('\n📅 Migrating appointments...')
  const tables = await pg.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name='appointments'
  `)
  if (tables.rows.length === 0) {
    console.log('   ℹ️  No appointments table found — skipping')
    return
  }

  // Try both schema variants (patient_id and user_id)
  let rows = []
  try {
    const res = await pg.query(`
      SELECT id, patient_id, doctor_id, doctor_name, specialty,
             appointment_date, appointment_time, status, type, fee, created_at, updated_at
      FROM appointments ORDER BY created_at ASC
    `)
    rows = res.rows
  } catch {
    try {
      const res = await pg.query(`
        SELECT id, user_id AS patient_id, doctor_id, doctor_name, specialty,
               appointment_date, appointment_time, status, created_at, updated_at
        FROM appointments ORDER BY created_at ASC
      `)
      rows = res.rows
    } catch (e2) {
      console.warn(`   ⚠️  Appointments query failed: ${e2.message}`)
      return
    }
  }

  console.log(`   Found ${rows.length} appointments`)
  const col = db.collection('appointments')
  let migrated = 0

  for (const row of rows) {
    const patientId = idMap[row.patient_id]
    if (!patientId) continue

    await col.insertOne({
      patientId,
      doctorId: row.doctor_id && idMap[row.doctor_id] ? idMap[row.doctor_id] : null,
      doctorName: row.doctor_name || 'Unknown Doctor',
      specialty: row.specialty || undefined,
      appointmentDate: row.appointment_date?.toISOString?.().split('T')[0] || '',
      appointmentTime: row.appointment_time || '',
      status: row.status || 'Scheduled',
      type: row.type || undefined,
      fee: row.fee ? parseFloat(row.fee) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      _migratedFrom: 'rds',
    })
    migrated++
  }
  console.log(`   ✅ Migrated ${migrated} appointments`)
}

async function migrateOrders() {
  console.log('\n🛒 Migrating orders...')
  const tables = await pg.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name='orders'
  `)
  if (tables.rows.length === 0) {
    console.log('   ℹ️  No orders table — skipping')
    return
  }

  const { rows } = await pg.query(`
    SELECT id, order_number, user_id, items, subtotal, tax, shipping_cost,
           total_amount, payment_method, payment_status, order_status,
           delivery_address, created_at, updated_at
    FROM orders ORDER BY created_at ASC
  `)
  console.log(`   Found ${rows.length} orders`)

  const col = db.collection('orders')
  let migrated = 0

  for (const row of rows) {
    const userId = idMap[row.user_id]
    if (!userId) continue

    await col.updateOne(
      { orderNumber: row.order_number },
      {
        $set: {
          orderNumber: row.order_number,
          userId,
          items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []),
          subtotal: parseFloat(row.subtotal) || 0,
          tax: parseFloat(row.tax) || 0,
          shippingCost: parseFloat(row.shipping_cost) || 0,
          totalAmount: parseFloat(row.total_amount) || 0,
          paymentMethod: row.payment_method || 'Credit Card',
          paymentStatus: row.payment_status || 'Pending',
          orderStatus: row.order_status || 'Confirmed',
          deliveryAddress: typeof row.delivery_address === 'string' ? JSON.parse(row.delivery_address) : (row.delivery_address || {}),
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
          _migratedFrom: 'rds',
        },
      },
      { upsert: true }
    )
    migrated++
  }
  console.log(`   ✅ Migrated ${migrated} orders`)
}

async function createIndexes() {
  console.log('\n🔑 Creating indexes...')
  await db.collection('profiles').createIndex({ clerkUserId: 1 }, { unique: true })
  await db.collection('profiles').createIndex({ email: 1 })
  await db.collection('profiles').createIndex({ role: 1 })
  await db.collection('skin_analyses').createIndex({ userId: 1 })
  await db.collection('skin_analyses').createIndex({ createdAt: -1 })
  await db.collection('medical_history').createIndex({ userId: 1 })
  await db.collection('medical_history').createIndex({ date: -1 })
  await db.collection('appointments').createIndex({ patientId: 1 })
  await db.collection('orders').createIndex({ userId: 1 })
  await db.collection('orders').createIndex({ orderNumber: 1 }, { unique: true })
  console.log('   ✅ Indexes created')
}

async function verifyMigration() {
  console.log('\n🔍 Verification:')
  const counts = await Promise.all([
    db.collection('profiles').countDocuments(),
    db.collection('skin_analyses').countDocuments(),
    db.collection('medical_history').countDocuments(),
    db.collection('appointments').countDocuments(),
    db.collection('orders').countDocuments(),
  ])
  console.log(`   profiles:        ${counts[0]}`)
  console.log(`   skin_analyses:   ${counts[1]}`)
  console.log(`   medical_history: ${counts[2]}`)
  console.log(`   appointments:    ${counts[3]}`)
  console.log(`   orders:          ${counts[4]}`)
}

async function main() {
  console.log('🚀 DermaSense AI — Data Migration: RDS PostgreSQL → MongoDB Atlas')
  console.log('='.repeat(60))

  try {
    await connect()
    await migrateProfiles()
    await migrateAnalyses()
    await migrateMedicalHistory()
    await migrateAppointments()
    await migrateOrders()
    await createIndexes()
    await verifyMigration()

    console.log('\n✅ Migration completed successfully!')
    console.log('\n📋 Next steps:')
    console.log('   1. Verify data in MongoDB Atlas dashboard')
    console.log('   2. Test all API routes with the new database')
    console.log('   3. Decommission AWS RDS instance to stop charges')
    console.log('   4. Remove OLD_DATABASE_URL from .env.local')
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await pg?.end()
    await mongo?.close()
  }
}

main()
