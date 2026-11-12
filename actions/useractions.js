"use server"

import Razorpay from "razorpay"
import Payment from "@/models/Payment"
import connectDb from "@/db/connectDb"
import User from "@/models/User"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

// ---------------------------------------------------------------------------
// initiate — create a Razorpay order for a payment to `to_username`
// ---------------------------------------------------------------------------
export const initiate = async (amount, to_username, paymentform) => {
    await connectDb()

    // Fetch the creator's Razorpay credentials from the database
    const user = await User.findOne({ username: to_username })
    if (!user) {
        throw new Error("User not found")
    }

    // Restricted users cannot receive new payments
    if (user.isRestricted) {
        throw new Error("This creator is currently unavailable")
    }

    const instance = new Razorpay({
        key_id: user.razorpayid,
        key_secret: user.razorpaysecret,
    })

    const options = {
        amount: Number.parseInt(amount),
        currency: "INR",
    }

    const order = await instance.orders.create(options)

    // Record the pending payment in the database
    await Payment.create({
        oid: order.id,
        amount: amount / 100,
        to_user: to_username,
        name: paymentform.name,
        message: paymentform.message,
    })

    return order
}

// ---------------------------------------------------------------------------
// fetchuser — return public profile data (razorpaysecret excluded)
// ---------------------------------------------------------------------------
export const fetchuser = async (username) => {
    await connectDb()
    const user = await User.findOne({ username })
        .select("-razorpaysecret")
        .lean()

    if (!user) {
        return null
    }

    // Convert ObjectId fields to plain strings
    return JSON.parse(JSON.stringify(user))
}

// ---------------------------------------------------------------------------
// fetchpayments — return top-10 completed payments for a creator
// ---------------------------------------------------------------------------
export const fetchpayments = async (username) => {
    await connectDb()
    const payments = await Payment.find({ to_user: username, done: true })
        .sort({ amount: -1 })
        .limit(10)
        .lean()

    return JSON.parse(JSON.stringify(payments))
}

// ---------------------------------------------------------------------------
// updateProfile — update the currently authenticated user's profile
//
// Security:
//   - Identity is established via getServerSession — never from client input.
//   - Only whitelisted fields are applied to the DB update.
//   - razorpaysecret is accepted so the user can configure it, but it is
//     never returned to the client (fetchuser always excludes it).
// ---------------------------------------------------------------------------
export const updateProfile = async (formData, oldUsername) => {
    // 1. Verify the caller is authenticated
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
        return { error: "Unauthorised" }
    }

    await connectDb()

    // 2. Confirm the old username belongs to the authenticated user
    const sessionUser = await User.findOne({ email: session.user.email })
    if (!sessionUser) {
        return { error: "User not found" }
    }
    if (sessionUser.username !== oldUsername) {
        return { error: "Unauthorised" }
    }

    // Restricted users can update cosmetic profile fields (name, profilepic,
    // coverpic) but CANNOT change payment credentials or username.
    const ALLOWED_FIELDS = sessionUser.isRestricted
        ? ["name", "profilepic", "coverpic"]
        : ["name", "username", "profilepic", "coverpic", "razorpayid", "razorpaysecret"]

    const updates = {}
    for (const field of ALLOWED_FIELDS) {
        const value = formData.get(field)
        if (value !== null) {
            updates[field] = value
        }
    }

    // 4. If username is changing, make sure it is available
    const newUsername = updates.username
    if (newUsername && newUsername !== oldUsername) {
        const taken = await User.findOne({ username: newUsername })
        if (taken) {
            return { error: "Username is not available" }
        }

        // Apply the update and cascade to payments
        await User.updateOne({ email: session.user.email }, updates)
        await Payment.updateMany({ to_user: oldUsername }, { to_user: newUsername })
    } else {
        await User.updateOne({ email: session.user.email }, updates)
    }

    return { success: true }
}
