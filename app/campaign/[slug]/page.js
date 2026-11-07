import Link from "next/link"
import { notFound } from "next/navigation"
import { getCampaignBySlug } from "@/actions/campaignactions"

// Opt out of static prerender — data is dynamic per slug
export const instant = false

// ── generateMetadata ──────────────────────────────────────────────────────────
export async function generateMetadata({ params }) {
    const { slug } = await params
    const result = await getCampaignBySlug(slug)
    if (result.notFound || result.error) {
        return { title: "Campaign Not Found — Uddan" }
    }
    return {
        title: `${result.campaign.title} — Uddan`,
        description: result.campaign.description.slice(0, 155),
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcProgress(raised, goal) {
    if (!goal || goal <= 0) return 0
    return Math.min(100, Math.round((raised / goal) * 100))
}

function formatDate(iso) {
    return new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric", month: "long", year: "numeric",
    })
}

function daysLeft(deadlineIso) {
    const diff = new Date(deadlineIso) - new Date()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
    const map = {
        active:    "bg-green-500/20 text-green-400 border-green-500/30",
        expired:   "bg-orange-500/20 text-orange-400 border-orange-500/30",
        completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    }
    const cls = map[status] ?? "bg-slate-500/20 text-slate-400 border-slate-500/30"
    const label = status.charAt(0).toUpperCase() + status.slice(1)
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
            {label}
        </span>
    )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function CampaignDetailPage({ params }) {
    const { slug } = await params
    const result = await getCampaignBySlug(slug)

    if (result.notFound || result.error) {
        notFound()
    }

    const c            = result.campaign
    const progress     = calcProgress(c.raisedAmount, c.goalAmount)
    const remaining    = daysLeft(c.deadline)
    const isExpired    = c.displayStatus === "expired"
    const isCompleted  = c.displayStatus === "completed"
    const canSupport   = !isExpired && !isCompleted
    const creatorName  = c.creator?.name || c.creator?.username || "Unknown"
    const creatorSlug  = c.creator?.username || ""

    return (
        <div className="container mx-auto px-4 md:px-6 py-10 max-w-4xl">

            {/* ── Breadcrumb ───────────────────────────────────────────── */}
            <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6" aria-label="Breadcrumb">
                <Link href="/campaigns" className="hover:text-slate-300 transition-colors">
                    Explore
                </Link>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-slate-400 truncate max-w-xs">{c.title}</span>
            </nav>

            <div className="flex flex-col lg:flex-row gap-8">

                {/* ── Left: main content ───────────────────────────────── */}
                <div className="flex-1 min-w-0 space-y-6">

                    {/* Cover image */}
                    <div className="w-full h-56 md:h-80 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-950 to-slate-900">
                        {c.coverImage ? (
                            <img
                                src={c.coverImage}
                                alt={c.title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <svg className="w-16 h-16 text-blue-400/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* Title + meta */}
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span className="bg-blue-900/60 text-blue-300 text-xs font-medium px-2.5 py-1 rounded-full">
                                {c.category}
                            </span>
                            <StatusBadge status={c.displayStatus} />
                        </div>

                        <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight mb-3">
                            {c.title}
                        </h1>

                        {/* Creator attribution */}
                        <div className="flex items-center gap-2.5 text-sm text-slate-400">
                            <div className="w-7 h-7 rounded-full bg-blue-800 overflow-hidden shrink-0">
                                {c.creator?.profilepic ? (
                                    <img
                                        src={c.creator.profilepic}
                                        alt={creatorName}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="flex items-center justify-center w-full h-full text-xs font-bold text-blue-200">
                                        {creatorName.charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <span>
                                by{" "}
                                {creatorSlug ? (
                                    <Link href={`/${creatorSlug}`}
                                        className="text-slate-200 hover:text-white font-medium transition-colors">
                                        {creatorName}
                                    </Link>
                                ) : (
                                    <span className="text-slate-200 font-medium">{creatorName}</span>
                                )}
                            </span>
                            <span className="text-slate-600">·</span>
                            <span>Started {formatDate(c.createdAt)}</span>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                            About this campaign
                        </h2>
                        <p className="text-slate-200 text-sm md:text-base leading-relaxed whitespace-pre-line">
                            {c.description}
                        </p>
                    </div>

                </div>

                {/* ── Right: funding sidebar ────────────────────────────── */}
                <div className="lg:w-80 shrink-0 space-y-4">

                    {/* Funding card */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">

                        {/* Raised amount */}
                        <div>
                            <p className="text-2xl md:text-3xl font-extrabold text-white">
                                ₹{c.raisedAmount.toLocaleString("en-IN")}
                            </p>
                            <p className="text-slate-400 text-sm mt-0.5">
                                raised of{" "}
                                <span className="text-slate-200 font-medium">
                                    ₹{c.goalAmount.toLocaleString("en-IN")}
                                </span>{" "}
                                goal
                            </p>
                        </div>

                        {/* Progress bar */}
                        <div>
                            <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${progress >= 100 ? "bg-green-500" : "bg-blue-500"}`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-xs text-slate-400 mt-1.5">{progress}% funded</p>
                        </div>

                        {/* Stats row */}
                        <div className="grid grid-cols-2 gap-3 pt-1">
                            <div className="bg-white/5 rounded-xl p-3 text-center">
                                <p className="text-lg font-bold text-white">{c.supporterCount}</p>
                                <p className="text-xs text-slate-400">
                                    supporter{c.supporterCount !== 1 ? "s" : ""}
                                </p>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3 text-center">
                                <p className={`text-lg font-bold ${isExpired ? "text-orange-400" : "text-white"}`}>
                                    {isExpired ? "Ended" : `${remaining}`}
                                </p>
                                <p className="text-xs text-slate-400">
                                    {isExpired ? formatDate(c.deadline) : remaining === 1 ? "day left" : "days left"}
                                </p>
                            </div>
                        </div>

                        {/* Deadline */}
                        <p className="text-xs text-slate-500 text-center">
                            Deadline: {formatDate(c.deadline)}
                        </p>

                        {/* CTA */}
                        {canSupport && creatorSlug ? (
                            <Link href={`/${creatorSlug}`}>
                                <button className="w-full py-3 text-sm font-semibold text-white bg-gradient-to-br from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 transition-all rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400">
                                    Support This Campaign
                                </button>
                            </Link>
                        ) : (
                            <div className="w-full py-3 text-sm font-medium text-slate-500 bg-white/5 rounded-lg text-center cursor-not-allowed border border-white/10">
                                {isCompleted ? "Campaign completed" : "Campaign has ended"}
                            </div>
                        )}

                        {canSupport && !creatorSlug && (
                            <p className="text-xs text-slate-500 text-center">
                                Contributions not available right now.
                            </p>
                        )}
                    </div>

                    {/* Creator card */}
                    {c.creator && (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                                Campaign Creator
                            </h3>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-800 overflow-hidden shrink-0">
                                    {c.creator.profilepic ? (
                                        <img
                                            src={c.creator.profilepic}
                                            alt={creatorName}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="flex items-center justify-center w-full h-full text-sm font-bold text-blue-200">
                                            {creatorName.charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold text-white text-sm truncate">{creatorName}</p>
                                    {creatorSlug && (
                                        <p className="text-xs text-slate-400 truncate">@{creatorSlug}</p>
                                    )}
                                </div>
                            </div>
                            {creatorSlug && (
                                <Link
                                    href={`/${creatorSlug}`}
                                    className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 text-xs font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                                >
                                    View Profile
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </Link>
                            )}
                        </div>
                    )}

                    {/* Back link */}
                    <Link
                        href="/campaigns"
                        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to all campaigns
                    </Link>
                </div>
            </div>
        </div>
    )
}
