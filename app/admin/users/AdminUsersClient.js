"use client"
import React, { useEffect, useState } from "react"
import Link from "next/link"
import { getAdminUsers, restrictUser, restoreUser } from "@/actions/adminactions"
import { toast } from "react-toastify"
import { Bounce } from "react-toastify"

const AdminUsersClient = ({ adminEmail }) => {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [search, setSearch] = useState("")
    const [searchInput, setSearchInput] = useState("")
    const [page, setPage] = useState(1)
    const [pages, setPages] = useState(0)
    const [total, setTotal] = useState(0)

    const load = async () => {
        setLoading(true)
        setError(null)
        const result = await getAdminUsers({ search, page, limit: 20 })
        if (result.error) {
            setError(result.error)
        } else {
            setUsers(result.users)
            setPages(result.pages)
            setTotal(result.total)
        }
        setLoading(false)
    }

    useEffect(() => {
        ;(async () => {
            setLoading(true)
            setError(null)
            const result = await getAdminUsers({ search, page, limit: 20 })
            if (result.error) {
                setError(result.error)
            } else {
                setUsers(result.users)
                setPages(result.pages)
                setTotal(result.total)
            }
            setLoading(false)
        })()
    }, [page, search])

    const handleSearch = (e) => {
        e.preventDefault()
        setSearch(searchInput.trim())
        setPage(1)
    }

    const handleRestrict = async (userId, e) => {
        const result = await restrictUser(userId)
        if (result.error) {
            toast.error(result.error, { position: "top-right", autoClose: 4000, theme: "dark", transition: Bounce })
        } else {
            toast.success("User restricted", { position: "top-right", autoClose: 3000, theme: "dark", transition: Bounce })
            await load()
        }
    }

    const handleRestore = async (userId) => {
        const result = await restoreUser(userId)
        if (result.error) {
            toast.error(result.error, { position: "top-right", autoClose: 4000, theme: "dark", transition: Bounce })
        } else {
            toast.success("User restored", { position: "top-right", autoClose: 3000, theme: "dark", transition: Bounce })
            await load()
        }
    }

    if (loading && users.length === 0) {
        return (
            <div className="space-y-3 animate-pulse">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 h-20" />
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
            {/* Search */}
            <form onSubmit={handleSearch} className="relative">
                <input
                    type="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search by username or name…"
                    maxLength={100}
                    className="w-full px-4 py-3 text-sm text-white bg-white/5 border border-white/15 rounded-xl placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors">
                    Search
                </button>
            </form>

            <p className="text-xs text-slate-500">{total} user{total !== 1 ? "s" : ""}</p>

            {/* User list */}
            {users.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
                    <p className="text-slate-400 text-sm">No users found.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {users.map((u) => (
                        <div key={u._id} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/[0.07] transition-colors">
                            <div className="flex items-center gap-4">
                                {/* Avatar */}
                                <div className="w-10 h-10 rounded-full bg-blue-800 overflow-hidden shrink-0">
                                    {u.profilepic ? (
                                        <img src={u.profilepic} alt={u.username}
                                            className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="flex items-center justify-center w-full h-full text-sm font-bold text-blue-200">
                                            {u.username.charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-white text-sm truncate">{u.name}</p>
                                        {u.role === "admin" && (
                                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                                Admin
                                            </span>
                                        )}
                                        {u.isRestricted && (
                                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                                                Restricted
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 truncate">
                                        @{u.username} · joined {new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 shrink-0">
                                    {u.role !== "admin" && !u.isRestricted && (
                                        <button onClick={() => handleRestrict(u._id)}
                                            className="px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-colors">
                                            Restrict
                                        </button>
                                    )}
                                    {u.role !== "admin" && u.isRestricted && (
                                        <button onClick={() => handleRestore(u._id)}
                                            className="px-3 py-1.5 text-xs font-medium text-green-400 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg transition-colors">
                                            Restore
                                        </button>
                                    )}
                                    <Link href={`/${u.username}`}
                                        className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors">
                                        View
                                    </Link>
                                </div>
                            </div>
                        </div>
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

export default AdminUsersClient
