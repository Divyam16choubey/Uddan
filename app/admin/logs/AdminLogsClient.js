"use client"
import React, { useEffect, useState } from "react"
import Link from "next/link"
import { getModerationLogs } from "@/actions/adminactions"

const ACTION_LABELS = {
    approve_campaign:  { label: "Approved Campaign", cls: "text-green-400" },
    reject_campaign:   { label: "Rejected Campaign",  cls: "text-red-400" },
    suspend_campaign:  { label: "Suspended Campaign", cls: "text-orange-400" },
    restore_campaign:  { label: "Restored Campaign",  cls: "text-blue-400" },
    restrict_user:     { label: "Restricted User",    cls: "text-red-400" },
    restore_user:      { label: "Restored User",      cls: "text-green-400" },
}

const AdminLogsClient = () => {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [page, setPage] = useState(1)
    const [pages, setPages] = useState(0)
    const [total, setTotal] = useState(0)

    const load = async () => {
        setLoading(true)
        setError(null)
        const result = await getModerationLogs({ page, limit: 20 })
        if (result.error) {
            setError(result.error)
        } else {
            setLogs(result.logs)
            setPages(result.pages)
            setTotal(result.total)
        }
        setLoading(false)
    }

    useEffect(() => {
        ;(async () => {
            setLoading(true)
            setError(null)
            const result = await getModerationLogs({ page, limit: 20 })
            if (result.error) {
                setError(result.error)
            } else {
                setLogs(result.logs)
                setPages(result.pages)
                setTotal(result.total)
            }
            setLoading(false)
        })()
    }, [page])

    if (loading && logs.length === 0) {
        return (
            <div className="space-y-2 animate-pulse">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 h-16" />
                ))}
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
                <p className="text-red-400 text-sm">{error}</p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <p className="text-xs text-slate-500">{total} moderation action{total !== 1 ? "s" : ""}</p>

            {logs.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
                    <p className="text-slate-400 text-sm">No moderation actions recorded yet.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {logs.map((log) => {
                        const actionInfo = ACTION_LABELS[log.action] ?? { label: log.action, cls: "text-slate-400" }
                        const date = new Date(log.createdAt)

                        return (
                            <div key={log._id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                <div className="flex items-start gap-3">
                                    {/* Icon */}
                                    <div className="w-8 h-8 rounded-full bg-blue-900/40 flex items-center justify-center shrink-0 mt-0.5">
                                        <svg className="w-4 h-4 text-blue-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-sm font-medium ${actionInfo.cls}`}>
                                                {actionInfo.label}
                                            </span>
                                            <span className="text-xs text-slate-500">
                                                by {log.admin?.name ?? "Unknown"}
                                            </span>
                                        </div>

                                        <div className="text-xs text-slate-400 mt-1 space-y-0.5">
                                            {log.targetCampaign && (
                                                <p>
                                                    Campaign:{" "}
                                                    {log.targetCampaign.slug ? (
                                                        <Link href={`/campaign/${log.targetCampaign.slug}`}
                                                            className="text-slate-300 hover:text-white transition-colors">
                                                            {log.targetCampaign.title}
                                                        </Link>
                                                    ) : (
                                                        <span className="text-slate-300">{log.targetCampaign.title}</span>
                                                    )}
                                                </p>
                                            )}
                                            {log.targetUser && (
                                                <p>
                                                    User:{" "}
                                                    <Link href={`/${log.targetUser.username}`}
                                                        className="text-slate-300 hover:text-white transition-colors">
                                                        @{log.targetUser.username}
                                                    </Link>
                                                </p>
                                            )}
                                            {log.reason && (
                                                <p className="text-amber-400 italic">&ldquo;{log.reason}&rdquo;</p>
                                            )}
                                            {log.previousStatus && (
                                                <p className="text-slate-600">
                                                    {log.previousStatus} → {log.newStatus}
                                                </p>
                                            )}
                                            <p className="text-slate-600">
                                                {date.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
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

export default AdminLogsClient
