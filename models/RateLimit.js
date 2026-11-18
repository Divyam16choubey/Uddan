import mongoose from "mongoose";

const { Schema, model } = mongoose;

/**
 * RateLimit — MongoDB-backed sliding-window rate limiter.
 *
 * Each document represents one (action, key) bucket.
 *   action  — a string identifying the guarded operation,
 *             e.g. "otp_send", "otp_verify", "otp_resend_cooldown"
 *   key     — the subject being limited: an email address or IP string
 *
 * Atomic increment:
 *   findOneAndUpdate with $inc: { count: 1 } and $setOnInsert: { firstHit: now }
 *   returns the post-update count, which the caller compares against the
 *   configured limit. No separate read is needed, so there is no TOCTOU gap.
 *
 * TTL cleanup:
 *   The `windowExpiresAt` field carries a TTL index (expires: 0).
 *   MongoDB deletes the document when the window closes, resetting the
 *   counter automatically. The TTL index fires up to 60 s late in
 *   practice; the in-process expiry check (`windowExpiresAt < now`)
 *   is the authoritative gate.
 *
 * Works correctly in multi-instance deployments because all instances
 * share the same MongoDB cluster.
 */
const RateLimitSchema = new Schema({
    // Namespaces the counter — prevents key collisions across operations.
    action: {
        type: String,
        required: true,
    },

    // The entity being rate-limited (email or IP).
    key: {
        type: String,
        required: true,
    },

    // Number of events recorded in the current window.
    count: {
        type: Number,
        default: 0,
        min: 0,
    },

    // Timestamp of the first hit in this window.
    // Set once via $setOnInsert during the first atomic increment.
    firstHit: {
        type: Date,
        default: null,
    },

    // When this window expires and the document will be deleted by MongoDB.
    // Set once via $setOnInsert. The window duration is baked in at write time.
    windowExpiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 },
    },
});

// Composite unique index so each (action, key) pair has exactly one document.
RateLimitSchema.index({ action: 1, key: 1 }, { unique: true });

export default mongoose.models.RateLimit || model("RateLimit", RateLimitSchema);
