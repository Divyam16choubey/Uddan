/**
 * NextAuth v4 configuration — Uddan
 *
 * Security corrections in this revision
 * ───────────────────────────────────────
 *  1. HMAC-SHA256 (keyed on OTP_HMAC_SECRET) replaces plain SHA-256.
 *     Missing/short secret → fails closed (returns null, never degrades).
 *  2. Google signIn requires profile.email_verified === true.
 *     Missing, false, or non-boolean claims are rejected.
 *  3. Rate-limit window: expired-but-not-TTL-cleaned documents are reset
 *     atomically before incrementing. Concurrent upsert E11000 is retried.
 *  4. IP extraction respects TRUST_PROXY env var — untrusted when "0".
 *
 * Providers
 * ─────────
 *  1. GitHub   — always present; existing behaviour unchanged.
 *  2. Google   — conditional on GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET.
 *  3. email-otp (CredentialsProvider) — HMAC-verified 6-digit OTP.
 */

import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import crypto from "crypto";
import connectDb from "@/db/connectDb";
import User from "@/models/User";
import OtpToken from "@/models/OtpToken";
import RateLimit from "@/models/RateLimit";

// ── Constants ────────────────────────────────────────────────────────────────

const OTP_MAX_ATTEMPTS = 5;
const VERIFY_EMAIL_LIMIT = 10;
const VERIFY_IP_LIMIT = 20;
const VERIFY_WINDOW_MS = 15 * 60 * 1000;

// ── HMAC secret ───────────────────────────────────────────────────────────────

function getHmacSecret() {
    const s = process.env.OTP_HMAC_SECRET;
    if (!s || s.length < 32) return null;
    return s;
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

function hmacHex(value, secret) {
    return crypto.createHmac("sha256", secret).update(value, "utf8").digest("hex");
}

function safeEqual(a, b) {
    if (typeof a !== "string" || typeof b !== "string") return false;
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

function normaliseEmail(raw) {
    if (typeof raw !== "string") return null;
    const t = raw.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return null;
    if (t.length > 254) return null;
    return t;
}

function normaliseOtp(raw) {
    if (typeof raw !== "string") return null;
    const t = raw.trim();
    if (!/^\d{6}$/.test(t)) return null;
    return t;
}

// ── Rate limiter ──────────────────────────────────────────────────────────────

async function incrementRateLimit(action, key, windowMs) {
    const now = new Date();
    const windowExpiresAt = new Date(now.getTime() + windowMs);

    async function tryIncrement() {
        const existing = await RateLimit.findOne({ action, key });

        if (existing && existing.windowExpiresAt <= now) {
            // Expired window — reset atomically before incrementing.
            await RateLimit.replaceOne(
                { action, key, windowExpiresAt: existing.windowExpiresAt },
                { action, key, count: 1, firstHit: now, windowExpiresAt },
                { upsert: true }
            );
            return 1;
        }

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
        if (err.code === 11000) {
            return await tryIncrement();
        }
        throw err;
    }
}

/**
 * Extract requester IP.
 * TRUST_PROXY="1" (default): trust X-Forwarded-For first hop + X-Real-IP.
 * Any other value: return "unknown" — per-email limits still apply.
 */
function extractIp(req) {
    const trust = (process.env.TRUST_PROXY || "1") === "1";
    if (!trust) return "unknown";
    return (
        req?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req?.headers?.["x-real-ip"] ||
        "unknown"
    );
}

// ── Username derivation ───────────────────────────────────────────────────────

async function deriveUniqueUsername(email) {
    const base =
        email.split("@")[0].toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 30) || "user";

    if (!(await User.exists({ username: base }))) return base;

    for (let i = 0; i < 5; i++) {
        const candidate = `${base}_${crypto.randomBytes(2).toString("hex")}`.slice(0, 36);
        if (!(await User.exists({ username: candidate }))) return candidate;
    }

    return `user_${crypto.randomBytes(4).toString("hex")}`;
}

// ── Safe account resolution ───────────────────────────────────────────────────

async function resolveOrCreateUser({ email, name = "", profilepic = "" }) {
    const existing = await User.findOne({ email });
    if (existing) return existing;

    const username = await deriveUniqueUsername(email);

    try {
        return await User.create({ email, username, name: name || "", profilepic: profilepic || "" });
    } catch (err) {
        if (err.code === 11000) {
            const winner = await User.findOne({ email });
            if (winner) return winner;
        }
        throw err;
    }
}

// ── OTP verification ──────────────────────────────────────────────────────────

async function verifyOtp(email, otp, ip) {
    // Fail closed on missing HMAC secret.
    const hmacSecret = getHmacSecret();
    if (!hmacSecret) {
        console.error("[OTP verify] OTP_HMAC_SECRET not configured");
        return null;
    }

    // Verification-side rate limiting.
    const emailCount = await incrementRateLimit("otp_verify_email", email, VERIFY_WINDOW_MS);
    if (emailCount > VERIFY_EMAIL_LIMIT) {
        console.warn("[OTP verify] Email rate limit:", email);
        return null;
    }

    if (ip && ip !== "unknown") {
        const ipCount = await incrementRateLimit("otp_verify_ip", ip, VERIFY_WINDOW_MS);
        if (ipCount > VERIFY_IP_LIMIT) {
            console.warn("[OTP verify] IP rate limit:", ip);
            return null;
        }
    }

    // Atomic attempt increment.
    const token = await OtpToken.findOneAndUpdate(
        { email, used: false, expiresAt: { $gt: new Date() } },
        { $inc: { attempts: 1 } },
        { returnDocument: "after" }
    );

    if (!token) return null;

    if (token.attempts > OTP_MAX_ATTEMPTS) {
        console.warn("[OTP verify] Max attempts reached:", email);
        return null;
    }

    // Constant-time HMAC comparison.
    const submittedDigest = hmacHex(otp, hmacSecret);
    if (!safeEqual(submittedDigest, token.codeHash)) {
        return null;
    }

    // Atomic consumption — prevents replay.
    const consumed = await OtpToken.findOneAndUpdate(
        { _id: token._id, used: false },
        { $set: { used: true } },
        { returnDocument: "after" }
    );

    if (!consumed) {
        console.warn("[OTP verify] Replay prevented:", email);
        return null;
    }

    return resolveOrCreateUser({ email });
}

// ── Build providers ───────────────────────────────────────────────────────────

const providers = [];

// 1. GitHub — always present.
providers.push(
    GitHubProvider({
        clientId: process.env.GITHUB_ID,
        clientSecret: process.env.GITHUB_SECRET,
    })
);

// 2. Google — conditional on real credentials.
if (
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CLIENT_ID !== "your_google_client_id" &&
    process.env.GOOGLE_CLIENT_SECRET !== "your_google_client_secret"
) {
    providers.push(
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: { params: { prompt: "consent", access_type: "online" } },
        })
    );
}

// 3. Email OTP — always present.
providers.push(
    CredentialsProvider({
        id: "email-otp",
        name: "Email OTP",
        credentials: {
            email: { label: "Email", type: "email" },
            otp: { label: "Verification code", type: "text" },
        },
        async authorize(credentials, req) {
            const email = normaliseEmail(credentials?.email);
            const otp = normaliseOtp(credentials?.otp);
            if (!email || !otp) return null;

            const ip = extractIp(req);

            try {
                await connectDb();
                const user = await verifyOtp(email, otp, ip);
                if (!user) return null;
                return { id: user._id.toString(), email: user.email };
            } catch (err) {
                console.error("[OTP authorize] Error:", err.message);
                return null;
            }
        },
    })
);

// ── authOptions ───────────────────────────────────────────────────────────────

export const authOptions = {
    providers,
    session: { strategy: "jwt" },

    callbacks: {
        async signIn({ user, account, profile }) {
            // ── GitHub ───────────────────────────────────────────────────────
            if (account.provider === "github") {
                const email = normaliseEmail(user.email);
                if (!email) return false;

                try {
                    await connectDb();
                    await resolveOrCreateUser({
                        email,
                        name: user.name || "",
                        profilepic: user.image || "",
                    });
                } catch (err) {
                    console.error("[signIn:github] DB error:", err.message);
                    return false;
                }
                return true;
            }

            // ── Google ───────────────────────────────────────────────────────
            if (account.provider === "google") {
                // Require an explicitly verified email claim.
                // profile.email_verified must be the boolean true — not a
                // truthy string, not undefined, not null.
                if (profile?.email_verified !== true) {
                    console.warn("[signIn:google] Rejected — email_verified not true"); return false;
                }

                const email = normaliseEmail(user.email);
                if (!email) return false;

                try {
                    await connectDb();
                    await resolveOrCreateUser({
                        email,
                        name: user.name || "",
                        profilepic: user.image || "",
                    });
                } catch (err) {
                    console.error("[signIn:google] DB error:", err.message);
                    return false;
                }
                return true;
            }

            // ── Email OTP ────────────────────────────────────────────────────
            // authorize() verified the OTP and resolved the user.
            if (account.provider === "email-otp") {
                return true;
            }

            // Unknown provider — deny.
            return false;
        },

        async session({ session }) {
            try {
                await connectDb();
                const dbUser = await User.findOne({ email: session.user.email });
                if (dbUser) {
                    session.user.name = dbUser.username;
                    session.user.role = dbUser.role || "user";
                    session.user.isRestricted = dbUser.isRestricted || false;
                }
            } catch (err) {
                console.error("[session] DB error:", err.message);
            }
            return session;
        },
    },

    pages: { signIn: "/login" },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
