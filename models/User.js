import mongoose from "mongoose";

const {Schema, model} = mongoose;

const UserSchema = new Schema({
    email: { type: String, required: true },
    name: { type: String},
    username: { type: String, required: true },
    profilepic: {type: String},
    coverpic: {type: String},
    razorpayid: { type: String },
    razorpaysecret: { type: String },
    // ── Admin / Moderation ──────────────────────────────────────────────
    // role defaults to "user" — existing users are unaffected.
    // The first admin must be promoted directly in the DB:
    //   mongosh uddan --eval 'db.users.updateOne({email:"you@example.com"},{$set:{role:"admin"}})'
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user",
        index: true,
    },
    // Restricted users cannot create campaigns or accept new payments.
    // Existing campaigns and payment records remain intact.
    isRestricted: {
        type: Boolean,
        default: false,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.User || model("User", UserSchema);
