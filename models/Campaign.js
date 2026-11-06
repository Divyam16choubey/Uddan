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
        // raisedAmount and supporterCount are ONLY updated by the payment
        // webhook — never via the campaign update action.
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
        // ObjectId ref to User — identity is established server-side from
        // the session and never accepted from the client.
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

        // Status rules:
        //   draft     — saved but not yet published (reserved for future use)
        //   active    — published and accepting support
        //   expired   — deadline has passed but goal not met
        //   completed — creator has manually marked the campaign as done
        //               OR the funding goal was reached (set programmatically
        //               by the payment webhook, not by the update action)
        //
        // Automatic expiry is NOT applied by the update action; the status
        // is derived at read time for display purposes only (see server
        // actions).  This preserves the stored status as the source of truth.
        status: {
            type: String,
            enum: ["draft", "active", "expired", "completed"],
            default: "active",
        },
    },
    {
        timestamps: true, // adds createdAt and updatedAt automatically
    }
);

// Compound index: quickly fetch all campaigns for a creator, newest first.
CampaignSchema.index({ creator: 1, createdAt: -1 });

export default mongoose.models.Campaign || model("Campaign", CampaignSchema);
