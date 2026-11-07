"use client"
import React, { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

/**
 * CampaignsClient — thin client island for search + category controls.
 *
 * When the user types or picks a category the URL is updated via router.push()
 * which causes the server page component to re-run with the new searchParams,
 * fetching fresh results from MongoDB without any client-side data fetching.
 */
const CampaignsClient = ({ initialSearch, initialCategory, categories }) => {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [search,   setSearch]   = useState(initialSearch   ?? "")
    const [category, setCategory] = useState(initialCategory ?? "")

    const navigate = (nextSearch, nextCategory) => {
        const params = new URLSearchParams()
        if (nextSearch)   params.set("search",   nextSearch.trim())
        if (nextCategory) params.set("category", nextCategory)
        // Always reset to page 1 when filters change
        const url = params.toString() ? `/campaigns?${params.toString()}` : "/campaigns"
        startTransition(() => { router.push(url) })
    }

    const handleSearchChange = (e) => {
        const val = e.target.value
        setSearch(val)
    }

    const handleSearchSubmit = (e) => {
        e.preventDefault()
        navigate(search, category)
    }

    const handleCategoryChange = (cat) => {
        const next = cat === category ? "" : cat   // toggle off if same
        setCategory(next)
        navigate(search, next)
    }

    const handleClear = () => {
        setSearch("")
        setCategory("")
        startTransition(() => { router.push("/campaigns") })
    }

    const hasFilters = search.trim() || category

    return (
        <div className="space-y-4">
            {/* Search bar */}
            <form onSubmit={handleSearchSubmit} className="relative">
                <div className="relative">
                    <svg
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="search"
                        value={search}
                        onChange={handleSearchChange}
                        placeholder="Search campaigns by title…"
                        maxLength={100}
                        className="w-full pl-10 pr-28 py-3 text-sm text-white bg-white/5 border border-white/15 rounded-xl placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors hover:bg-white/10"
                    />
                    <button
                        type="submit"
                        disabled={isPending}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 rounded-lg transition-colors focus:outline-none"
                    >
                        {isPending ? "…" : "Search"}
                    </button>
                </div>
            </form>

            {/* Category pills */}
            <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-slate-500 mr-1 shrink-0">Filter:</span>
                {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => handleCategoryChange(cat)}
                        disabled={isPending}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors focus:outline-none disabled:opacity-60 ${
                            category === cat
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "bg-white/5 border-white/15 text-slate-300 hover:bg-white/10 hover:border-white/25"
                        }`}
                    >
                        {cat}
                    </button>
                ))}
                {hasFilters && (
                    <button
                        onClick={handleClear}
                        disabled={isPending}
                        className="px-3 py-1.5 text-xs font-medium rounded-full border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors focus:outline-none disabled:opacity-60"
                    >
                        ✕ Clear
                    </button>
                )}
            </div>

            {/* Pending indicator */}
            {isPending && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Updating results…
                </div>
            )}
        </div>
    )
}

export default CampaignsClient
