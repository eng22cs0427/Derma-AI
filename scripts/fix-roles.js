const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  // 1. Demote sabareeshsp7@gmail.com → patient
  const r1 = await pool.query(
    "UPDATE profiles SET role='patient', updated_at=CURRENT_TIMESTAMP WHERE email='sabareeshsp7@gmail.com' RETURNING email, role"
  );
  console.log('DEMOTE sabareeshsp7@gmail.com:', r1.rows.length > 0 ? r1.rows[0] : 'NOT FOUND');

  // 2. Check if sabreeshsp7@gmail.com exists
  const r2 = await pool.query(
    "SELECT email, role, is_onboarded FROM profiles WHERE email='sabreeshsp7@gmail.com' LIMIT 1"
  );
  console.log('CHECK sabreeshsp7 (no a):', r2.rows.length > 0 ? r2.rows[0] : 'NOT REGISTERED YET');

  // 3. List all profiles
  const r3 = await pool.query(
    "SELECT email, role, full_name, is_onboarded FROM profiles WHERE is_active=true ORDER BY created_at DESC"
  );
  console.log('\nALL REGISTERED PROFILES:');
  r3.rows.forEach(row => console.log(' -', row.email, '|', row.role, '|', row.full_name));

  await pool.end();
}

run().catch(err => {
  console.error('ERROR:', err.message);
  pool.end();
});
