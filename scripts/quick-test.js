require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const results = [];

async function run() {
  // RDS Test
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    });
    const c = await pool.connect();
    const r = await c.query('SELECT current_database() AS db');
    const t = await c.query("SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema='public'");
    results.push('RDS: PASS - db=' + r.rows[0].db + ' tables=' + t.rows[0].n);
    c.release();
    await pool.end();
  } catch (e) {
    results.push('RDS: FAIL - ' + e.message.slice(0, 100));
  }

  // SES SMTP Test
  try {
    const nm = require('nodemailer');
    const transporter = nm.createTransport({
      host: process.env.SES_SMTP_HOST,
      port: 587,
      secure: false,
      auth: {
        user: process.env.SES_SMTP_USER,
        pass: process.env.SES_SMTP_PASSWORD,
      },
    });
    await transporter.verify();
    results.push('SES: PASS - smtp=' + process.env.SES_SMTP_HOST);
  } catch (e) {
    results.push('SES: FAIL - ' + e.message.slice(0, 100));
  }

  // S3 Test
  try {
    const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3');
    const s3 = new S3Client({
      region: 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    await s3.send(new HeadBucketCommand({ Bucket: process.env.AWS_S3_BUCKET }));
    results.push('S3: PASS - bucket=' + process.env.AWS_S3_BUCKET);
  } catch (e) {
    results.push('S3: FAIL - ' + e.message.slice(0, 100));
  }

  console.log('\n=== AWS CONNECTION TEST RESULTS ===');
  results.forEach(r => console.log(r));
  const allPass = results.every(r => r.includes('PASS'));
  console.log(allPass ? '\nALL SERVICES OK - run: npm run dev' : '\nSOME SERVICES FAILED - check above');
}

run().catch(e => console.error('Script error:', e.message));
