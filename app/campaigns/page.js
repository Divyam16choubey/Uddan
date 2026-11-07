import Link from "next/link"
import { getPublicCampaigns } from "@/actions/campaignactions"
import CampaignsClient from "./CampaignsClient"

export const instant = false   // opt out of blocking prerender (Next.js 16 cacheComponents)

export const metadata = {
    title: "Explore Campaigns — Uddan",
    description: "Discover crowdfunding campaigns from creators building something meaningful.",
}

const CATEGORIES = [
    "Technology",
    "Education",
    "Health",
    "Environment",
    "Arts & Culture",
    "Community",
    "Business",
    "Other",
]

// ── Shared helpers ────────────────────────────────────────────────────────────

function calcProgress(raised, goal) {
    if (!goal || goal <= 0) return 0
    return Math.min(100, Math.round((raised / goal) * 100))
}

function formatDeadline(iso) {
    return new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    })
}

// ── Status badge (server-rendered, no state needed) ───────────────────────────
function StatusBadge({ status }) {
    const map = {
        active:    "bg-green-500/20 text-green-400 border-green-500/30",
        expired:   "bg-orange-500/20 text-orange-400 border-orange-500/30",
        completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        draft:     "bg-slate-500/20 text-slate-400 border-slate-500/30",
    }
    const cls = map[status] ?? map.draft
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    )
}

// ── Single discovery card ─────────────────────────────────────────────────────
function CampaignDiscoveryCard({ campaign }) {
    const progress    = calcProgress(campaign.raisedAmount, campaign.goalAmount)
    const isExpired   = campaign.displayStatus === "expired"
    const deadline    = formatDeadline(campaign.deadline)
    const creatorName = campaign.creator?.name || campaign.creator?.username || "Unknown"
    const creatorSlug = campaign.creator?.username || ""
    const descPreview = campaign.description.length > 120
        ? campaign.description.slice(0, 117) + "…"
        : campaign.description

    return (
        <div className="flex flex-col bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/[0.07] hover:border-white/20 transition-all group">
            {/* Cover image */}
            <div className="relative h-44 bg-gradient-to-br from-blue-950 to-slate-900 overflow-hidden shrink-0">
                {campaign.coverImage ? (
                    <img
                        src={campaign.coverImage}
                        alt={campaign.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError="this.style.display='none'"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-blue-400/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                )}
                {/* Category pill overlay */}
                <div className="absolute top-3 left-3">
                    <span className="bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full">
                        {campaign.category}
                    </span>
                </div>
                {/* Status badge overlay */}
                <div className="absolute top-3 right-3">
                    <StatusBadge status={campaign.displayStatus} />
                </div>
            </div>

            {/* Card body */}
            <div className="flex flex-col flex-1 p-5 gap-3">
                {/* Title */}
                <h2 className="font-bold text-white text-base leading-snug line-clamp-2 group-hover:text-blue-300 transition-colors">
                    {campaign.title}
                </h2>

                {/* Description preview */}
                <p className="text-slate-400 text-sm leading-relaxed line-clamp-3 flex-1">
                    {descPreview}
                </p>

                {/* Creator */}
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-800 overflow-hidden shrink-0">
                        {campaign.creator?.profilepic ? (
                            <img
                                src={campaign.creator.profilepic}
                                alt={creatorName}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="flex items-center justify-center w-full h-full text-[10px] font-bold text-blue-200">
                                {creatorName.charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>
                    <span className="text-xs text-slate-400">
                        by{" "}
                        {creatorSlug ? (
                            <Link href={`/${creatorSlug}`} className="text-slate-300 hover:text-white transition-colors">
                                {creatorName}
                            </Link>
                        ) : (
                            <span className="text-slate-300">{creatorName}</span>
                        )}
                    </span>
                </div>

                {/* Progress bar */}
                <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                        <span className="font-medium text-white">
                            ₹{campaign.raisedAmount.toLocaleString("en-IN")}
                        </span>
                        <span>of ₹{campaign.goalAmount.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full ${progress >= 100 ? "bg-green-500" : "bg-blue-500"}`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>{progress}% · {campaign.supporterCount} supporter{campaign.supporterCount !== 1 ? "s" : ""}</span>
                        <span className={isExpired ? "text-orange-400" : ""}>
                            {isExpired ? "Ended " : "Ends "}{deadline}
                        </span>
                    </div>
                </div>

                {/* CTA */}
                <Link
                    href={`/campaign/${campaign.slug}`}
                    className="mt-1 flex items-center justify-center gap-1.5 w-full py-2.5 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                    View Campaign
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </Link>
            </div>
        </div>
    )
}

// ── Page (server component) ───────────────────────────────────────────────────
export default async function CampaignsPage({ searchParams }) {
    // searchParams is a Promise in Next.js 15/16
    const params   = await searchParams
    const search   = typeof params?.search   === "string" ? params.search   : ""
    const category = typeof params?.category === "string" ? params.category : ""
    const page     = Number(params?.page) > 0 ? Number(params.page) : 1

    const result = await getPublicCampaigns({ search, category, page, limit: 12 })

    const campaigns = result.campaigns ?? []
    const total     = result.total     ?? 0
    const totalPages = result.pages    ?? 1
    const hasError  = !!result.error

    return (
        <div className="container mx-auto px-4 md:px-6 py-10 max-w-7xl">
            {/* ── Page header ──────────────────────────────────────────── */}
            <div className="mb-8 text-center">
                <h1 className="text-2xl md:text-4xl font-extrabold text-white mb-2">
                    Explore Campaigns
                </h1>
                <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">
                    Discover people building something meaningful. Support ideas that inspire you.
                </p>
            </div>

            {/* ── Search + filter controls (client island) ─────────────── */}
            <CampaignsClient
                initialSearch={search}
                initialCategory={category}
                categories={CATEGORIES}
            />

            {/* ── Error state ──────────────────────────────────────────── */}
            {hasError && (
                <div className="mt-8 text-center py-16 bg-white/5 border border-white/10 rounded-2xl">
                    <p className="text-red-400 text-sm mb-4">{result.error}</p>
                    <Link href="/campaigns" className="text-sm text-slate-400 hover:text-white transition-colors underline">
                        Try again
                    </Link>
                </div>
            )}

            {/* ── Results header ───────────────────────────────────────── */}
            {!hasError && (
                <>
                    <p className="text-xs text-slate-500 mb-4 mt-6">
                        {total === 0
                            ? "No campaigns found"
                            : `Showing ${campaigns.length} of ${total} campaign${total !== 1 ? "s" : ""}${search ? ` for "${search}"` : ""}${category ? ` in ${category}` : ""}`
                        }
                    </p>

                    {/* ── Empty state ───────────────────────────────────── */}
                    {campaigns.length === 0 && (
                        <div className="text-center py-20 bg-white/5 border border-white/10 rounded-2xl">
                            <div className="w-14 h-14 rounded-full bg-blue-900/40 flex items-center justify-center mx-auto mb-4">
                                <svg className="w-7 h-7 text-blue-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <p className="text-white font-semibold mb-1">No campaigns found</p>
                            <p className="text-slate-400 text-sm mb-5">
                                {search || category
                                    ? "Try adjusting your search or removing the category filter."
                                    : "No active campaigns yet. Be the first to create one!"}
                            </p>
                            {(search || category) ? (
                                <Link
                                    href="/campaigns"
                                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                                >
                                    Clear filters
                                </Link>
                            ) : (
                                <Link
                                    href="/campaign/create"
                                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                                >
                                    Start a Campaign
                                </Link>
                            )}
                        </div>
                    )}

                    {/* ── Campaign grid ─────────────────────────────────── */}
                    {campaigns.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {campaigns.map((c) => (
                                <CampaignDiscoveryCard key={c._id} campaign={c} />
                            ))}
                        </div>
                    )}

                    {/* ── Pagination ────────────────────────────────────── */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-10">
                            {page > 1 && (
                                <Link
                                    href={`/campaigns?${new URLSearchParams({ search, category, page: page - 1 }).toString()}`}
                                    className="px-4 py-2 text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                                >
                                    ← Previous
                                </Link>
                            )}
                            <span className="text-xs text-slate-400 px-3">
                                Page {page} of {totalPages}
                            </span>
                            {page < totalPages && (
                                <Link
                                    href={`/campaigns?${new URLSearchParams({ search, category, page: page + 1 }).toString()}`}
                                    className="px-4 py-2 text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                                >
                                    Next →
                                </Link>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
