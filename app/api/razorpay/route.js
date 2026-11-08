import { NextResponse } from "next/server";
import { validatePaymentVerification } from "razorpay/dist/utils/razorpay-utils";
import Payment from "@/models/Payment";
import Campaign from "@/models/Campaign";
import connectDb from "@/db/connectDb";
import User from "@/models/User";

// ---------------------------------------------------------------------------
// POST /api/razorpay
//
// Razorpay posts form-encoded data here after the payer completes (or
// abandons) checkout.  This route handles both the legacy creator-profile
// flow and the new campaign-specific contribution flow.
//
// Duplicate-prevention strategy
// ──────────────────────────────
// 1. If Payment.done is already true when we receive the callback the payment
//    was already processed — return a success redirect immediately.
// 2. After HMAC verification we attempt to store the razorpayPaymentId on the
//    Payment document.  This field has a sparse unique index, so a second
//    identical POST (same payment_id) will hit a duplicate-key error and we
//    redirect without touching campaign totals again.
// 3. Campaign totals (raisedAmount, supporterCount) are updated with $inc in
//    a single findOneAndUpdate call — atomic at the document level.
//
// supporterCount rule: each verified successful contribution increments by 1,
// meaning it counts transactions, not unique contributors.
// ---------------------------------------------------------------------------
export const POST = async (req) => {
    await connectDb()

    // ── 1. Parse the form-encoded body from Razorpay ─────────────────────
    let body
    try {
        const raw = await req.formData()
        body = Object.fromEntries(raw)
    } catch {
        return NextResponse.json({ success: false, message: "Invalid request body" })
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return NextResponse.json({ success: false, message: "Missing payment fields" })
    }

    // ── 2. Look up the pending Payment record ────────────────────────────
    const p = await Payment.findOne({ oid: razorpay_order_id })
    if (!p) {
        return NextResponse.json({ success: false, message: "Order not found" })
    }

    // ── 3. Idempotency — already processed ──────────────────────────────
    // If done is already true this is a duplicate callback.  Redirect to the
    // appropriate success page without modifying anything.
    if (p.done === true) {
        const successUrl = _buildSuccessUrl(p)
        return NextResponse.redirect(successUrl)
    }

    // ── 4. Look up creator's Razorpay secret for signature verification ──
    const user = await User.findOne({ username: p.to_user })
    if (!user || !user.razorpaysecret) {
        return NextResponse.json({ success: false, message: "Creator credentials not found" })
    }

    // ── 5. Verify HMAC signature ─────────────────────────────────────────
    const isValid = validatePaymentVerification(
        { order_id: razorpay_order_id, payment_id: razorpay_payment_id },
        razorpay_signature,
        user.razorpaysecret
    )

    if (!isValid) {
        return NextResponse.json({ success: false, message: "Payment verification failed" })
    }

    // ── 6. Store payment ID and mark done (unique index prevents duplicates)
    try {
        await Payment.findOneAndUpdate(
            { oid: razorpay_order_id, done: false },   // only update if still pending
            {
                done:              true,
                razorpayPaymentId: razorpay_payment_id,
                updatedAt:         new Date(),
            }
        )
    } catch (err) {
        // Duplicate key on razorpayPaymentId means this payment_id was already
        // stored — another request got here first.  Redirect without re-counting.
        if (err.code === 11000) {
            const successUrl = _buildSuccessUrl(p)
            return NextResponse.redirect(successUrl)
        }
        console.error("Payment update error:", err)
        return NextResponse.json({ success: false, message: "Failed to record payment" })
    }

    // ── 7. Update campaign totals if this is a campaign contribution ──────
    if (p.campaign) {
        try {
            await Campaign.findByIdAndUpdate(
                p.campaign,
                {
                    $inc: {
                        raisedAmount:   p.amount,    // stored in rupees
                        supporterCount: 1,           // one transaction = one supporter
                    },
                }
            )
        } catch (err) {
            // Log but do not block — the payment is already confirmed.
            // Campaign totals can be reconciled from Payment records if needed.
            console.error("Campaign totals update error:", err)
        }
    }

    // ── 8. Redirect to appropriate success page ──────────────────────────
    const successUrl = _buildSuccessUrl(p)
    return NextResponse.redirect(successUrl)
}

// ---------------------------------------------------------------------------
// _buildSuccessUrl
// Campaign payments return to /campaign/{slug}?paymentdone=true
// Legacy profile payments return to /{username}?paymentdone=true
// ---------------------------------------------------------------------------
async function _buildSuccessUrl(payment) {
    const base = process.env.NEXT_PUBLIC_URL || ""

    // If this payment has a campaign reference, resolve the slug
    if (payment.campaign) {
        try {
            const campaign = await Campaign.findById(payment.campaign).select("slug").lean()
            if (campaign?.slug) {
                return `${base}/campaign/${campaign.slug}?paymentdone=true`
            }
        } catch {
            // Fall through to profile URL on error
        }
    }

    // Legacy fallback — profile page payment
    return `${base}/${payment.to_user}?paymentdone=true`
}
