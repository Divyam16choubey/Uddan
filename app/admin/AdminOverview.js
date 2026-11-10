"use client"
import React, { useEffect, useState } from "react"
import { getAdminStats } from "@/actions/adminactions"

const StatCard = ({ label, value, sublabel }) => (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/[0.07] transition-colors">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">{label}</p>
        <p className="text-2xl font-extrabold text-white">{value}</p>
        {sublabel && <p className="text-xs text-slate-500 mt-1">{sublabel}</p>}
    </div>
)

const Skeleton = () => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 h-28" />
        ))}
    </div>
)

const AdminOverview = () => {
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        ;(async () => {
            const result = await getAdminStats()
            if (result.error) {
                setError(result.error)
            } else {
                setStats(result.stats)
            }
            setLoading(false)
        })()
    }, [])

    if (loading) return <Skeleton />

    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
                <p className="text-red-400 text-sm">{error}</p>
            </div>
        )
    }

    if (!stats) return null

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Users" value={stats.totalUsers} />
                <StatCard label="Total Campaigns" value={stats.totalCampaigns} />
                <StatCard label="Pending Review" value={stats.pendingCampaigns}
                    sublabel="Awaiting moderation" />
                <StatCard label="Suspended" value={stats.suspendedCampaigns} />
                <StatCard label="Active & Approved" value={stats.activeApproved}
                    sublabel="Visible publicly" />
                <StatCard label="Completed" value={stats.completedCampaigns} />
                <StatCard label="Expired" value={stats.expiredCampaigns}
                    sublabel="Past deadline" />
                <StatCard label="Rejected" value={stats.rejectedCampaigns} />
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                    Financial Overview
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-xl p-4">
                        <p className="text-2xl font-extrabold text-white">
                            ₹{stats.totalRaised.toLocaleString("en-IN")}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">Total raised (campaign contributions)</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                        <p className="text-2xl font-extrabold text-white">
                            {stats.totalContributions.toLocaleString("en-IN")}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">Successful contributions</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AdminOverview
