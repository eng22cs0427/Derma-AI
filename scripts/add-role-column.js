require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('Starting migration to add role field to profiles table...');

    await client.query('BEGIN');

    // Add role column
    await client.query(`
      ALTER TABLE profiles 
      ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'patient';
    `);
    console.log('Added role column.');

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
