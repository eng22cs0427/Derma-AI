const { MongoClient } = require('mongodb');
require('dotenv').config({path:'.env.local'});
async function testUpsert() {
  const c = new MongoClient(process.env.MONGODB_URI);
  await c.connect();
  const db = c.db('dermasense_db');
  const col = db.collection('profiles');
  await col.updateOne(
    { clerkUserId: 'test1234' },
    {
      $setOnInsert: { clerkUserId: 'test1234', fullName: 'Test User', role: 'patient', isActive: true, isOnboarded: false, createdAt: new Date() },
      $set: { email: 'test@example.com', updatedAt: new Date() }
    },
    { upsert: true }
  );
  console.log('Upsert successful!');
  const count = await col.countDocuments();
  console.log('Count:', count);
  await col.deleteOne({ clerkUserId: 'test1234' });
  await c.close();
}
testUpsert().catch(console.error);
