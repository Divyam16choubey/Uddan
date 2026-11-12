"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import connectDb from "@/db/connectDb"
import User from "@/models/User"
import Campaign from "@/models/Campaign"
import ModerationLog from "@/models/ModerationLog"

// ── Admin auth helper ──────────────────────────────────────────────────────
// Re-reads role from DB every call — never trusts the session's cached role.
// This prevents stale-role attacks after demotion.
async function getAdminSession() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return { error: "Unauthorised — please sign in" }
    }
    await connectDb()
    const adminUser = await User.findOne({ email: session.user.email }).lean()
    if (!adminUser) {
        return { error: "User account not found" }
    }
    if (adminUser.role !== "admin") {
        return { error: "Forbidden — admin access required" }
    }
    if (adminUser.isRestricted) {
        return { error: "Your admin account is restricted" }
    }
    return { adminUser }
}

// ── Helper: validate MongoDB ObjectId string ──────────────────────────────
function isValidId(id) {
    return typeof id === "string" && id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id)
}

// ---------------------------------------------------------------------------
// getAdminStats — platform overview for the admin dashboard
// ---------------------------------------------------------------------------
export async function getAdminStats() {
    const { adminUser, error } = await getAdminSession()
    if (error) return { error }

    try {
        const now = new Date()

        const [
            totalUsers,
            totalCampaigns,
            pendingCampaigns,
            suspendedCampaigns,
            rejectedCampaigns,
            completedCampaigns,
            activeApproved,
            expiredCampaigns,
        ] = await Promise.all([
            User.countDocuments({}),
            Campaign.countDocuments({}),
            Campaign.countDocuments({ moderationStatus: "pending" }),
            Campaign.countDocuments({ moderationStatus: "suspended" }),
            Campaign.countDocuments({ moderationStatus: "rejected" }),
            Campaign.countDocuments({ status: "completed" }),
            Campaign.countDocuments({ status: "active", moderationStatus: "approved" }),
            Campaign.countDocuments({
                status: "active",
                moderationStatus: "approved",
                deadline: { $lt: now },
            }),
        ])

        // Total successful campaign-specific contributions
        const Payment = (await import("@/models/Payment")).default
        const totalContributions = await Payment.countDocuments({
            done: true,
            campaign: { $ne: null },
        })

        // Total raised from campaign-specific payments
        const raisedAgg = await Payment.aggregate([
            { $match: { done: true, campaign: { $ne: null } } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ])
        const totalRaised = raisedAgg[0]?.total ?? 0

        return {
            success: true,
            stats: {
                totalUsers,
                totalCampaigns,
                pendingCampaigns,
                suspendedCampaigns,
                rejectedCampaigns,
                completedCampaigns,
                activeApproved,
                expiredCampaigns,
                totalContributions,
                totalRaised,
            },
        }
    } catch (err) {
        console.error("getAdminStats error:", err)
        return { error: "Failed to load stats" }
    }
}

// ---------------------------------------------------------------------------
// getAdminCampaigns — paginated, filterable campaign list for admin review
// ---------------------------------------------------------------------------
export async function getAdminCampaigns({ moderationStatus = "", status = "", page = 1, limit = 20 } = {}) {
    const { adminUser, error } = await getAdminSession()
    if (error) return { error }

    const safePage  = Math.max(1, Number.isInteger(Number(page))  ? Number(page)  : 1)
    const safeLimit = Math.min(50, Math.max(1, Number.isInteger(Number(limit)) ? Number(limit) : 20))

    const query = {}

    const VALID_MOD = ["pending", "approved", "rejected", "suspended"]
    if (moderationStatus && VALID_MOD.includes(moderationStatus)) {
        query.moderationStatus = moderationStatus
    }

    const VALID_STATUS = ["draft", "active", "expired", "completed"]
    if (status && VALID_STATUS.includes(status)) {
        query.status = status
    }

    try {
        const skip  = (safePage - 1) * safeLimit
        const total = await Campaign.countDocuments(query)

        const campaigns = await Campaign.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(safeLimit)
            .populate({ path: "creator", select: "username name" })
            .lean()

        const now = new Date()
        const serialised = campaigns.map((c) => ({
            _id:              c._id.toString(),
            title:            c.title,
            slug:             c.slug,
            category:         c.category,
            coverImage:       c.coverImage,
            goalAmount:       c.goalAmount,
            raisedAmount:     c.raisedAmount,
            supporterCount:   c.supporterCount,
            status:           c.status,
            moderationStatus: c.moderationStatus ?? "approved",
            moderationNote:   c.moderationNote ?? "",
            deadline:         c.deadline.toISOString(),
            createdAt:        c.createdAt.toISOString(),
            displayStatus:    c.status === "active" && c.deadline < now ? "expired" : c.status,
            creator: c.creator
                ? {
                    _id:      c.creator._id.toString(),
                    username: c.creator.username,
                    name:     c.creator.name ?? c.creator.username,
                  }
                : null,
        }))

        return {
            success: true,
            campaigns: serialised,
            total,
            page: safePage,
            pages: Math.ceil(total / safeLimit),
        }
    } catch (err) {
        console.error("getAdminCampaigns error:", err)
        return { error: "Failed to load campaigns" }
    }
}

// ---------------------------------------------------------------------------
// moderateCampaign — approve / reject / suspend / restore a campaign
//
// Actions:
//   approve  → moderationStatus = "approved"
//   reject   → moderationStatus = "rejected"   (reason required)
//   suspend  → moderationStatus = "suspended"  (reason required)
//   restore  → moderationStatus = "approved"   (from suspended/rejected)
//
// Every action creates a ModerationLog entry.
// ---------------------------------------------------------------------------
export async function moderateCampaign(campaignId, action, reason = "") {
    const { adminUser, error } = await getAdminSession()
    if (error) return { error }

    if (!isValidId(campaignId)) {
        return { error: "Invalid campaign ID" }
    }

    const VALID_ACTIONS = ["approve", "reject", "suspend", "restore"]
    if (!VALID_ACTIONS.includes(action)) {
        return { error: "Invalid moderation action" }
    }

    // Reject and suspend require a reason
    const trimmedReason = typeof reason === "string" ? reason.trim().slice(0, 500) : ""
    if ((action === "reject" || action === "suspend") && !trimmedReason) {
        return { error: `A reason is required to ${action} a campaign` }
    }

    const ACTION_TO_STATUS = {
        approve: "approved",
        reject:  "rejected",
        suspend: "suspended",
        restore: "approved",
    }
    const newModStatus = ACTION_TO_STATUS[action]

    try {
        const campaign = await Campaign.findById(campaignId)
        if (!campaign) return { error: "Campaign not found" }

        const previousStatus = campaign.moderationStatus ?? "approved"

        // No-op if same status (except restore which always sets approved)
        if (action !== "restore" && previousStatus === newModStatus) {
            return { error: `Campaign is already ${newModStatus}` }
        }

        // Update only the moderation fields — never touch lifecycle status
        // (status, raisedAmount, supporterCount, slug, etc.)
        campaign.moderationStatus = newModStatus
        campaign.moderationNote   = trimmedReason
        campaign.moderatedBy      = adminUser._id
        campaign.moderatedAt      = new Date()
        await campaign.save()

        // ── Audit log ─────────────────────────────────────────────────────
        // Written after the campaign save so a log failure cannot hide a
        // successful moderation decision from the admin.
        const ACTION_MAP = {
            approve: "approve_campaign",
            reject:  "reject_campaign",
            suspend: "suspend_campaign",
            restore: "restore_campaign",
        }

        try {
            await ModerationLog.create({
                admin:          adminUser._id,
                targetCampaign: campaign._id,
                action:         ACTION_MAP[action],
                reason:         trimmedReason,
                previousStatus,
                newStatus:      newModStatus,
            })
        } catch (logErr) {
            // The moderation succeeded — log the failure but do NOT surface
            // it as an error to the caller. The admin dashboard shows the
            // updated moderationStatus, so the action is confirmed.
            console.error("moderateCampaign: audit log failed for campaign",
                campaignId, action, logErr?.message)
        }

        return { success: true, moderationStatus: newModStatus }
    } catch (err) {
        console.error("moderateCampaign error:", err)
        return { error: "Failed to moderate campaign" }
    }
}

// ---------------------------------------------------------------------------
// getAdminUsers — paginated, searchable user list
// ---------------------------------------------------------------------------
export async function getAdminUsers({ search = "", page = 1, limit = 20 } = {}) {
    const { adminUser, error } = await getAdminSession()
    if (error) return { error }

    const safePage  = Math.max(1, Number.isInteger(Number(page))  ? Number(page)  : 1)
    const safeLimit = Math.min(50, Math.max(1, Number.isInteger(Number(limit)) ? Number(limit) : 20))
    const safeSearch = typeof search === "string" ? search.trim().slice(0, 100) : ""

    const query = {}
    if (safeSearch) {
        const escaped = safeSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        query.$or = [
            { username: { $regex: escaped, $options: "i" } },
            { name:     { $regex: escaped, $options: "i" } },
        ]
    }

    try {
        const skip  = (safePage - 1) * safeLimit
        const total = await User.countDocuments(query)

        const users = await User.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(safeLimit)
            // Never return razorpayid, razorpaysecret
            .select("email name username profilepic role isRestricted createdAt")
            .lean()

        const serialised = users.map((u) => ({
            _id:          u._id.toString(),
            email:        u.email,
            name:         u.name ?? u.username,
            username:     u.username,
            profilepic:   u.profilepic ?? "",
            role:         u.role ?? "user",
            isRestricted: u.isRestricted ?? false,
            createdAt:    u.createdAt.toISOString(),
        }))

        return {
            success: true,
            users: serialised,
            total,
            page: safePage,
            pages: Math.ceil(total / safeLimit),
        }
    } catch (err) {
        console.error("getAdminUsers error:", err)
        return { error: "Failed to load users" }
    }
}

// ---------------------------------------------------------------------------
// restrictUser — set isRestricted = true
//
// Safety:
//   - Cannot restrict another admin
//   - Cannot restrict yourself
// ---------------------------------------------------------------------------
export async function restrictUser(userId) {
    const { adminUser, error } = await getAdminSession()
    if (error) return { error }

    if (!isValidId(userId)) {
        return { error: "Invalid user ID" }
    }

    // Prevent self-restriction
    if (userId === adminUser._id.toString()) {
        return { error: "You cannot restrict your own account" }
    }

    try {
        const target = await User.findById(userId)
        if (!target) return { error: "User not found" }

        // Cannot restrict admins
        if (target.role === "admin") {
            return { error: "Cannot restrict an admin account" }
        }

        if (target.isRestricted) {
            return { error: "User is already restricted" }
        }

        target.isRestricted = true
        await target.save()

        // Audit log — failure here must not undo the restriction
        try {
            await ModerationLog.create({
                admin:      adminUser._id,
                targetUser: target._id,
                action:     "restrict_user",
                reason:     "Restricted by admin",
                previousStatus: "active",
                newStatus:     "restricted",
            })
        } catch (logErr) {
            console.error("restrictUser: audit log failed for user",
                userId, logErr?.message)
        }

        return { success: true }
    } catch (err) {
        console.error("restrictUser error:", err)
        return { error: "Failed to restrict user" }
    }
}

// ---------------------------------------------------------------------------
// restoreUser — set isRestricted = false
// ---------------------------------------------------------------------------
export async function restoreUser(userId) {
    const { adminUser, error } = await getAdminSession()
    if (error) return { error }

    if (!isValidId(userId)) {
        return { error: "Invalid user ID" }
    }

    try {
        const target = await User.findById(userId)
        if (!target) return { error: "User not found" }

        if (!target.isRestricted) {
            return { error: "User is not restricted" }
        }

        target.isRestricted = false
        await target.save()

        // Audit log — failure here must not undo the restore
        try {
            await ModerationLog.create({
                admin:      adminUser._id,
                targetUser: target._id,
                action:     "restore_user",
                reason:     "Restored by admin",
                previousStatus: "restricted",
                newStatus:     "active",
            })
        } catch (logErr) {
            console.error("restoreUser: audit log failed for user",
                userId, logErr?.message)
        }

        return { success: true }
    } catch (err) {
        console.error("restoreUser error:", err)
        return { error: "Failed to restore user" }
    }
}

// ---------------------------------------------------------------------------
// getModerationLogs — paginated audit history
// ---------------------------------------------------------------------------
export async function getModerationLogs({ page = 1, limit = 20 } = {}) {
    const { adminUser, error } = await getAdminSession()
    if (error) return { error }

    const safePage  = Math.max(1, Number.isInteger(Number(page))  ? Number(page)  : 1)
    const safeLimit = Math.min(50, Math.max(1, Number.isInteger(Number(limit)) ? Number(limit) : 20))

    try {
        const skip  = (safePage - 1) * safeLimit
        const total = await ModerationLog.countDocuments({})

        const logs = await ModerationLog.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(safeLimit)
            .populate({ path: "admin", select: "username name" })
            .populate({ path: "targetCampaign", select: "title slug" })
            .populate({ path: "targetUser", select: "username name" })
            .lean()

        const serialised = logs.map((l) => ({
            _id:           l._id.toString(),
            action:        l.action,
            reason:        l.reason ?? "",
            previousStatus: l.previousStatus ?? "",
            newStatus:     l.newStatus ?? "",
            createdAt:     l.createdAt.toISOString(),
            admin: l.admin
                ? { _id: l.admin._id.toString(), username: l.admin.username, name: l.admin.name ?? l.admin.username }
                : null,
            targetCampaign: l.targetCampaign
                ? { _id: l.targetCampaign._id.toString(), title: l.targetCampaign.title, slug: l.targetCampaign.slug }
                : null,
            targetUser: l.targetUser
                ? { _id: l.targetUser._id.toString(), username: l.targetUser.username, name: l.targetUser.name ?? l.targetUser.username }
                : null,
        }))

        return {
            success: true,
            logs: serialised,
            total,
            page: safePage,
            pages: Math.ceil(total / safeLimit),
        }
    } catch (err) {
        console.error("getModerationLogs error:", err)
        return { error: "Failed to load moderation logs" }
    }
}
