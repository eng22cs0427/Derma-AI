const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        doctor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
        doctor_name VARCHAR(255),
        specialty VARCHAR(255),
        appointment_date DATE NOT NULL,
        appointment_time TIME NOT NULL,
        status VARCHAR(50) DEFAULT 'Scheduled',
        symptoms TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS doctor_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        patient_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        link VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("Appointment and Notification tables created.");
  } catch(e) {
    console.error("Error:", e.message);
  } finally {
    pool.end();
  }
}
run();
