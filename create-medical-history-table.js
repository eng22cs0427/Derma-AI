const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

async function createTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS medical_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        data TEXT NOT NULL,
        details JSONB,
        date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_medical_history_user_id ON medical_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_medical_history_date ON medical_history(date DESC);
    `);
    console.log('Medical History table created successfully!');
  } catch (error) {
    console.error('Error creating medical history table:', error);
  } finally {
    await pool.end();
  }
}

createTable();
