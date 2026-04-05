require('dotenv').config({ path: '.env.local' })

async function run() {
  const results = { pass: 0, fail: 0, warn: 0 }
  const p = (l, m) => { console.log(`  ✅ ${l}: ${m}`); results.pass++ }
  const f = (l, m) => { console.log(`  ❌ ${l}: ${m}`); results.fail++ }
  const w = (l, m) => { console.log(`  ⚠️  ${l}: ${m}`); results.warn++ }

  // ── 1. MongoDB ──────────────────────────────────────────────
  console.log('\n══ 1. MONGODB ATLAS ══')
  try {
    const { MongoClient } = require('mongodb')
    const c = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 6000 })
    await c.connect()
    await c.db('dermasense_db').command({ ping: 1 })
    const count = await c.db('dermasense_db').collection('profiles').countDocuments()
    p('Connection', 'Connected to dermasense_db ✓')
    p('Profiles', `${count} profiles stored`)
    // Ensure indexes
    const db = c.db('dermasense_db')
    await db.collection('profiles').createIndex({ clerkUserId: 1 }, { unique: true, background: true })
    await db.collection('profiles').createIndex({ email: 1 }, { background: true })
    await db.collection('skin_analyses').createIndex({ userId: 1 }, { background: true })
    await db.collection('medical_history').createIndex({ userId: 1 }, { background: true })
    p('Indexes', 'All critical indexes OK')
    await c.close()
  } catch (e) { f('MongoDB', e.message.slice(0, 80)) }

  // ── 2. Cloudinary ───────────────────────────────────────────
  console.log('\n══ 2. CLOUDINARY ══')
  const cn = process.env.CLOUDINARY_CLOUD_NAME
  const ck = process.env.CLOUDINARY_API_KEY
  const cs = process.env.CLOUDINARY_API_SECRET
  try {
    const cloudinary = require('cloudinary').v2
    cloudinary.config({ cloud_name: cn, api_key: ck, api_secret: cs })
    await new Promise((res, rej) => cloudinary.api.usage((err, r) => {
      if (err) rej(err)
      else { p('Connection', `Cloud "${cn}" OK | ${(r.storage?.usage_bytes / 1e6 || 0).toFixed(2)}MB used`); res() }
    }))
    // Upload test
    const tiny = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
    const uploaded = await new Promise((res, rej) => {
      const s = cloudinary.uploader.upload_stream({ public_id: 'dermasense-test/_ping', overwrite: true }, (err, r) => err ? rej(err) : res(r))
      s.end(tiny)
    })
    p('Upload', `OK → ${uploaded.secure_url.slice(0, 55)}...`)
    await cloudinary.uploader.destroy('dermasense-test/_ping')
    p('Delete', 'Cleanup OK')
  } catch (e) {
    f('Cloudinary', e.message.slice(0, 100))
    console.log(`     → Check: cloud_name="${cn}" must match exactly what Cloudinary shows in dashboard`)
    console.log(`     → Common fix: Cloudinary cloud names are always lowercase. Try: dermaai, dermasenseai`)
  }

  // ── 3. Brevo Email ──────────────────────────────────────────
  console.log('\n══ 3. BREVO EMAIL ══')
  const smtpUser = process.env.BREVO_SMTP_USER
  const smtpKey = process.env.BREVO_SMTP_KEY
  // Note: Brevo SMTP user must be your Brevo account login email, NOT a Gmail
  console.log(`     SMTP user: ${smtpUser}`)
  console.log(`     SMTP key : ${smtpKey ? smtpKey.slice(0, 20) + '...' : 'NOT SET'}`)
  console.log(`     NOTE: BREVO_SMTP_USER must be your brevo.com LOGIN email (not Gmail)`)
  try {
    const nodemailer = require('nodemailer')
    const t = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com', port: 587, secure: false,
      auth: { user: smtpUser, pass: smtpKey }
    })
    await t.verify()
    p('SMTP', 'smtp-relay.brevo.com:587 verified ✓')
    await t.sendMail({
      from: `"DermaSense AI" <${process.env.BREVO_FROM_EMAIL}>`,
      to: smtpUser, subject: 'DermaSense AI - SMTP Test ✅',
      html: '<h2>✅ Email working!</h2><p>DermaSense AI Brevo SMTP is configured correctly.</p>'
    })
    p('Test email', `Sent to ${smtpUser}`)
  } catch (e) {
    f('Brevo SMTP', e.message.slice(0, 100))
    console.log(`     → Fix: Go to brevo.com → SMTP & API page`)
    console.log(`     → BREVO_SMTP_USER = your Brevo account email (NOT Gmail)`)
    console.log(`     → BREVO_SMTP_KEY  = SMTP key from Brevo dashboard (starts with xsmtpsib-)`)
  }

  // ── 4. Azure Vision ─────────────────────────────────────────
  console.log('\n══ 4. AZURE AI VISION ══')
  const azEp = (process.env.AZURE_VISION_ENDPOINT || '').replace(/\/$/, '')
  const azKey = process.env.AZURE_VISION_KEY
  const azOn = process.env.AZURE_VISION_ENABLED === 'true'
  if (!azOn || !azEp || !azKey) { w('Azure', 'Not enabled or credentials missing') }
  else {
    try {
      // Use a tiny public image from Azure's own doc examples
      const url = `${azEp}/computervision/imageanalysis:analyze?api-version=2024-02-01&features=tags`
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Ocp-Apim-Subscription-Key': azKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://learn.microsoft.com/azure/ai-services/computer-vision/media/quickstarts/presentation.png' })
      })
      if (r.ok) {
        const d = await r.json()
        const tags = (d.tagsResult?.values || []).slice(0, 3).map(t => t.name).join(', ')
        p('API call', `Working ✓ — sample tags: ${tags}`)
      } else {
        const t = await r.text(); f('API call', `HTTP ${r.status}: ${t.slice(0, 100)}`)
      }
    } catch (e) { f('Azure Vision', e.message.slice(0, 80)) }
  }

  // ── 5. FastAPI ML ───────────────────────────────────────────
  console.log('\n══ 5. FASTAPI ML BACKEND ══')
  const mlUrl = process.env.ML_API_URL || 'http://127.0.0.1:8000'
  try {
    const ctrl = new AbortController()
    setTimeout(() => ctrl.abort(), 3000)
    const r = await fetch(`${mlUrl}/health`, { signal: ctrl.signal })
    if (r.ok) { const d = await r.json(); p('Health', `v${d.api_version} model_loaded=${d.model_loaded}`) }
    else { f('Health', `HTTP ${r.status}`) }
  } catch (e) {
    if (e.name === 'AbortError' || e.message?.includes('ECONNREFUSED') || e.message?.includes('fetch'))
      w('FastAPI', 'Not running locally — start: cd api && uvicorn main:app --reload')
    else f('FastAPI', e.message?.slice(0, 80) || '')
  }

  // ── 6. API Routes ───────────────────────────────────────────
  console.log('\n══ 6. API ROUTES (MongoDB check) ══')
  const fs = require('fs'), path = require('path')
  const routes = [
    'app/api/profile/route.ts','app/api/medical-history/route.ts','app/api/appointments/route.ts',
    'app/api/orders/route.ts','app/api/save-analysis/route.ts','app/api/predict/route.ts',
    'app/api/predict/status/route.ts','app/api/doctors/route.ts','app/api/doctor/patients/route.ts',
    'app/api/doctor/stats/route.ts','app/api/doctor/analyses/route.ts','app/api/doctor/appointments/route.ts',
    'app/api/doctor/notifications/route.ts','app/api/doctor/profile/route.ts',
    'app/api/admin/set-role/route.ts','app/api/admin/list-profiles/route.ts','app/api/admin/doctors/route.ts',
  ]
  let bad = []
  for (const route of routes) {
    try {
      const content = fs.readFileSync(path.join(process.cwd(), route), 'utf8')
      if (content.includes("from '@/lib/aws-database'") && /query\s*\(/.test(content)) bad.push(route)
    } catch { bad.push(route + ' (not found)') }
  }
  if (bad.length === 0) p('All 17 routes', 'MongoDB ✓ — no old SQL query() calls found')
  else bad.forEach(r => f(r, 'Still has old query() call'))

  // ── Summary ──────────────────────────────────────────────────
  console.log('\n════════════════════════════════════')
  console.log(`  ✅ Passed :  ${results.pass}`)
  console.log(`  ⚠️  Warned :  ${results.warn}`)
  console.log(`  ❌ Failed :  ${results.fail}`)
  if (results.fail === 0) console.log('\n  🎉 All services ready! Run: npm run dev\n')
  else console.log('\n  Fix the ❌ items above, then run: npm run dev\n')
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1) })
