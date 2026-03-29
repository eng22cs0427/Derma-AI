const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

async function checkAndCreateTables() {
  try {
    // Check existing tables
    const tablesRes = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' ORDER BY table_name
    `);
    console.log('Existing tables:', tablesRes.rows.map(x => x.table_name).join(', '));

    // Create skin_analyses table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS skin_analyses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        image_url TEXT,
        image_key TEXT,
        prediction_class VARCHAR(100) NOT NULL,
        confidence_score DECIMAL(5,2),
        risk_level VARCHAR(50),
        all_predictions JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('skin_analyses table: OK');

    // Create index on user_id for fast per-user queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_skin_analyses_user_id ON skin_analyses(user_id);
    `);
    console.log('skin_analyses index: OK');

    // Verify medical_history table exists and has the right shape
    const mhRes = await pool.query(`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name = 'medical_history' ORDER BY ordinal_position
    `);
    console.log('medical_history columns:', mhRes.rows.map(r => r.column_name).join(', '));

    // Ensure medical_history.details is JSONB (not TEXT) for proper JSON indexing
    const detailsCol = mhRes.rows.find(r => r.column_name === 'details');
    if (detailsCol && detailsCol.data_type === 'text') {
      console.log('Converting medical_history.details from text -> jsonb...');
      await pool.query(`
        ALTER TABLE medical_history 
        ALTER COLUMN details TYPE jsonb USING details::jsonb
      `);
      console.log('Conversion done.');
    }

    console.log('\nAll tables ready for DermaSense AI analysis storage!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkAndCreateTables();
