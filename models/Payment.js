import mongoose from "mongoose";
const { Schema, model } = mongoose;

const PaymentSchema = new Schema({
    // ── Payer info ────────────────────────────────────────────────────────
    name:    { type: String, required: true },        // donor's display name
    message: { type: String },                        // optional message

    // ── Amount ────────────────────────────────────────────────────────────
    amount:   { type: Number, required: true },       // stored in RUPEES (paise / 100)
    currency: { type: String, default: "INR" },

    // ── Razorpay identifiers ──────────────────────────────────────────────
    oid: { type: String, required: true },            // Razorpay order ID

    // Stored after successful server-side verification.
    // sparse unique: allows multiple nulls (pending payments) but prevents
    // the same payment_id from being processed twice (idempotency guard).
    razorpayPaymentId: {
        type:   String,
        sparse: true,
        unique: true,
        index:  true,
    },

    // ── Status ────────────────────────────────────────────────────────────
    done: { type: Boolean, default: false },          // true after verified success

    // ── Recipients — two parallel linkage models ──────────────────────────
    // Legacy profile-page flow: plain string username
    to_user: { type: String, required: true },

    // Campaign-specific flow: ObjectId ref (null for legacy payments)
    campaign: {
        type:    Schema.Types.ObjectId,
        ref:     "Campaign",
        default: null,
        index:   true,
    },

    // ── Timestamps ────────────────────────────────────────────────────────
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.Payment || model("Payment", PaymentSchema);
