import mongoose from "mongoose";

const { Schema, model } = mongoose;

/**
 * OtpToken — stores a single pending OTP per email address.
 *
 * Security design:
 *  - Only a bcrypt-like SHA-256 hex hash of the code is persisted.
 *    The plaintext OTP is never written to the database or returned
 *    to the client.
 *  - A new successful send invalidates any previous token for the same
 *    email (findOneAndReplace / upsert pattern in the send route).
 *  - `attempts` is incremented atomically with findOneAndUpdate so that
 *    concurrent verification requests cannot both read "attempts < 5"
 *    and both succeed.
 *  - `used` is set to true atomically at the same moment the code is
 *    accepted, preventing replay.
 *  - MongoDB TTL index on `expiresAt` deletes expired documents
 *    automatically (housekeeping — expiry is also checked in-process).
 */
const OtpTokenSchema = new Schema({
    // Normalised (lowercased, trimmed) email address
    email: {
        type: String,
        required: true,
        index: true,
    },

    // SHA-256 hex digest of the 6-digit OTP
    codeHash: {
        type: String,
        required: true,
    },

    // Absolute expiry timestamp (5 minutes from creation)
    expiresAt: {
        type: Date,
        required: true,
        // TTL index: MongoDB removes the document automatically after expiry.
        // This is belt-and-suspenders cleanup; expiry is also enforced
        // in-process during verification.
        index: { expires: 0 },
    },

    // Number of verification attempts made against this token.
    // Incremented atomically. Max 5 — after that the token is locked.
    attempts: {
        type: Number,
        default: 0,
        min: 0,
    },

    // Set to true the moment a correct code is accepted.
    // A used token is rejected on all subsequent verification attempts.
    used: {
        type: Boolean,
        default: false,
    },

    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// One active token per email at any time — enforced by the send route
// via replaceOne({ email }, ..., { upsert: true }).
// No unique index here because the TTL index and upsert together handle it
// without race-condition risks from unique constraint violations.

export default mongoose.models.OtpToken || model("OtpToken", OtpTokenSchema);
