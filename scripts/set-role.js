const { MongoClient } = require('mongodb');
require('dotenv').config({path:'.env.local'});
const email = process.argv[2];
const role = process.argv[3];

if (!email || !role || !['admin', 'doctor', 'patient'].includes(role)) {
  console.log('Usage: node scripts/set-role.js <email> <admin|doctor|patient>');
  process.exit(1);
}

async function setRole() {
  const c = new MongoClient(process.env.MONGODB_URI);
  await c.connect();
  const db = c.db('dermasense_db');
  
  const result = await db.collection('profiles').updateOne(
    { email: email },
    { $set: { role: role, isOnboarded: true, updatedAt: new Date() } }
  );
  
  if (result.matchedCount === 0) {
    console.log(`User ${email} not found. Ensure they have signed in at least once.`);
  } else {
    console.log(`✅ Successfully updated ${email} to ${role} role!`);
  }
  
  const users = await db.collection('profiles').find({}, { projection: { email: 1, role: 1 } }).toArray();
  console.log('\nCurrent roles:');
  users.forEach(u => console.log(` - ${u.email}: ${u.role}`));
  
  await c.close();
}
setRole().catch(console.error);
