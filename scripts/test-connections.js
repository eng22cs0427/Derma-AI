// scripts/test-connections.js
// Tests all AWS services + database in one command.
//
// Usage:
//   node scripts/test-connections.js

require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

async function testDatabase() {
  console.log('\n📦 Testing AWS RDS PostgreSQL...')

  const url = process.env.DATABASE_URL
  if (!url || url.includes('YOUR_')) {
    console.log('  ❌ DATABASE_URL not set in .env.local')
    return false
  }

  const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  })

  try {
    const client = await pool.connect()
    const res = await client.query('SELECT current_database() AS db, current_user AS usr')
    console.log(`  ✅ Connected! Database: "${res.rows[0].db}" | User: "${res.rows[0].usr}"`)

    const tables = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`
    )
    const names = tables.rows.map(r => r.table_name)
    console.log(`  ✅ Tables: ${names.length > 0 ? names.join(', ') : 'NONE FOUND'}`)

    const missing = ['profiles','appointments','skin_analyses','medical_history','orders','audit_logs']
      .filter(t => !names.includes(t))
    if (missing.length > 0) {
      console.log(`  ⚠️  Missing tables: ${missing.join(', ')}`)
      console.log(`      → Run database/schema.sql in pgAdmin first!`)
    }
    if (!names.includes('doctors')) {
      console.log(`  ⚠️  "doctors" table missing — run database/migration_roles_doctors.sql`)
    }

    client.release()
    await pool.end()
    return missing.length === 0
  } catch (err) {
    console.log(`  ❌ Connection failed: ${err.message}`)
    if (err.message.includes('ENOTFOUND')) {
      console.log('  💡 The RDS endpoint/hostname is wrong — check DATABASE_URL in .env.local')
    } else if (err.message.includes('password')) {
      console.log('  💡 Wrong password — check DB_PASSWORD in .env.local')
    } else if (err.message.includes('timeout') || err.message.includes('ETIMEDOUT')) {
      console.log('  💡 Connection timed out — check RDS Security Group inbound rule for port 5432 from your IP')
    }
    await pool.end()
    return false
  }
}

async function testSMTP() {
  console.log('\n📧 Testing AWS SES (SMTP)...')

  const user = process.env.SES_SMTP_USER
  const pass = process.env.SES_SMTP_PASSWORD
  const host = process.env.SES_SMTP_HOST
  const from = process.env.SES_FROM_EMAIL

  if (!user || !pass) {
    console.log('  ❌ SES_SMTP_USER or SES_SMTP_PASSWORD not set in .env.local')
    return false
  }

  const nodemailer = require('nodemailer')
  const transporter = nodemailer.createTransport({
    host: host || 'email-smtp.ap-south-1.amazonaws.com',
    port: 587,
    secure: false,
    auth: { user, pass },
  })

  try {
    await transporter.verify()
    console.log(`  ✅ SMTP connection verified!`)
    console.log(`  ✅ From email: ${from}`)
    console.log(`  ℹ️  Note: In SES sandbox mode, emails only go to verified addresses.`)
    return true
  } catch (err) {
    console.log(`  ❌ SMTP failed: ${err.message}`)
    if (err.message.includes('535')) {
      console.log('  💡 Wrong SMTP credentials — regenerate from AWS SES → SMTP settings')
    } else if (err.message.includes('ENOTFOUND')) {
      console.log('  💡 Wrong SMTP host — check SES_SMTP_HOST in .env.local')
    }
    return false
  }
}

async function testS3() {
  console.log('\n🪣 Testing AWS S3...')

  const keyId = process.env.AWS_ACCESS_KEY_ID
  const secret = process.env.AWS_SECRET_ACCESS_KEY
  const bucket = process.env.AWS_S3_BUCKET

  if (!keyId || keyId.includes('PASTE_')) {
    console.log('  ❌ AWS_ACCESS_KEY_ID not set in .env.local')
    return false
  }
  if (!bucket) {
    console.log('  ❌ AWS_S3_BUCKET not set in .env.local')
    return false
  }

  const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3')
  const s3 = new S3Client({
    region: process.env.NEXT_PUBLIC_S3_REGION || 'ap-south-1',
    credentials: { accessKeyId: keyId, secretAccessKey: secret },
  })

  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }))
    console.log(`  ✅ Bucket "${bucket}" exists and is accessible!`)
    return true
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      console.log(`  ❌ Bucket "${bucket}" not found — create it in AWS S3 console`)
    } else if (err.name === 'Forbidden' || err.$metadata?.httpStatusCode === 403) {
      console.log(`  ❌ Access denied to bucket "${bucket}" — check IAM user has S3 permissions`)
    } else {
      console.log(`  ❌ S3 error: ${err.message}`)
    }
    return false
  }
}

async function main() {
  console.log('🚀 DermaSense AI — AWS Connection Test')
  console.log('='.repeat(50))

  const dbOk  = await testDatabase()
  const sesOk = await testSMTP()
  const s3Ok  = await testS3()

  console.log('\n' + '='.repeat(50))
  console.log('📊 Results:')
  console.log(`  PostgreSQL (RDS): ${dbOk  ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`  SES Email (SMTP): ${sesOk ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`  S3 Storage:       ${s3Ok  ? '✅ PASS' : '❌ FAIL'}`)

  if (dbOk && sesOk && s3Ok) {
    console.log('\n🎉 All services working! Run: npm run dev')
  } else {
    console.log('\n⚠️  Fix the issues above and run again: npm run test:connections')
  }
}

main().catch(console.error)
