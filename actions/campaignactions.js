"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import connectDb from "@/db/connectDb"
import User from "@/models/User"
import Campaign from "@/models/Campaign"

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a URL-safe slug from a string.
 * Appends a short random suffix to avoid collisions when titles are similar.
 */
function makeSlug(title) {
    const base = title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")   // strip non-alphanum
        .replace(/\s+/g, "-")            // spaces → hyphens
        .replace(/-+/g, "-")             // collapse consecutive hyphens
        .slice(0, 80)                    // cap base length
    const suffix = Math.random().toString(36).slice(2, 7)  // 5-char random
    return `${base}-${suffix}`
}

/**
 * Resolve the authenticated User document from the current session.
 * Returns { sessionUser } on success or { error } on failure.
 */
async function getSessionUser() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return { error: "Unauthorised — please sign in" }
    }
    await connectDb()
    const sessionUser = await User.findOne({ email: session.user.email }).lean()
    if (!sessionUser) {
        return { error: "User account not found" }
    }
    return { sessionUser }
}

/**
 * Validate the fields used when creating or updating a campaign.
 * Returns an error string, or null when everything is valid.
 */
function validateCampaignFields({ title, description, category, goalAmount, deadline, isCreate = false }) {
    if (!title || title.trim().length < 5)
        return "Title must be at least 5 characters"
    if (title.trim().length > 120)
        return "Title must be 120 characters or fewer"
    if (!description || description.trim().length < 20)
        return "Description must be at least 20 characters"
    if (description.trim().length > 2000)
        return "Description must be 2000 characters or fewer"

    const CATEGORIES = [
        "Technology", "Education", "Health", "Environment",
        "Arts & Culture", "Community", "Business", "Other",
    ]
    if (!category || !CATEGORIES.includes(category))
        return "Please select a valid category"

    const goal = Number(goalAmount)
    if (!goalAmount || isNaN(goal) || goal < 100)
        return "Funding goal must be at least ₹100"
    if (goal > 10000000)
        return "Funding goal cannot exceed ₹1,00,00,000"

    if (!deadline)
        return "Campaign deadline is required"

    const deadlineDate = new Date(deadline)
    if (isNaN(deadlineDate.getTime()))
        return "Invalid deadline date"

    // Only enforce future date when creating — allow edits on existing campaigns
    // even if the deadline is close, but still reject past dates on creation.
    if (isCreate) {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)
        if (deadlineDate < tomorrow)
            return "Deadline must be at least tomorrow"
    }

    return null
}

// ── Server Actions ────────────────────────────────────────────────────────────

// ---------------------------------------------------------------------------
// createCampaign
// ---------------------------------------------------------------------------
export async function createCampaign(formData) {
    const { sessionUser, error } = await getSessionUser()
    if (error) return { error }

    const title       = formData.get("title")?.toString().trim() ?? ""
    const description = formData.get("description")?.toString().trim() ?? ""
    const category    = formData.get("category")?.toString().trim() ?? ""
    const coverImage  = formData.get("coverImage")?.toString().trim() ?? ""
    const goalAmount  = formData.get("goalAmount")?.toString().trim() ?? ""
    const deadline    = formData.get("deadline")?.toString().trim() ?? ""

    const validationError = validateCampaignFields({
        title, description, category, goalAmount, deadline, isCreate: true,
    })
    if (validationError) return { error: validationError }

    // Validate cover image URL format when provided
    if (coverImage) {
        try {
            const url = new URL(coverImage)
            if (!["http:", "https:"].includes(url.protocol)) {
                return { error: "Cover image must be an HTTP or HTTPS URL" }
            }
        } catch {
            return { error: "Cover image must be a valid URL" }
        }
    }

    const slug = makeSlug(title)

    try {
        const campaign = await Campaign.create({
            title,
            slug,
            description,
            category,
            coverImage,
            goalAmount: Number(goalAmount),
            deadline:   new Date(deadline),
            creator:    sessionUser._id,
            status:     "active",
        })

        return { success: true, campaignId: campaign._id.toString(), slug: campaign.slug }
    } catch (err) {
        // Mongoose duplicate key on slug (extremely rare with random suffix)
        if (err.code === 11000) {
            return { error: "A campaign with a similar title already exists. Please adjust your title slightly." }
        }
        console.error("createCampaign error:", err)
        return { error: "Failed to create campaign. Please try again." }
    }
}

// ---------------------------------------------------------------------------
// getUserCampaigns — fetch all campaigns belonging to the signed-in user
// ---------------------------------------------------------------------------
export async function getUserCampaigns() {
    const { sessionUser, error } = await getSessionUser()
    if (error) return { error }

    try {
        const campaigns = await Campaign.find({ creator: sessionUser._id })
            .sort({ createdAt: -1 })
            .lean()

        // Derive display status: if the stored status is "active" but the
        // deadline has passed, surface it as "expired" for display only.
        // The stored status in the DB is NOT modified here — that keeps the
        // source of truth clean.
        const now = new Date()
        const serialised = campaigns.map((c) => ({
            ...c,
            _id:         c._id.toString(),
            creator:     c.creator.toString(),
            createdAt:   c.createdAt.toISOString(),
            updatedAt:   c.updatedAt.toISOString(),
            deadline:    c.deadline.toISOString(),
            displayStatus: c.status === "active" && c.deadline < now ? "expired" : c.status,
        }))

        return { success: true, campaigns: serialised }
    } catch (err) {
        console.error("getUserCampaigns error:", err)
        return { error: "Failed to load campaigns. Please try again." }
    }
}

// ---------------------------------------------------------------------------
// getCampaignById — fetch one campaign; verifies ownership
// ---------------------------------------------------------------------------
export async function getCampaignById(id) {
    const { sessionUser, error } = await getSessionUser()
    if (error) return { error }

    if (!id || typeof id !== "string" || id.length !== 24) {
        return { error: "Invalid campaign ID" }
    }

    try {
        const campaign = await Campaign.findById(id).lean()
        if (!campaign) return { error: "Campaign not found" }

        if (campaign.creator.toString() !== sessionUser._id.toString()) {
            return { error: "Unauthorised — you do not own this campaign" }
        }

        return {
            success: true,
            campaign: {
                ...campaign,
                _id:       campaign._id.toString(),
                creator:   campaign.creator.toString(),
                createdAt: campaign.createdAt.toISOString(),
                updatedAt: campaign.updatedAt.toISOString(),
                deadline:  campaign.deadline.toISOString(),
            },
        }
    } catch (err) {
        console.error("getCampaignById error:", err)
        return { error: "Failed to fetch campaign. Please try again." }
    }
}

// ---------------------------------------------------------------------------
// updateCampaign
// Immutable fields: creator, raisedAmount, supporterCount, slug
// ---------------------------------------------------------------------------
export async function updateCampaign(id, formData) {
    const { sessionUser, error } = await getSessionUser()
    if (error) return { error }

    if (!id || typeof id !== "string" || id.length !== 24) {
        return { error: "Invalid campaign ID" }
    }

    try {
        const campaign = await Campaign.findById(id)
        if (!campaign) return { error: "Campaign not found" }

        if (campaign.creator.toString() !== sessionUser._id.toString()) {
            return { error: "Unauthorised — you do not own this campaign" }
        }

        // Prevent editing a completed campaign
        if (campaign.status === "completed") {
            return { error: "Completed campaigns cannot be edited" }
        }

        const title       = formData.get("title")?.toString().trim() ?? ""
        const description = formData.get("description")?.toString().trim() ?? ""
        const category    = formData.get("category")?.toString().trim() ?? ""
        const coverImage  = formData.get("coverImage")?.toString().trim() ?? ""
        const goalAmount  = formData.get("goalAmount")?.toString().trim() ?? ""
        const deadline    = formData.get("deadline")?.toString().trim() ?? ""
        const status      = formData.get("status")?.toString().trim() ?? ""

        const validationError = validateCampaignFields({
            title, description, category, goalAmount, deadline, isCreate: false,
        })
        if (validationError) return { error: validationError }

        if (coverImage) {
            try {
                const url = new URL(coverImage)
                if (!["http:", "https:"].includes(url.protocol)) {
                    return { error: "Cover image must be an HTTP or HTTPS URL" }
                }
            } catch {
                return { error: "Cover image must be a valid URL" }
            }
        }

        const ALLOWED_STATUSES = ["draft", "active", "expired"]
        const newStatus = ALLOWED_STATUSES.includes(status) ? status : campaign.status

        // Build update — never touch raisedAmount, supporterCount, creator, slug
        const updates = {
            title,
            description,
            category,
            coverImage,
            goalAmount: Number(goalAmount),
            deadline:   new Date(deadline),
            status:     newStatus,
        }

        await Campaign.findByIdAndUpdate(id, updates, { runValidators: true })
        return { success: true }
    } catch (err) {
        console.error("updateCampaign error:", err)
        return { error: "Failed to update campaign. Please try again." }
    }
}

// ---------------------------------------------------------------------------
// deleteCampaign
// Does NOT touch Payment records — payments belong to Razorpay orders and
// must remain intact for financial record-keeping.
// ---------------------------------------------------------------------------
export async function deleteCampaign(id) {
    const { sessionUser, error } = await getSessionUser()
    if (error) return { error }

    if (!id || typeof id !== "string" || id.length !== 24) {
        return { error: "Invalid campaign ID" }
    }

    try {
        const campaign = await Campaign.findById(id)
        if (!campaign) return { error: "Campaign not found" }

        if (campaign.creator.toString() !== sessionUser._id.toString()) {
            return { error: "Unauthorised — you do not own this campaign" }
        }

        await Campaign.findByIdAndDelete(id)
        return { success: true }
    } catch (err) {
        console.error("deleteCampaign error:", err)
        return { error: "Failed to delete campaign. Please try again." }
    }
}

// ---------------------------------------------------------------------------
// getPublicCampaigns — public listing for the discovery/browse page
//
// No authentication required.
// Only returns campaigns with status "active" or "completed" (never "draft").
// Accepts optional search (title substring) and category filter.
// ---------------------------------------------------------------------------
export async function getPublicCampaigns({ search = "", category = "", page = 1, limit = 12 } = {}) {
    await connectDb()

    // ── Sanitise inputs ──────────────────────────────────────────────────
    const safePage  = Math.max(1, Number.isInteger(Number(page))  ? Number(page)  : 1)
    const safeLimit = Math.min(48, Math.max(1, Number.isInteger(Number(limit)) ? Number(limit) : 12))
    const safeSearch   = typeof search   === "string" ? search.trim().slice(0, 100)   : ""
    const safeCategory = typeof category === "string" ? category.trim().slice(0, 50)  : ""

    const VALID_CATEGORIES = [
        "Technology", "Education", "Health", "Environment",
        "Arts & Culture", "Community", "Business", "Other",
    ]

    // ── Build query ──────────────────────────────────────────────────────
    // Show active and completed campaigns — never drafts or internally-expired
    const query = { status: { $in: ["active", "completed"] } }

    if (safeCategory && VALID_CATEGORIES.includes(safeCategory)) {
        query.category = safeCategory
    }

    if (safeSearch) {
        // Case-insensitive substring match on title.
        // Regex is built from the sanitised string — no user-controlled regex injection
        // because safeSearch has already been length-capped and trimmed.
        query.title = { $regex: safeSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" }
    }

    try {
        const skip  = (safePage - 1) * safeLimit
        const total = await Campaign.countDocuments(query)

        const campaigns = await Campaign.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(safeLimit)
            // Populate only the safe public fields of the creator
            .populate({ path: "creator", select: "username name profilepic" })
            .lean()

        const now = new Date()
        const serialised = campaigns.map((c) => ({
            _id:           c._id.toString(),
            title:         c.title,
            slug:          c.slug,
            description:   c.description,
            category:      c.category,
            coverImage:    c.coverImage,
            goalAmount:    c.goalAmount,
            raisedAmount:  c.raisedAmount,
            supporterCount: c.supporterCount,
            deadline:      c.deadline.toISOString(),
            createdAt:     c.createdAt.toISOString(),
            status:        c.status,
            // Display status: active campaigns past their deadline appear as expired
            displayStatus: c.status === "active" && c.deadline < now ? "expired" : c.status,
            creator: c.creator
                ? {
                    _id:        c.creator._id.toString(),
                    username:   c.creator.username,
                    name:       c.creator.name ?? c.creator.username,
                    profilepic: c.creator.profilepic ?? "",
                  }
                : null,
        }))

        return {
            success:  true,
            campaigns: serialised,
            total,
            page:     safePage,
            pages:    Math.ceil(total / safeLimit),
        }
    } catch (err) {
        console.error("getPublicCampaigns error:", err)
        return { error: "Failed to load campaigns. Please try again." }
    }
}

// ---------------------------------------------------------------------------
// getCampaignBySlug — public detail view for a single campaign
//
// No authentication required.
// Only returns campaigns with status "active" or "completed".
// Drafts are never surfaced here.
// ---------------------------------------------------------------------------
export async function getCampaignBySlug(slug) {
    // Sanitise: slugs are lowercase alphanum + hyphens
    const safeSlug = typeof slug === "string"
        ? slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "").slice(0, 120)
        : ""

    if (!safeSlug) return { error: "Invalid campaign slug" }

    await connectDb()

    try {
        const campaign = await Campaign.findOne({
            slug: safeSlug,
            status: { $in: ["active", "completed"] },
        })
            .populate({ path: "creator", select: "username name profilepic coverpic" })
            .lean()

        if (!campaign) return { notFound: true }

        const now = new Date()
        return {
            success: true,
            campaign: {
                _id:           campaign._id.toString(),
                title:         campaign.title,
                slug:          campaign.slug,
                description:   campaign.description,
                category:      campaign.category,
                coverImage:    campaign.coverImage,
                goalAmount:    campaign.goalAmount,
                raisedAmount:  campaign.raisedAmount,
                supporterCount: campaign.supporterCount,
                deadline:      campaign.deadline.toISOString(),
                createdAt:     campaign.createdAt.toISOString(),
                status:        campaign.status,
                displayStatus: campaign.status === "active" && campaign.deadline < now
                    ? "expired"
                    : campaign.status,
                creator: campaign.creator
                    ? {
                        _id:        campaign.creator._id.toString(),
                        username:   campaign.creator.username,
                        name:       campaign.creator.name ?? campaign.creator.username,
                        profilepic: campaign.creator.profilepic ?? "",
                        coverpic:   campaign.creator.coverpic   ?? "",
                      }
                    : null,
            },
        }
    } catch (err) {
        console.error("getCampaignBySlug error:", err)
        return { error: "Failed to load campaign. Please try again." }
    }
}

// ---------------------------------------------------------------------------
// initiateCampaignPayment — create a Razorpay order for a specific campaign
//
// No authentication required — guests can contribute.
//
// Security:
//   - Campaign is looked up by slug (server-side) — client cannot inject a
//     different campaign ID.
//   - Amount is validated server-side — client-supplied value is not trusted.
//   - Creator identity comes from campaign.creator (ObjectId ref) → User doc,
//     never from the client.
//   - razorpaysecret never leaves the server.
//   - Only active campaigns before their deadline accept contributions.
// ---------------------------------------------------------------------------
export async function initiateCampaignPayment(slug, amountRupees, paymentform) {
    // ── 1. Validate amount server-side ───────────────────────────────────
    const MIN_INR = 10
    const MAX_INR = 100000

    const amount = Number(amountRupees)
    if (!amountRupees || isNaN(amount) || amount < MIN_INR) {
        return { error: `Minimum contribution is ₹${MIN_INR}` }
    }
    if (amount > MAX_INR) {
        return { error: `Maximum contribution is ₹${MAX_INR.toLocaleString("en-IN")}` }
    }
    if (!Number.isInteger(amount)) {
        return { error: "Amount must be a whole number" }
    }

    // ── 2. Sanitise paymentform fields ───────────────────────────────────
    const contributorName    = (paymentform?.name    ?? "").toString().trim().slice(0, 100)
    const contributorMessage = (paymentform?.message ?? "").toString().trim().slice(0, 500)

    if (!contributorName || contributorName.length < 2) {
        return { error: "Please enter your name (at least 2 characters)" }
    }

    // ── 3. Look up the campaign ──────────────────────────────────────────
    const safeSlug = typeof slug === "string"
        ? slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "").slice(0, 120)
        : ""
    if (!safeSlug) return { error: "Invalid campaign" }

    await connectDb()

    const campaign = await Campaign.findOne({ slug: safeSlug })
        .populate({ path: "creator", select: "username razorpayid razorpaysecret" })
        .lean()

    if (!campaign) return { error: "Campaign not found" }

    // ── 4. Validate campaign is open for contributions ───────────────────
    if (campaign.status === "draft") {
        return { error: "This campaign is not yet published" }
    }
    if (campaign.status === "completed") {
        return { error: "This campaign has already reached its goal" }
    }
    // Treat past-deadline active campaigns as expired for contribution purposes
    if (new Date() > new Date(campaign.deadline)) {
        return { error: "This campaign's deadline has passed" }
    }
    if (campaign.status === "expired") {
        return { error: "This campaign has expired" }
    }

    // ── 5. Validate creator has Razorpay configured ──────────────────────
    const creator = campaign.creator
    if (!creator?.razorpayid || !creator?.razorpaysecret) {
        return { error: "Payments are not configured for this campaign yet" }
    }

    // ── 6. Create Razorpay order with creator's credentials ──────────────
    const { default: Razorpay } = await import("razorpay")
    const instance = new Razorpay({
        key_id:     creator.razorpayid,
        key_secret: creator.razorpaysecret,
    })

    const amountPaise = amount * 100   // Razorpay works in paise

    let order
    try {
        order = await instance.orders.create({
            amount:   amountPaise,
            currency: "INR",
        })
    } catch (err) {
        console.error("Razorpay order creation error:", err)
        return { error: "Could not create payment order. Please try again." }
    }

    // ── 7. Write the pending Payment record ──────────────────────────────
    // import Payment here to avoid a circular reference at module-load time
    const Payment = (await import("@/models/Payment")).default

    try {
        await Payment.create({
            oid:       order.id,
            amount:    amount,             // stored in rupees
            currency:  "INR",
            to_user:   creator.username,   // preserves legacy lookup in /api/razorpay
            campaign:  campaign._id,       // campaign-specific linkage
            name:      contributorName,
            message:   contributorMessage,
            done:      false,
        })
    } catch (err) {
        console.error("Payment record creation error:", err)
        return { error: "Could not record payment. Please try again." }
    }

    // ── 8. Return only the safe public fields needed by checkout ─────────
    // razorpaysecret is NOT returned.
    return {
        success:       true,
        orderId:       order.id,
        razorpayKeyId: creator.razorpayid,
        amountPaise,
        campaignTitle: campaign.title,
        campaignSlug:  campaign.slug,
    }
}
