/**
 * POST /api/auth/otp/send
 *
 * Generates a 6-digit OTP, hashes it with HMAC-SHA256, stores the digest,
 * and delivers the plaintext code to the requested email address via Resend.
 *
 * Security model
 * ──────────────
 *  • Cryptographically secure random codes via crypto.getRandomValues.
 *  • Only an HMAC-SHA256 hex digest (keyed on OTP_HMAC_SECRET) is persisted.
 *    The plaintext OTP and the secret never appear in the database, logs,
 *    or any HTTP response.
 *  • Missing OTP_HMAC_SECRET is a hard startup error — the route returns 503
 *    rather than silently falling back to unkeyed hashing.
 *  • A new successful send atomically replaces any previous pending token for
 *    the same email, invalidating old codes.
 *  • Rate limits are enforced with atomic MongoDB increments (no TOCTOU gap):
 *      - Per-email send limit  : 5 sends per 15 minutes
 *      - Per-IP send limit     : 10 sends per 15 minutes
 *      - Per-email cooldown    : 60-second minimum between sends
 *  • Sandbox sender restriction is enforced server-side, fails closed, and
 *    cannot be bypassed by any client input or environment variable.
 *    When EMAIL_FROM uses onboarding@resend.dev, only uddan93@gmail.com is
 *    permitted as a recipient — no wildcard override is available.
 *  • API responses and server logs never contain OTP values, HMAC digests,
 *    the HMAC secret, or the Resend API key.
 *  • Error responses are deliberately vague to prevent email enumeration.
 */

import { NextResponse } from "next/server";
import crypto from "crypto";
import connectDb from "@/db/connectDb";
import OtpToken from "@/models/OtpToken";
import RateLimit from "@/models/RateLimit";

// ── Constants ────────────────────────────────────────────────────────────────

const OTP_EXPIRY_MS        = 5 * 60 * 1000;   // 5 minutes
const RESEND_COOLDOWN_SECS = 60;               // 60 s minimum between sends
const RESEND_COOLDOWN_MS   = RESEND_COOLDOWN_SECS * 1000;
const EMAIL_SEND_LIMIT     = 5;                // per email per window
const IP_SEND_LIMIT        = 10;               // per IP per window
const RATE_WINDOW_MS       = 15 * 60 * 1000;  // 15 minutes

// ── HMAC secret validation ────────────────────────────────────────────────────
//
// OTP_HMAC_SECRET must be set before this route can operate.
// We read it once at module load time and reject the request at the handler
// boundary if it is absent or too short (<32 chars) rather than silently
// degrading to an unkeyed hash.
//
// The secret is never logged, returned in a response, or included in
// error messages — only its presence and length are checked here.

function getHmacSecret() {
    const secret = process.env.OTP_HMAC_SECRET;
    if (!secret || secret.length < 32) return null;
    return secret;
}

/**
 * Compute HMAC-SHA256 of `value` using the server-side secret.
 * Returns a 64-character lowercase hex string.
 *
 * @param {string} value  — the OTP plaintext
 * @param {string} secret — OTP_HMAC_SECRET
 * @returns {string}
 */
function hmacHex(value, secret) {
    return crypto.createHmac("sha256", secret).update(value, "utf8").digest("hex");
}

// ── Sandbox sender restriction ────────────────────────────────────────────────
//
// When EMAIL_FROM contains "onboarding@resend.dev" (Resend's sandbox sender),
// delivery is restricted to the single hardcoded project email address.
//
// Design decisions:
//  • The permitted address is HARDCODED here, not read from an environment
//    variable, so it cannot be changed by misconfiguration or deployment error.
//  • There is NO wildcard override. When the sandbox sender is in use the
//    restriction is always active, regardless of any env var.
//  • To lift the restriction: switch EMAIL_FROM to a verified custom-domain
//    sender. The check tests the actual sender identity, not a flag.
//  • The check is performed before DB access and before any OTP is generated,
//    so a blocked request consumes no resources.

const SANDBOX_PERMITTED_RECIPIENT = "uddan93@gmail.com";

function isSandboxSender() {
    return (process.env.EMAIL_FROM || "").toLowerCase().includes("onboarding@resend.dev");
}

/**
 * Returns true when the recipient is permitted given the current sender.
 * Fails closed: if EMAIL_FROM is not configured, treated as sandbox.
 */
function isPermittedRecipient(email) {
    if (!process.env.EMAIL_FROM) {
        // No sender configured — treat as sandbox (fail closed).
        return email === SANDBOX_PERMITTED_RECIPIENT;
    }
    if (!isSandboxSender()) return true;  // custom domain: unrestricted
    return email === SANDBOX_PERMITTED_RECIPIENT;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Validate and normalise an email address. */
function normaliseEmail(raw) {
    if (typeof raw !== "string") return null;
    const t = raw.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return null;
    if (t.length > 254) return null;
    return t;
}

/** Cryptographically secure 6-digit OTP as a zero-padded string. */
function generateOtp() {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return String(buf[0] % 1_000_000).padStart(6, "0");
}

/**
 * Atomically increment a rate-limit bucket and return the post-increment count.
 *
 * Window reset: if the existing document's windowExpiresAt is in the past
 * (TTL cleanup has not yet fired), we reset it atomically by replacing the
 * document entirely rather than incrementing a stale window.
 *
 * Concurrent upsert race: if two requests simultaneously try to create the
 * same (action, key) document, one will get an E11000 duplicate-key error.
 * We catch that and retry once — the second attempt finds the existing doc
 * and increments it normally.
 *
 * @param {string} action    bucket namespace
 * @param {string} key       email or IP string
 * @param {number} windowMs  window duration in milliseconds
 * @returns {Promise<number>} post-increment count
 */
async function incrementRateLimit(action, key, windowMs) {
    const now = new Date();
    const windowExpiresAt = new Date(now.getTime() + windowMs);

    async function tryIncrement() {
        // If a document exists but its window has already expired (TTL cleanup
        // has not yet fired), replace it with a fresh window rather than
        // continuing to count into an expired bucket.
        const existing = await RateLimit.findOne({ action, key });

        if (existing && existing.windowExpiresAt <= now) {
            // Expired window — replace atomically.
            await RateLimit.replaceOne(
                { action, key, windowExpiresAt: existing.windowExpiresAt },
                { action, key, count: 1, firstHit: now, windowExpiresAt },
                { upsert: true }
            );
            return 1;
        }

        // Normal path: atomic increment of an active window, or fresh insert.
        const doc = await RateLimit.findOneAndUpdate(
            { action, key },
            {
                $inc: { count: 1 },
                $setOnInsert: { firstHit: now, windowExpiresAt },
            },
            { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
        );
        return doc.count;
    }

    try {
        return await tryIncrement();
    } catch (err) {
        // E11000: two concurrent requests raced to create the same document.
        // Retry once — the second attempt finds the existing document and
        // increments it normally.
        if (err.code === 11000) {
            return await tryIncrement();
        }
        throw err;
    }
}

/**
 * Returns the remaining cooldown in milliseconds for the given email (0 = ok).
 * Reads the most recently created OtpToken for the email.
 */
async function cooldownRemainingMs(email) {
    const existing = await OtpToken.findOne({ email }).sort({ createdAt: -1 });
    if (!existing) return 0;
    const elapsed   = Date.now() - existing.createdAt.getTime();
    const remaining = RESEND_COOLDOWN_MS - elapsed;
    return remaining > 0 ? remaining : 0;
}

/**
 * Extract the requester's IP address.
 *
 * Trust policy:
 *  - TRUST_PROXY env var controls whether X-Forwarded-For is consulted.
 *  - "1" (default for typical reverse-proxy setups): trust the first hop of
 *    X-Forwarded-For, then fall back to X-Real-IP.
 *  - Any other value (or absent): do not trust forwarding headers; use
 *    "unknown" so rate limiting falls back to per-email limits only.
 *
 * This prevents an attacker from spoofing their IP by injecting an arbitrary
 * X-Forwarded-For header when the application is not behind a trusted proxy.
 */
function extractIp(request) {
    const trustProxy = (process.env.TRUST_PROXY || "1") === "1";
    if (!trustProxy) return "unknown";

    return (
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "unknown"
    );
}

/**
 * Send the OTP via Resend.
 * The OTP plaintext is used only to build the email body and is never logged.
 * Returns { ok: true } or { ok: false, message: string }.
 */
async function sendOtpEmail(to, otp) {
    const apiKey = process.env.RESEND_API_KEY;
    const from   = process.env.EMAIL_FROM;

    if (!apiKey || !from) {
        console.error("[OTP send] RESEND_API_KEY or EMAIL_FROM not configured");
        return { ok: false, message: "Email service not configured" };
    }

    const body = JSON.stringify({
        from,
        to: [to],
        subject: "Your Uddan verification code",
        html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
                <h1 style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 8px">
                    Uddan verification code
                </h1>
                <p style="color:#475569;font-size:15px;margin:0 0 24px">
                    Use the code below to sign in. It expires in 5&nbsp;minutes.
                </p>
                <div style="background:#f1f5f9;border-radius:10px;padding:20px 24px;
                            text-align:center;font-size:36px;font-weight:700;
                            letter-spacing:0.25em;color:#1e293b">
                    ${otp}
                </div>
                <p style="color:#94a3b8;font-size:13px;margin:24px 0 0">
                    If you did not request this code, ignore this email.
                    Never share it with anyone.
                </p>
            </div>
        `,
        text: `Your Uddan verification code is: ${otp}\n\nExpires in 5 minutes. Do not share it.`,
    });

    let res;
    try {
        res = await fetch("https://api.resend.com/emails", {
            method:  "POST",
            headers: {
                Authorization:  `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body,
        });
    } catch (networkErr) {
        console.error("[OTP send] Resend network error:", networkErr.message);
        return { ok: false, message: "Failed to reach email service" };
    }

    if (!res.ok) {
        let detail = "";
        try { detail = (await res.json())?.message || ""; } catch (_) { /* ignore */ }
        console.error(`[OTP send] Resend rejected (${res.status}): ${detail}`);
        return { ok: false, message: "Email delivery failed" };
    }

    return { ok: true };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request) {
    // 0. Verify HMAC secret is configured — fail closed if not.
    const hmacSecret = getHmacSecret();
    if (!hmacSecret) {
        console.error("[OTP send] OTP_HMAC_SECRET is not configured or is too short (<32 chars)");
        return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
    }

    // 1. Parse body.
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    // 2. Validate and normalise email.
    const email = normaliseEmail(body?.email);
    if (!email) {
        return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    }

    // 3. Sandbox sender restriction — server-side, fails closed, no bypass.
    if (!isPermittedRecipient(email)) {
        return NextResponse.json(
            {
                error:
                    "Development mode: OTP delivery is restricted to the project test address. " +
                    "Switch EMAIL_FROM to a verified custom-domain sender to remove this restriction.",
                devOnly: true,
            },
            { status: 403 }
        );
    }

    // 4. Connect to database.
    try {
        await connectDb();
    } catch (dbErr) {
        console.error("[OTP send] DB connection error:", dbErr.message);
        return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
    }

    const ip = extractIp(request);

    // 5. Per-IP rate limit (10 sends / 15 min).
    let ipCount;
    try {
        ipCount = await incrementRateLimit("otp_send_ip", ip, RATE_WINDOW_MS);
    } catch (rlErr) {
        console.error("[OTP send] Rate limit (IP) error:", rlErr.message);
        return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
    }
    if (ipCount > IP_SEND_LIMIT) {
        return NextResponse.json(
            { error: "Too many requests. Please try again later." },
            { status: 429 }
        );
    }

    // 6. Per-email rate limit (5 sends / 15 min).
    let emailCount;
    try {
        emailCount = await incrementRateLimit("otp_send_email", email, RATE_WINDOW_MS);
    } catch (rlErr) {
        console.error("[OTP send] Rate limit (email) error:", rlErr.message);
        return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
    }
    if (emailCount > EMAIL_SEND_LIMIT) {
        return NextResponse.json(
            { error: "Too many requests. Please try again later." },
            { status: 429 }
        );
    }

    // 7. Per-email resend cooldown.
    let cooldown;
    try {
        cooldown = await cooldownRemainingMs(email);
    } catch (cdErr) {
        console.error("[OTP send] Cooldown check error:", cdErr.message);
        return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
    }
    if (cooldown > 0) {
        const secondsLeft = Math.ceil(cooldown / 1000);
        return NextResponse.json(
            {
                error: `Please wait ${secondsLeft} second${secondsLeft === 1 ? "" : "s"} before requesting a new code.`,
                retryAfter: secondsLeft,
            },
            { status: 429 }
        );
    }

    // 8. Generate OTP and compute HMAC-SHA256 digest.
    //    The OTP plaintext lives only in this local scope; it is never
    //    written to the database, logged, or returned to the client.
    const otp      = generateOtp();
    const codeHash = hmacHex(otp, hmacSecret);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    // 9. Atomically replace any existing token for this email.
    try {
        await OtpToken.replaceOne(
            { email },
            { email, codeHash, expiresAt, attempts: 0, used: false, createdAt: new Date() },
            { upsert: true }
        );
    } catch (dbErr) {
        console.error("[OTP send] Token store error:", dbErr.message);
        return NextResponse.json({ error: "Failed to generate verification code" }, { status: 500 });
    }

    // 10. Deliver via Resend.
    const delivery = await sendOtpEmail(email, otp);

    if (!delivery.ok) {
        // Roll back the token so the user is not locked into a cooldown
        // for a code they never received.
        try {
            await OtpToken.deleteOne({ email });
        } catch (cleanupErr) {
            console.error("[OTP send] Token cleanup error:", cleanupErr.message);
        }
        return NextResponse.json(
            { error: "We could not send the verification email. Please try again." },
            { status: 502 }
        );
    }

    // 11. Success — never include the OTP, hash, or account existence signal.
    return NextResponse.json(
        {
            sent: true,
            expiresInSeconds: Math.floor(OTP_EXPIRY_MS / 1000),
            resendCooldown:   RESEND_COOLDOWN_SECS,
        },
        { status: 200 }
    );
}
