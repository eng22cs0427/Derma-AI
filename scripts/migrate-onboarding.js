require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('Starting migration to add onboarding fields to profiles table...');

    await client.query('BEGIN');

    // Add is_onboarded boolean column
    await client.query(`
      ALTER TABLE profiles 
      ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT false;
    `);
    console.log('Added is_onboarded column.');

    // Add medical_info JSONB column
    await client.query(`
      ALTER TABLE profiles 
      ADD COLUMN IF NOT EXISTS medical_info JSONB DEFAULT '{}'::jsonb;
    `);
    console.log('Added medical_info column.');

    await client.query('COMMIT');
    console.log('Migration completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
