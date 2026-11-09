"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { getCreatorAnalytics } from '@/actions/campaignactions'

// ── Status badge (matches MyCampaigns styling) ──────────────────────────────
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

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sublabel, icon }) => (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/[0.07] transition-colors">
        <div className="flex items-start justify-between gap-3 mb-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</span>
            <span className="text-blue-400/60">{icon}</span>
        </div>
        <p className="text-2xl font-extrabold text-white">{value}</p>
        {sublabel && <p className="text-xs text-slate-500 mt-1">{sublabel}</p>}
    </div>
)

// ── Skeleton ──────────────────────────────────────────────────────────────────
const Skeleton = () => (
    <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 h-28" />
            ))}
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl h-40" />
        <div className="bg-white/5 border border-white/10 rounded-2xl h-64" />
    </div>
)

// ── SVG bar chart — 30 days, zero dependencies ───────────────────────────────
const DailyChart = ({ dailySeries }) => {
    const maxAmount = Math.max(1, ...dailySeries.map((d) => d.amount))
    const barWidth = 100 / dailySeries.length
    const chartH = 120

    const totalAmount = dailySeries.reduce((s, d) => s + d.amount, 0)
    const totalCount = dailySeries.reduce((s, d) => s + d.count, 0)

    if (totalAmount === 0) {
        return (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                    Last 30 Days
                </h3>
                <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-12 h-12 rounded-full bg-blue-900/30 flex items-center justify-center mb-3">
                        <svg className="w-6 h-6 text-blue-400/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <p className="text-slate-400 text-sm">No contributions in the last 30 days.</p>
                    <p className="text-slate-600 text-xs mt-1">New contributions will appear here.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                    Last 30 Days
                </h3>
                <div className="flex gap-4 text-xs">
                    <span className="text-slate-400">
                        <span className="font-bold text-white">₹{totalAmount.toLocaleString("en-IN")}</span> raised
                    </span>
                    <span className="text-slate-400">
                        <span className="font-bold text-white">{totalCount}</span> contribution{totalCount !== 1 ? "s" : ""}
                    </span>
                </div>
            </div>

            {/* Bar chart */}
            <div className="relative">
                <svg viewBox={`0 0 100 ${chartH}`} preserveAspectRatio="none"
                    className="w-full" style={{ height: `${chartH}px` }}>
                    {dailySeries.map((d, i) => {
                        const h = maxAmount > 0 ? (d.amount / maxAmount) * (chartH - 8) : 0
                        const y = chartH - h
                        return (
                            <g key={i}>
                                <title>
                                    {d.date}: ₹{d.amount.toLocaleString("en-IN")} ({d.count} contribution{d.count !== 1 ? "s" : ""})
                                </title>
                                <rect
                                    x={i * barWidth + 0.2}
                                    y={y}
                                    width={barWidth - 0.4}
                                    height={h}
                                    rx={0.5}
                                    fill="rgba(59, 130, 246, 0.7)"
                                    className="hover:fill-blue-400 transition-colors"
                                />
                            </g>
                        )
                    })}
                </svg>
            </div>

            {/* X-axis labels — show first, middle, last date */}
            <div className="flex justify-between mt-2 text-xs text-slate-600">
                <span>{dailySeries[0]?.date.slice(5)}</span>
                <span>{dailySeries[Math.floor(dailySeries.length / 2)]?.date.slice(5)}</span>
                <span>{dailySeries[dailySeries.length - 1]?.date.slice(5)}</span>
            </div>
        </div>
    )
}

// ── Campaign performance row ─────────────────────────────────────────────────
const CampaignPerfRow = ({ c }) => {
    const deadline = new Date(c.deadline)
    return (
        <div className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0">
            {/* Thumbnail */}
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-blue-900/40 shrink-0 flex items-center justify-center">
                {c.coverImage ? (
                    <img src={c.coverImage} alt={c.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = "none" }} />
                ) : (
                    <svg className="w-5 h-5 text-blue-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                )}
            </div>

            {/* Title + status */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{c.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                    <StatusBadge status={c.displayStatus} />
                    <span className="text-xs text-slate-500">
                        {deadline.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                </div>
            </div>

            {/* Funding */}
            <div className="hidden sm:block w-32 shrink-0">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span className="font-medium text-white">₹{c.raisedAmount.toLocaleString("en-IN")}</span>
                    <span>₹{c.goalAmount.toLocaleString("en-IN")}</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full ${c.progress >= 100 ? "bg-green-500" : "bg-blue-500"}`}
                        style={{ width: `${c.progress}%` }}
                    />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                    {c.progress}% · {c.supporterCount} supporter{c.supporterCount !== 1 ? "s" : ""}
                </p>
            </div>

            {/* Actions */}
            <div className="flex gap-1 shrink-0">
                {c.slug && (
                    <Link href={`/campaign/${c.slug}`}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                        aria-label={`View ${c.title}`}>
                        <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </Link>
                )}
                {c.status !== "completed" && (
                    <Link href={`/campaign/edit/${c._id}`}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                        aria-label={`Edit ${c.title}`}>
                        <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </Link>
                )}
            </div>
        </div>
    )
}

// ── Contribution row ──────────────────────────────────────────────────────────
const ContributionRow = ({ c }) => {
    const date = new Date(c.createdAt)
    return (
        <tr className="border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors">
            <td className="py-3 pr-4 text-sm text-white font-medium whitespace-nowrap">
                {c.name}
            </td>
            <td className="py-3 pr-4 text-sm text-green-400 font-semibold whitespace-nowrap">
                ₹{c.amount.toLocaleString("en-IN")}
            </td>
            <td className="py-3 pr-4 text-sm text-slate-400 truncate max-w-0">
                {c.campaignSlug ? (
                    <Link href={`/campaign/${c.campaignSlug}`}
                        className="hover:text-white transition-colors truncate">
                        {c.campaignTitle}
                    </Link>
                ) : (
                    <span>{c.campaignTitle}</span>
                )}
            </td>
            <td className="py-3 pr-4 text-sm text-slate-500 whitespace-nowrap">
                {date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </td>
            <td className="py-3 text-sm whitespace-nowrap">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-green-500/20 text-green-400 border-green-500/30">
                    Successful
                </span>
            </td>
        </tr>
    )
}

// ── Main component ────────────────────────────────────────────────────────────
const CreatorAnalytics = () => {
    const [data, setData]         = useState(null)
    const [loading, setLoading]   = useState(true)
    const [error, setError]       = useState(null)
    const [page, setPage]         = useState(1)

    useEffect(() => {
        ;(async () => {
            setLoading(true)
            setError(null)
            const result = await getCreatorAnalytics({ contributionPage: page, contributionLimit: 10 })
            if (result.error) {
                setError(result.error)
            } else {
                setData(result)
            }
            setLoading(false)
        })()
    }, [page])

    const reload = async () => {
        setLoading(true)
        setError(null)
        const result = await getCreatorAnalytics({ contributionPage: page, contributionLimit: 10 })
        if (result.error) {
            setError(result.error)
        } else {
            setData(result)
        }
        setLoading(false)
    }

    if (loading) return <Skeleton />

    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
                <p className="text-red-400 text-sm mb-3">{error}</p>
                <button onClick={reload}
                    className="px-4 py-2 text-sm font-medium text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                    Try Again
                </button>
            </div>
        )
    }

    if (!data) return null

    const s = data.summary

    return (
        <div className="space-y-6">
            {/* ── Stat cards ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Total Raised"
                    value={`₹${s.totalRaised.toLocaleString("en-IN")}`}
                    sublabel="From verified contributions"
                    icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                    }
                />
                <StatCard
                    label="Contributions"
                    value={s.totalContributions}
                    sublabel="Successful payments"
                    icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    }
                />
                <StatCard
                    label="Active"
                    value={s.activeCampaigns}
                    sublabel={`${s.completedCampaigns} completed · ${s.expiredCampaigns} expired`}
                    icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    }
                />
                <StatCard
                    label="Completed"
                    value={s.completedCampaigns}
                    sublabel={`${s.draftCampaigns} draft${s.draftCampaigns !== 1 ? "s" : ""}`}
                    icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                />
            </div>

            {/* ── Empty state ────────────────────────────────────────────── */}
            {s.totalContributions === 0 && s.activeCampaigns === 0 && s.completedCampaigns === 0 && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
                    <div className="w-14 h-14 rounded-full bg-blue-900/40 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-7 h-7 text-blue-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <p className="text-white font-semibold mb-1">No analytics data yet</p>
                    <p className="text-slate-400 text-sm mb-5">
                        Create a campaign and receive your first contribution to see analytics here.
                    </p>
                    <Link href="/campaign/create"
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create a Campaign
                    </Link>
                </div>
            )}

            {/* ── Daily chart ────────────────────────────────────────────── */}
            {(s.totalContributions > 0 || s.activeCampaigns > 0 || s.completedCampaigns > 0) && (
                <DailyChart dailySeries={data.dailySeries} />
            )}

            {/* ── Campaign performance ──────────────────────────────────── */}
            {data.campaignPerformance.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                        Campaign Performance
                    </h3>
                    <div className="space-y-1">
                        {data.campaignPerformance.map((c) => (
                            <CampaignPerfRow key={c._id} c={c} />
                        ))}
                    </div>
                </div>
            )}

            {/* ── Contribution history ───────────────────────────────────── */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                    Contribution History
                </h3>

                {data.contributions.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-slate-400 text-sm">No contributions received yet.</p>
                        <p className="text-slate-600 text-xs mt-1">Successful contributions will appear here.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-xs text-slate-500 uppercase tracking-wider">
                                        <th className="pb-2 pr-4 font-medium">Contributor</th>
                                        <th className="pb-2 pr-4 font-medium">Amount</th>
                                        <th className="pb-2 pr-4 font-medium">Campaign</th>
                                        <th className="pb-2 pr-4 font-medium">Date</th>
                                        <th className="pb-2 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.contributions.map((c) => (
                                        <ContributionRow key={c._id} c={c} />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {data.contributionPages > 1 && (
                            <div className="flex items-center justify-center gap-3 mt-6">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    className="px-3 py-1.5 text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                                    ← Previous
                                </button>
                                <span className="text-xs text-slate-400">
                                    Page {data.contributionPage} of {data.contributionPages}
                                </span>
                                <button
                                    onClick={() => setPage((p) => Math.min(data.contributionPages, p + 1))}
                                    disabled={page >= data.contributionPages}
                                    className="px-3 py-1.5 text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                                    Next →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── Recent activity (compact view) ────────────────────────── */}
            {data.contributions.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                        Recent Activity
                    </h3>
                    <div className="space-y-3">
                        {data.contributions.slice(0, 5).map((c) => {
                            const date = new Date(c.createdAt)
                            return (
                                <div key={c._id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                                    <div className="w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center shrink-0">
                                        <span className="text-xs font-bold text-blue-200">
                                            {c.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white">
                                            <span className="font-medium">{c.name}</span>
                                            <span className="text-slate-400"> contributed </span>
                                            <span className="font-semibold text-green-400">₹{c.amount.toLocaleString("en-IN")}</span>
                                        </p>
                                        <p className="text-xs text-slate-500 truncate">
                                            to {c.campaignTitle} · {date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

export default CreatorAnalytics
