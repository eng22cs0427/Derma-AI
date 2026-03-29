require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('Starting migration to create medical_history table...');
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS medical_history (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL CHECK (type IN ('Appointment', 'Medicine', 'Analysis')),
          data TEXT NOT NULL,
          details JSONB,
          date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_medical_history_user_id ON medical_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_medical_history_date ON medical_history(date DESC);
    `);
    
    console.log('medical_history table created.');
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
