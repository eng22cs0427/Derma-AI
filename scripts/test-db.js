const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
pool.query('SELECT * FROM medical_history WHERE type = \'Analysis\' ORDER BY date DESC LIMIT 3')
  .then(res => { console.log(JSON.stringify(res.rows, null, 2)); pool.end(); })
  .catch(e => { console.error('DB Error:', e.message); pool.end(); });
