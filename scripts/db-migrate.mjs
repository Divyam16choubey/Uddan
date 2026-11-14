/**
 * db-migrate.mjs
 * Run with: node scripts/db-migrate.mjs
 *
 * 1. Runs Phase 7.1 migration: set moderationStatus="approved" for campaigns
 *    that have null/missing moderationStatus.
 * 2. Forces Mongoose to sync all schema indexes to MongoDB.
 *    This creates the new unique indexes on User.email and User.username,
 *    and any other missing indexes declared in the schemas.
 *
 * Safe to re-run — updateMany with a filter and syncIndexes are both idempotent.
 */

import { readFileSync } from "fs";
import mongoose from "mongoose";

// ── Read MONGODB_URI from .env.local ──────────────────────────────────────
let uri = "mongodb://127.0.0.1:27017/uddan";
try {
  const env = readFileSync(".env.local", "utf8");
  const match = env.match(/^MONGODB_URI=(.+)$/m);
  if (match) uri = match[1].trim();
} catch { /* use default */ }

console.log("Connecting to:", uri.replace(/:\/\/[^@]+@/, "://<credentials>@"));
await mongoose.connect(uri);
console.log("Connected.\n");

// ── Import models so schemas are registered ───────────────────────────────
// Dynamic import avoids ESM/CJS issues with the @ alias.
const { default: User }     = await import("../models/User.js");
const { default: Campaign } = await import("../models/Campaign.js");
const { default: Payment }  = await import("../models/Payment.js");
const { default: ModerationLog } = await import("../models/ModerationLog.js");

// ── Phase 7.1 migration ───────────────────────────────────────────────────
console.log("=== Phase 7.1 migration: backfill moderationStatus ===");
const migResult = await Campaign.updateMany(
  { $or: [{ moderationStatus: null }, { moderationStatus: "" }, { moderationStatus: { $exists: false } }] },
  { $set: { moderationStatus: "approved" } }
);
console.log(`  Matched: ${migResult.matchedCount}  Modified: ${migResult.modifiedCount}`);

// Verify
const remaining = await Campaign.countDocuments({
  $or: [{ moderationStatus: null }, { moderationStatus: "" }, { moderationStatus: { $exists: false } }],
});
console.log(`  Campaigns still missing moderationStatus: ${remaining}`);
console.log(remaining === 0 ? "  ✓ Migration complete" : "  ✗ Migration incomplete — check manually");

// ── Sync all Mongoose schema indexes to MongoDB ───────────────────────────
console.log("\n=== Syncing schema indexes ===");

for (const [name, model] of [
  ["User",          User],
  ["Campaign",      Campaign],
  ["Payment",       Payment],
  ["ModerationLog", ModerationLog],
]) {
  try {
    console.log(`  ${name}: syncing...`);
    await model.syncIndexes();
    const indexes = await model.listIndexes();
    const indexNames = indexes.map((i) => i.name).join(", ");
    console.log(`  ${name}: ✓  indexes: ${indexNames}`);
  } catch (err) {
    console.error(`  ${name}: ✗ ${err.message}`);
  }
}

// ── Final verification ────────────────────────────────────────────────────
console.log("\n=== Post-migration index verification ===");

const userIndexes = await User.listIndexes();
const hasEmailUnique    = userIndexes.some((i) => i.key?.email && i.unique);
const hasUsernameUnique = userIndexes.some((i) => i.key?.username && i.unique);
console.log(`  User.email unique index:    ${hasEmailUnique    ? "✓ present" : "✗ MISSING"}`);
console.log(`  User.username unique index: ${hasUsernameUnique ? "✓ present" : "✗ MISSING"}`);

const campIndexes = await Campaign.listIndexes();
const hasSlugUnique  = campIndexes.some((i) => i.key?.slug && i.unique);
const hasModStatus   = campIndexes.some((i) => i.key?.moderationStatus);
const hasCreator     = campIndexes.some((i) => i.key?.creator);
console.log(`  Campaign.slug unique index:        ${hasSlugUnique ? "✓ present" : "✗ MISSING"}`);
console.log(`  Campaign.moderationStatus index:   ${hasModStatus  ? "✓ present" : "✗ MISSING"}`);
console.log(`  Campaign.creator index:            ${hasCreator    ? "✓ present" : "✗ MISSING"}`);

const payIndexes = await Payment.listIndexes();
const hasRzpUnique = payIndexes.some((i) => i.key?.razorpayPaymentId && i.unique && i.sparse);
const hasCampaign  = payIndexes.some((i) => i.key?.campaign);
console.log(`  Payment.razorpayPaymentId sparse+unique: ${hasRzpUnique ? "✓ present" : "✗ MISSING"}`);
console.log(`  Payment.campaign index:                  ${hasCampaign  ? "✓ present" : "✗ MISSING"}`);

await mongoose.disconnect();
console.log("\n=== Migration & index sync complete ===");
