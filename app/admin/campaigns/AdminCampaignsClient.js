"use client"
import React, { useEffect, useState } from "react"
import { getAdminCampaigns, moderateCampaign } from "@/actions/adminactions"
import { toast } from "react-toastify"
import { Bounce } from "react-toastify"

const MOD_FILTERS = [
    { value: "",         label: "All" },
    { value: "pending",  label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "suspended", label: "Suspended" },
]

const MOD_BADGE = {
    pending:   "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    approved:  "bg-green-500/20 text-green-400 border-green-500/30",
    rejected:  "bg-red-500/20 text-red-400 border-red-500/30",
    suspended: "bg-orange-500/20 text-orange-400 border-orange-500/30",
}

const Badge = ({ status }) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${MOD_BADGE[status] ?? ""}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
)

const CampaignRow = ({ campaign, onAction }) => {
    const [reason, setReason] = useState("")
    const [acting, setActing] = useState(false)
    const deadline = new Date(campaign.deadline)

    const handleAction = async (action) => {
        if ((action === "reject" || action === "suspend") && !reason.trim()) {
            toast.error(`A reason is required to ${action} a campaign`, {
                position: "top-right", autoClose: 4000, theme: "dark", transition: Bounce,
            })
            return
        }
        setActing(true)
        const result = await moderateCampaign(campaign._id, action, reason)
        setActing(false)

        if (result.error) {
            toast.error(result.error, {
                position: "top-right", autoClose: 4000, theme: "dark", transition: Bounce,
            })
        } else {
            toast.success(`Campaign ${action}d`, {
                position: "top-right", autoClose: 3000, theme: "dark", transition: Bounce,
            })
            setReason("")
            onAction()
        }
    }

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/[0.07] transition-colors">
            <div className="flex gap-4">
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-blue-900/40 shrink-0 flex items-center justify-center">
                    {campaign.coverImage ? (
                        <img src={campaign.coverImage} alt={campaign.title}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = "none" }} />
                    ) : (
                        <svg className="w-6 h-6 text-blue-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1">
                        <h3 className="font-semibold text-white text-sm leading-snug">{campaign.title}</h3>
                        <Badge status={campaign.moderationStatus} />
                    </div>
                    <p className="text-xs text-slate-500 mb-2">
                        by {campaign.creator?.name ?? "Unknown"} · {campaign.category}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>₹{campaign.raisedAmount.toLocaleString("en-IN")} / ₹{campaign.goalAmount.toLocaleString("en-IN")}</span>
                        <span>·</span>
                        <span>Ends {deadline.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                    </div>
                    {campaign.moderationNote && (
                        <p className="text-xs text-amber-400 mt-1 italic">&ldquo;{campaign.moderationNote}&rdquo;</p>
                    )}
                </div>
            </div>

            {/* Reason input (for reject/suspend) */}
            <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (required for reject/suspend)…"
                maxLength={500}
                className="block w-full mt-3 px-3 py-2 text-xs text-white bg-white/5 border border-white/15 rounded-lg placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />

            {/* Action buttons */}
            <div className="flex gap-2 mt-3 flex-wrap">
                {campaign.moderationStatus !== "approved" && (
                    <button onClick={() => handleAction("approve")} disabled={acting}
                        className="px-3 py-1.5 text-xs font-medium text-green-400 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg transition-colors disabled:opacity-50">
                        ✓ Approve
                    </button>
                )}
                {campaign.moderationStatus !== "rejected" && (
                    <button onClick={() => handleAction("reject")} disabled={acting}
                        className="px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-colors disabled:opacity-50">
                        ✕ Reject
                    </button>
                )}
                {campaign.moderationStatus === "approved" && (
                    <button onClick={() => handleAction("suspend")} disabled={acting}
                        className="px-3 py-1.5 text-xs font-medium text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-lg transition-colors disabled:opacity-50">
                        ⏸ Suspend
                    </button>
                )}
                {(campaign.moderationStatus === "suspended" || campaign.moderationStatus === "rejected") && (
                    <button onClick={() => handleAction("restore")} disabled={acting}
                        className="px-3 py-1.5 text-xs font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-colors disabled:opacity-50">
                        ↺ Restore
                    </button>
                )}
            </div>
        </div>
    )
}

const AdminCampaignsClient = () => {
    const [campaigns, setCampaigns] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [modFilter, setModFilter] = useState("")
    const [page, setPage] = useState(1)
    const [pages, setPages] = useState(0)
    const [total, setTotal] = useState(0)

    const load = async () => {
        setLoading(true)
        setError(null)
        const result = await getAdminCampaigns({ moderationStatus: modFilter, page, limit: 20 })
        if (result.error) {
            setError(result.error)
        } else {
            setCampaigns(result.campaigns)
            setPages(result.pages)
            setTotal(result.total)
        }
        setLoading(false)
    }

    useEffect(() => {
        ;(async () => {
            setLoading(true)
            setError(null)
            const result = await getAdminCampaigns({ moderationStatus: modFilter, page, limit: 20 })
            if (result.error) {
                setError(result.error)
            } else {
                setCampaigns(result.campaigns)
                setPages(result.pages)
                setTotal(result.total)
            }
            setLoading(false)
        })()
    }, [modFilter, page])

    const handleFilterChange = (filter) => {
        setModFilter(filter)
        setPage(1)
    }

    if (loading) {
        return (
            <div className="space-y-3 animate-pulse">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 h-32" />
                ))}
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
                <p className="text-red-400 text-sm mb-3">{error}</p>
                <button onClick={load} className="px-4 py-2 text-sm font-medium text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                    Try Again
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Filter pills */}
            <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-slate-500 mr-1">Filter:</span>
                {MOD_FILTERS.map((f) => (
                    <button key={f.value} onClick={() => handleFilterChange(f.value)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                            modFilter === f.value
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "bg-white/5 border-white/15 text-slate-300 hover:bg-white/10"
                        }`}>
                        {f.label}
                    </button>
                ))}
            </div>

            <p className="text-xs text-slate-500">{total} campaign{total !== 1 ? "s" : ""}</p>

            {/* Empty state */}
            {campaigns.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
                    <p className="text-slate-400 text-sm">No campaigns found for this filter.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {campaigns.map((c) => (
                        <CampaignRow key={c._id} campaign={c} onAction={load} />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {pages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-6">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                        className="px-3 py-1.5 text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        ← Prev
                    </button>
                    <span className="text-xs text-slate-400">Page {page} of {pages}</span>
                    <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}
                        className="px-3 py-1.5 text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        Next →
                    </button>
                </div>
            )}
        </div>
    )
}

export default AdminCampaignsClient
