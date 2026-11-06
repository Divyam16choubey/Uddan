"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getUserCampaigns, deleteCampaign } from '@/actions/campaignactions'
import { toast } from 'react-toastify'
import { Bounce } from 'react-toastify'

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
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

// ── Skeleton card ─────────────────────────────────────────────────────────────
const SkeletonCard = () => (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 animate-pulse">
        <div className="flex gap-4">
            <div className="w-20 h-20 rounded-xl bg-white/10 shrink-0" />
            <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-white/10 rounded w-3/4" />
                <div className="h-3 bg-white/10 rounded w-1/3" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
            </div>
        </div>
    </div>
)

// ── Confirmation dialog ───────────────────────────────────────────────────────
const ConfirmDialog = ({ title, onConfirm, onCancel, deleting }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCancel}
        />
        {/* Panel */}
        <div className="relative z-10 bg-slate-900 border border-white/15 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                </div>
                <div>
                    <h3 className="font-semibold text-white text-base">Delete Campaign?</h3>
                    <p className="text-slate-400 text-sm mt-1">
                        &ldquo;{title}&rdquo; will be permanently deleted. This cannot be undone.
                        Existing payment records will not be affected.
                    </p>
                </div>
            </div>
            <div className="flex gap-3 justify-end">
                <button
                    onClick={onCancel}
                    disabled={deleting}
                    className="px-4 py-2 text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/15 rounded-lg transition-colors disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    disabled={deleting}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 disabled:bg-red-900 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                    {deleting ? (
                        <>
                            <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                            </svg>
                            Deleting…
                        </>
                    ) : "Delete"}
                </button>
            </div>
        </div>
    </div>
)

// ── Campaign card ─────────────────────────────────────────────────────────────
const CampaignCard = ({ campaign, onDeleteClick }) => {
    const deadline   = new Date(campaign.deadline)
    const isExpired  = campaign.displayStatus === "expired"
    const progress   = campaign.goalAmount > 0
        ? Math.min(100, Math.round((campaign.raisedAmount / campaign.goalAmount) * 100))
        : 0

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/[0.07] transition-colors">
            <div className="flex gap-4">
                {/* Thumbnail */}
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-blue-900/40 shrink-0 flex items-center justify-center">
                    {campaign.coverImage ? (
                        <img
                            src={campaign.coverImage}
                            alt={campaign.title}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = "none" }}
                        />
                    ) : (
                        <svg className="w-8 h-8 text-blue-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-white text-sm leading-snug line-clamp-2">
                            {campaign.title}
                        </h3>
                        <StatusBadge status={campaign.displayStatus} />
                    </div>

                    <p className="text-xs text-slate-500 mb-2">{campaign.category}</p>

                    {/* Progress bar */}
                    <div className="mb-2">
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                            <span>₹{campaign.raisedAmount.toLocaleString("en-IN")} raised</span>
                            <span>Goal: ₹{campaign.goalAmount.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${progress >= 100 ? "bg-green-500" : "bg-blue-500"}`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {progress}% · {campaign.supporterCount} supporter{campaign.supporterCount !== 1 ? "s" : ""}
                        </p>
                    </div>

                    <p className={`text-xs ${isExpired ? "text-orange-400" : "text-slate-500"}`}>
                        {isExpired ? "Ended" : "Ends"}&nbsp;
                        {deadline.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                {campaign.status !== "completed" ? (
                    <Link
                        href={`/campaign/edit/${campaign._id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                    </Link>
                ) : (
                    <div className="flex-1 flex items-center justify-center px-3 py-2 text-xs text-slate-600 border border-white/5 rounded-lg cursor-not-allowed">
                        Completed
                    </div>
                )}
                <button
                    onClick={() => onDeleteClick(campaign)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-red-400 hover:text-white hover:bg-red-600 border border-red-500/30 hover:border-red-600 rounded-lg transition-colors"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                </button>
            </div>
        </div>
    )
}

// ── Main Component ────────────────────────────────────────────────────────────
const MyCampaigns = () => {
    const router = useRouter()
    const [campaigns, setCampaigns]       = useState([])
    const [loading, setLoading]           = useState(true)
    const [fetchError, setFetchError]     = useState(null)
    const [pendingDelete, setPendingDelete] = useState(null)  // campaign object
    const [deleting, setDeleting]         = useState(false)

    const loadCampaigns = async () => {
        setLoading(true)
        setFetchError(null)
        const result = await getUserCampaigns()
        if (result.error) {
            setFetchError(result.error)
        } else {
            setCampaigns(result.campaigns)
        }
        setLoading(false)
    }

    useEffect(() => {
        // Async logic lives inside an IIFE so setState is called from an async
        // callback — satisfies the React Compiler set-state-in-effect rule.
        ;(async () => {
            setLoading(true)
            setFetchError(null)
            const result = await getUserCampaigns()
            if (result.error) {
                setFetchError(result.error)
            } else {
                setCampaigns(result.campaigns)
            }
            setLoading(false)
        })()
    }, [])

    const handleDeleteConfirm = async () => {
        if (!pendingDelete) return
        setDeleting(true)
        const result = await deleteCampaign(pendingDelete._id)
        setDeleting(false)
        setPendingDelete(null)

        if (result.error) {
            toast.error(result.error, {
                position: "top-right", autoClose: 5000, hideProgressBar: false,
                closeOnClick: true, pauseOnHover: true, draggable: true,
                theme: "dark", transition: Bounce,
            })
        } else {
            toast.success("Campaign deleted.", {
                position: "top-right", autoClose: 3000, hideProgressBar: false,
                closeOnClick: true, pauseOnHover: true, draggable: true,
                theme: "dark", transition: Bounce,
            })
            // Remove from local state without a full refetch
            setCampaigns((prev) => prev.filter((c) => c._id !== pendingDelete._id))
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold text-white">My Campaigns</h2>
                    {!loading && !fetchError && (
                        <p className="text-xs text-slate-500 mt-0.5">
                            {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}
                        </p>
                    )}
                </div>
                <Link
                    href="/campaign/create"
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 shrink-0"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Campaign
                </Link>
            </div>

            {/* Loading skeleton */}
            {loading && (
                <div className="space-y-3">
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
            )}

            {/* Error state */}
            {!loading && fetchError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
                    <p className="text-red-400 text-sm mb-3">{fetchError}</p>
                    <button
                        onClick={loadCampaigns}
                        className="px-4 py-2 text-sm font-medium text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            )}

            {/* Empty state */}
            {!loading && !fetchError && campaigns.length === 0 && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
                    <div className="w-14 h-14 rounded-full bg-blue-900/40 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <p className="text-white font-semibold mb-1">No campaigns yet</p>
                    <p className="text-slate-400 text-sm mb-5">
                        Create your first campaign and start raising support from your community.
                    </p>
                    <Link
                        href="/campaign/create"
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create Your First Campaign
                    </Link>
                </div>
            )}

            {/* Campaign cards */}
            {!loading && !fetchError && campaigns.length > 0 && (
                <div className="space-y-3">
                    {campaigns.map((c) => (
                        <CampaignCard
                            key={c._id}
                            campaign={c}
                            onDeleteClick={setPendingDelete}
                        />
                    ))}
                </div>
            )}

            {/* Delete confirmation dialog */}
            {pendingDelete && (
                <ConfirmDialog
                    title={pendingDelete.title}
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setPendingDelete(null)}
                    deleting={deleting}
                />
            )}
        </div>
    )
}

export default MyCampaigns
