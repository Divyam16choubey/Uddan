import mongoose from "mongoose";

const { Schema, model } = mongoose;

// ── ModerationLog ────────────────────────────────────────────────────────────
// Append-only audit trail for every moderation action.
// Records are never edited or deleted through ordinary admin UI — they are
// the source of truth for moderation decision history.
//
// Action types:
//   approve_campaign   — set moderationStatus → "approved"
//   reject_campaign    — set moderationStatus → "rejected"
//   suspend_campaign   — set moderationStatus → "suspended"
//   restore_campaign   — set moderationStatus → "approved" (from suspended)
//   restrict_user      — set user.isRestricted → true
//   restore_user       — set user.isRestricted → false
// ---------------------------------------------------------------------------

const ModerationLogSchema = new Schema({
    // Who performed the action
    admin: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },

    // What was acted upon — one or both will be set
    targetCampaign: {
        type: Schema.Types.ObjectId,
        ref: "Campaign",
        default: null,
        index: true,
    },
    targetUser: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
        index: true,
    },

    // What action was taken
    action: {
        type: String,
        enum: [
            "approve_campaign",
            "reject_campaign",
            "suspend_campaign",
            "restore_campaign",
            "restrict_user",
            "restore_user",
        ],
        required: true,
    },

    // Mandatory for reject / suspend; optional for approve / restore
    reason: {
        type: String,
        default: "",
        trim: true,
    },

    // Status transition
    previousStatus: {
        type: String,
        default: "",
    },
    newStatus: {
        type: String,
        default: "",
    },

    createdAt: {
        type: Date,
        default: Date.now,
        index: true,
    },
});

export default mongoose.models.ModerationLog || model("ModerationLog", ModerationLogSchema);
