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
    // Outer try/catch so any unexpected throw returns a JSON error instead of
    // a bare 500, and logs the full error to the terminal for debugging.
    try {
        await connectDb()

        // ── 1. Parse the form-encoded body from Razorpay ─────────────────
        let body
        try {
            const raw = await req.formData()
            body = Object.fromEntries(raw)
        } catch (parseErr) {
            console.error("[razorpay] Failed to parse request body:", parseErr?.message)
            return NextResponse.json({ success: false, message: "Invalid request body" })
        }

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            console.warn("[razorpay] Missing fields — order:", !!razorpay_order_id,
                "payment:", !!razorpay_payment_id, "sig:", !!razorpay_signature)
            return NextResponse.json({ success: false, message: "Missing payment fields" })
        }

        // ── 2. Look up the pending Payment record ─────────────────────────
        const p = await Payment.findOne({ oid: razorpay_order_id })
        if (!p) {
            console.warn("[razorpay] No Payment record for order:", razorpay_order_id)
            return NextResponse.json({ success: false, message: "Order not found" })
        }

        // ── 3. Idempotency — already processed ───────────────────────────
        // If done is already true this is a duplicate callback.  Redirect to
        // the appropriate success page without modifying anything.
        if (p.done === true) {
            console.log("[razorpay] Already processed, redirecting:", razorpay_order_id)
            const successUrl = await buildSuccessUrl(p)   // ← must be awaited
            return NextResponse.redirect(successUrl)
        }

        // ── 4. Look up creator's Razorpay secret for signature verification
        const user = await User.findOne({ username: p.to_user })
        if (!user || !user.razorpaysecret) {
            console.error("[razorpay] Creator not found or has no razorpaysecret for user:", p.to_user)
            return NextResponse.json({ success: false, message: "Creator credentials not found" })
        }

        // ── 5. Verify HMAC signature ──────────────────────────────────────
        const isValid = validatePaymentVerification(
            { order_id: razorpay_order_id, payment_id: razorpay_payment_id },
            razorpay_signature,
            user.razorpaysecret
        )

        if (!isValid) {
            console.warn("[razorpay] Signature verification failed for order:", razorpay_order_id)
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
        } catch (updateErr) {
            // Duplicate key on razorpayPaymentId means this payment_id was
            // already stored — another concurrent request got here first.
            // Redirect to the success page without re-counting.
            if (updateErr.code === 11000) {
                console.log("[razorpay] Duplicate payment_id, skipping:", razorpay_payment_id)
                const successUrl = await buildSuccessUrl(p)   // ← must be awaited
                return NextResponse.redirect(successUrl)
            }
            console.error("[razorpay] Payment update error:", updateErr?.message)
            return NextResponse.json({ success: false, message: "Failed to record payment" })
        }

        // ── 7. Update campaign totals if this is a campaign contribution ──
        if (p.campaign) {
            try {
                await Campaign.findByIdAndUpdate(
                    p.campaign,
                    {
                        $inc: {
                            raisedAmount:   p.amount,   // stored in rupees
                            supporterCount: 1,          // one transaction = one supporter
                        },
                    }
                )
                console.log("[razorpay] Campaign totals updated for campaign:", p.campaign.toString())
            } catch (campaignErr) {
                // Log but do not block — the payment is already confirmed.
                // Campaign totals can be reconciled from Payment records if needed.
                console.error("[razorpay] Campaign totals update error:", campaignErr?.message)
            }
        }

        // ── 8. Redirect to appropriate success page ───────────────────────
        const successUrl = await buildSuccessUrl(p)   // ← must be awaited
        console.log("[razorpay] Payment verified, redirecting to:", successUrl)
        return NextResponse.redirect(successUrl)

    } catch (err) {
        // Catch-all: log the full error to the terminal and return a safe JSON
        // response so the browser does not see a raw Next.js 500 page.
        console.error("[razorpay] Unhandled error in POST handler:", err)
        return NextResponse.json(
            { success: false, message: "Internal server error — please try again." },
            { status: 500 }
        )
    }
}

// ---------------------------------------------------------------------------
// buildSuccessUrl  (async — must be awaited at every call site)
//
// Campaign payments → /campaign/{slug}?paymentdone=true
// Legacy profile payments → /{username}?paymentdone=true
// ---------------------------------------------------------------------------
async function buildSuccessUrl(payment) {
    const base = process.env.NEXT_PUBLIC_URL || ""

    if (payment.campaign) {
        try {
            const campaign = await Campaign.findById(payment.campaign).select("slug").lean()
            if (campaign?.slug) {
                return `${base}/campaign/${campaign.slug}?paymentdone=true`
            }
        } catch (err) {
            console.error("[razorpay] buildSuccessUrl campaign lookup error:", err?.message)
            // Fall through to the profile URL
        }
    }

    // Legacy fallback — profile page payment
    return `${base}/${payment.to_user}?paymentdone=true`
}
