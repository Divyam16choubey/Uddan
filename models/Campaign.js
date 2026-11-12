import mongoose from "mongoose";

const { Schema, model } = mongoose;

const CampaignSchema = new Schema(
    {
        // ── Identity ──────────────────────────────────────────────────────
        title: {
            type: String,
            required: [true, "Campaign title is required"],
            trim: true,
            minlength: [5, "Title must be at least 5 characters"],
            maxlength: [120, "Title must be 120 characters or fewer"],
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        description: {
            type: String,
            required: [true, "Campaign description is required"],
            trim: true,
            minlength: [20, "Description must be at least 20 characters"],
            maxlength: [2000, "Description must be 2000 characters or fewer"],
        },
        category: {
            type: String,
            required: [true, "Category is required"],
            enum: {
                values: [
                    "Technology",
                    "Education",
                    "Health",
                    "Environment",
                    "Arts & Culture",
                    "Community",
                    "Business",
                    "Other",
                ],
                message: "{VALUE} is not a supported category",
            },
        },
        coverImage: {
            type: String,
            trim: true,
            default: "",
        },

        // ── Funding ───────────────────────────────────────────────────────
        goalAmount: {
            type: Number,
            required: [true, "Funding goal is required"],
            min: [100, "Funding goal must be at least ₹100"],
            max: [10000000, "Funding goal cannot exceed ₹1,00,00,000"],
        },
        raisedAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        supporterCount: {
            type: Number,
            default: 0,
            min: 0,
        },

        // ── Ownership & Lifecycle ─────────────────────────────────────────
        creator: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Campaign must have a creator"],
            index: true,
        },
        deadline: {
            type: Date,
            required: [true, "Campaign deadline is required"],
        },

        // Lifecycle status — orthogonal to moderation status.
        //   draft     — saved but not yet published
        //   active    — published and accepting support
        //   expired   — deadline has passed but goal not met
        //   completed — goal reached or manually marked done
        status: {
            type: String,
            enum: ["draft", "active", "expired", "completed"],
            default: "active",
        },

        // ── Moderation ─────────────────────────────────────────────────────
        // Separated from lifecycle status.
        //   pending   — awaiting admin review (not shown publicly, no contributions)
        //   approved  — visible in discovery, accepts contributions
        //   rejected  — admin rejected; hidden from public, no new contributions
        //   suspended — was approved, now temporarily disabled by admin
        //
        // Default is "pending" for NEW campaigns.  Existing campaigns created
        // before this change must be migrated to "approved" to remain visible:
        //   mongosh uddan --eval 'db.campaigns.updateMany(
        //     { moderationStatus: { $in: [null, ""] } },
        //     { $set: { moderationStatus: "approved" } }
        //   )'
        moderationStatus: {
            type: String,
            enum: ["pending", "approved", "rejected", "suspended"],
            default: "pending",
            index: true,
        },
        moderationNote: {
            type: String,
            default: "",
            trim: true,
        },
        moderatedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        moderatedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

CampaignSchema.index({ creator: 1, createdAt: -1 });

export default mongoose.models.Campaign || model("Campaign", CampaignSchema);
