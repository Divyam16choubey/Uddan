/**
 * db-audit.mjs
 * Run with: node scripts/db-audit.mjs
 * Requires MONGODB_URI set in .env.local (read manually below).
 */

import { readFileSync } from "fs";
import { createConnection } from "mongoose";

// ── Read MONGODB_URI from .env.local manually ─────────────────────────────
let uri = "mongodb://127.0.0.1:27017/uddan";
try {
  const env = readFileSync(".env.local", "utf8");
  const match = env.match(/^MONGODB_URI=(.+)$/m);
  if (match) uri = match[1].trim();
} catch {
  // fall back to default
}

console.log("Connecting to:", uri.replace(/:\/\/[^@]+@/, "://<credentials>@"));

const conn = await createConnection(uri).asPromise();
const db = conn.db;

// ── Helper ────────────────────────────────────────────────────────────────
function section(title) {
  console.log("\n" + "=".repeat(60));
  console.log(title);
  console.log("=".repeat(60));
}

// ── users ─────────────────────────────────────────────────────────────────
section("users — indexes");
const userIndexes = await db.collection("users").indexes();
console.log(JSON.stringify(userIndexes, null, 2));

section("users — total documents");
console.log(await db.collection("users").countDocuments());

section("users — duplicate emails");
const dupEmails = await db.collection("users").aggregate([
  { $group: { _id: "$email", count: { $sum: 1 }, ids: { $push: "$_id" } } },
  { $match: { count: { $gt: 1 } } },
]).toArray();
console.log(dupEmails.length === 0 ? "NONE" : JSON.stringify(dupEmails, null, 2));

section("users — duplicate usernames");
const dupUsernames = await db.collection("users").aggregate([
  { $group: { _id: "$username", count: { $sum: 1 }, ids: { $push: "$_id" } } },
  { $match: { count: { $gt: 1 } } },
]).toArray();
console.log(dupUsernames.length === 0 ? "NONE" : JSON.stringify(dupUsernames, null, 2));

// ── campaigns ─────────────────────────────────────────────────────────────
section("campaigns — indexes");
const campIndexes = await db.collection("campaigns").indexes();
console.log(JSON.stringify(campIndexes, null, 2));

section("campaigns — total documents");
console.log(await db.collection("campaigns").countDocuments());

section("campaigns — missing moderationStatus (need migration)");
const needsMigration = await db.collection("campaigns").countDocuments({
  $or: [
    { moderationStatus: null },
    { moderationStatus: "" },
    { moderationStatus: { $exists: false } },
  ],
});
console.log(needsMigration === 0 ? "NONE — migration not needed" : `${needsMigration} campaigns need migration`);

section("campaigns — by moderationStatus");
const modStatusCounts = await db.collection("campaigns").aggregate([
  { $group: { _id: "$moderationStatus", count: { $sum: 1 } } },
  { $sort: { _id: 1 } },
]).toArray();
console.log(JSON.stringify(modStatusCounts, null, 2));

// ── payments ──────────────────────────────────────────────────────────────
section("payments — indexes");
const payIndexes = await db.collection("payments").indexes();
console.log(JSON.stringify(payIndexes, null, 2));

section("payments — total documents");
console.log(await db.collection("payments").countDocuments());

section("payments — duplicate razorpayPaymentId (should be 0)");
const dupPayments = await db.collection("payments").aggregate([
  { $match: { razorpayPaymentId: { $ne: null } } },
  { $group: { _id: "$razorpayPaymentId", count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } },
]).toArray();
console.log(dupPayments.length === 0 ? "NONE" : JSON.stringify(dupPayments, null, 2));

section("payments — done:true vs done:false");
const paymentStatus = await db.collection("payments").aggregate([
  { $group: { _id: "$done", count: { $sum: 1 } } },
]).toArray();
console.log(JSON.stringify(paymentStatus, null, 2));

// ── moderationlogs ────────────────────────────────────────────────────────
section("moderationlogs — indexes");
try {
  const logIndexes = await db.collection("moderationlogs").indexes();
  console.log(JSON.stringify(logIndexes, null, 2));
} catch {
  console.log("Collection does not exist yet (no moderation actions recorded)");
}

section("moderationlogs — total documents");
try {
  console.log(await db.collection("moderationlogs").countDocuments());
} catch {
  console.log(0);
}

await conn.close();
console.log("\n=== AUDIT COMPLETE ===");
