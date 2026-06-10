/**
 * migration.js
 * One-shot migration script to:
 *   1. Fix existing Station docs that have a malformed location
 *      (location.type = "Point" but no coordinates) by unsetting location entirely.
 *   2. Set default values for new Station fields on docs that are missing them.
 *   3. Set default values for new Locker fields on docs that are missing them.
 *
 * Run with:  node migration.js
 * Safe to run multiple times (idempotent).
 */

const mongoose = require('mongoose');
const { env } = require('./src/config/env');

async function run() {
  await mongoose.connect(env.mongoUri);
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db;
  const stations = db.collection('stations');
  const lockers = db.collection('lockers');

  // ──────────────────────────────────────────────────────────────────
  // 1. Fix malformed location on Station documents
  //    Criteria: location exists, but location.coordinates is missing
  //    or empty. We unset location so the sparse 2dsphere index skips it.
  // ──────────────────────────────────────────────────────────────────
  console.log('\n🔧 [Station] Fixing malformed location fields…');

  const fixLocationResult = await stations.updateMany(
    {
      $and: [
        { 'location.type': 'Point' },
        {
          $or: [
            { 'location.coordinates': { $exists: false } },
            { 'location.coordinates': { $size: 0 } },
            { 'location.coordinates': null }
          ]
        }
      ]
    },
    { $unset: { location: '' } }
  );

  console.log(
    `   Matched: ${fixLocationResult.matchedCount}, Modified: ${fixLocationResult.modifiedCount}`
  );

  // ──────────────────────────────────────────────────────────────────
  // 2. Set default values for new Station fields (only on docs missing them)
  // ──────────────────────────────────────────────────────────────────
  console.log('\n🔧 [Station] Adding missing overdue configuration fields…');

  const stationDefaults = await stations.updateMany(
    {
      $or: [
        { freeDurationMinutes: { $exists: false } },
        { overdueRatePerHour: { $exists: false } },
        { gracePeriodMinutes: { $exists: false } }
      ]
    },
    {
      $set: {
        freeDurationMinutes: 60,
        overdueRatePerHour: 1.0,
        gracePeriodMinutes: 10
      }
    }
  );

  console.log(
    `   Matched: ${stationDefaults.matchedCount}, Modified: ${stationDefaults.modifiedCount}`
  );

  // ──────────────────────────────────────────────────────────────────
  // 3. Set default values for new Locker fields (only on docs missing them)
  // ──────────────────────────────────────────────────────────────────
  console.log('\n🔧 [Locker] Adding missing overdue tracking fields…');

  const lockerDefaults = await lockers.updateMany(
    {
      $or: [
        { reservedAt: { $exists: false } },
        { overduePaymentId: { $exists: false } },
        { overdueReleasedAt: { $exists: false } }
      ]
    },
    {
      $set: {
        reservedAt: null,
        overduePaymentId: null,
        overdueReleasedAt: null
      }
    }
  );

  console.log(
    `   Matched: ${lockerDefaults.matchedCount}, Modified: ${lockerDefaults.modifiedCount}`
  );

  // ──────────────────────────────────────────────────────────────────
  // Done
  // ──────────────────────────────────────────────────────────────────
  console.log('\n✅ Migration complete. All existing data preserved.');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Migration failed:', err);
  mongoose.disconnect().then(() => process.exit(1));
});
