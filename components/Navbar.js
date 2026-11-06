"use client"
import React, { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";

const Navbar = () => {
    const { data: session } = useSession()
    const [showDropdown, setShowDropdown] = useState(false)
    const [showMobileMenu, setShowMobileMenu] = useState(false)

    return (
        <nav className="bg-blue-950 text-white px-4 md:px-6">
            <div className="flex justify-between items-center h-14">

                {/* Logo */}
                <Link
                    className="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition-opacity"
                    href="/"
                >
                    <img className="invertImg" src="uddan.gif" width={36} height={36} alt="Uddan logo" />
                    <span className="text-base md:text-lg tracking-wide">Uddan</span>
                </Link>

                {/* Desktop right side */}
                <div className="hidden md:flex items-center gap-3">
                    {session ? (
                        <>
                            {/* Account dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowDropdown(!showDropdown)}
                                    onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                                    className="flex items-center gap-1.5 bg-blue-800 hover:bg-blue-700 transition-colors px-3 py-1.5 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    aria-haspopup="true"
                                    aria-expanded={showDropdown}
                                >
                                    <span>{session.user.name}</span>
                                    <svg className={`w-3 h-3 transition-transform ${showDropdown ? "rotate-180" : ""}`} fill="none" viewBox="0 0 10 6" xmlns="http://www.w3.org/2000/svg">
                                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 4 4 4-4" />
                                    </svg>
                                </button>

                                {showDropdown && (
                                    <div className="absolute right-0 top-10 z-50 w-48 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden">
                                        <ul className="py-1 text-sm text-gray-700">
                                            <li>
                                                <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" /></svg>
                                                    Dashboard
                                                </Link>
                                            </li>
                                            <li>
                                                <Link href={`/${session.user.name}`} className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                    Your Page
                                                </Link>
                                            </li>
                                            <li className="border-t border-gray-100">
                                                <button onClick={() => signOut()} className="flex w-full items-center gap-2 px-4 py-2.5 hover:bg-red-50 text-red-600 transition-colors">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                                    Sign out
                                                </button>
                                            </li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <Link href="/login">
                            <button className="bg-gradient-to-br from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 transition-all text-white font-medium rounded-lg text-sm px-5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
                                Login
                            </button>
                        </Link>
                    )}
                </div>

                {/* Mobile right side */}
                <div className="flex md:hidden items-center gap-2">
                    {!session && (
                        <Link href="/login">
                            <button className="bg-gradient-to-br from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 transition-all text-white font-medium rounded-lg text-xs px-4 py-1.5 focus:outline-none">
                                Login
                            </button>
                        </Link>
                    )}
                    {/* Hamburger */}
                    <button
                        onClick={() => setShowMobileMenu(!showMobileMenu)}
                        className="p-1.5 rounded-lg hover:bg-blue-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                        aria-label="Toggle menu"
                    >
                        {showMobileMenu ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {showMobileMenu && (
                <div className="md:hidden border-t border-blue-900 py-3 space-y-1">
                    {session ? (
                        <>
                            <p className="px-4 py-2 text-xs text-blue-300 font-medium uppercase tracking-wider">
                                Signed in as <span className="text-white">{session.user.name}</span>
                            </p>
                            <Link href="/dashboard" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg hover:bg-blue-900 transition-colors text-sm">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" /></svg>
                                Dashboard
                            </Link>
                            <Link href={`/${session.user.name}`} onClick={() => setShowMobileMenu(false)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg hover:bg-blue-900 transition-colors text-sm">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                Your Page
                            </Link>
                            <button onClick={() => { signOut(); setShowMobileMenu(false) }} className="flex w-full items-center gap-2 px-4 py-2.5 rounded-lg hover:bg-red-900/30 text-red-400 transition-colors text-sm">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                Sign out
                            </button>
                        </>
                    ) : (
                        <Link href="/login" onClick={() => setShowMobileMenu(false)} className="block px-4 py-2.5 rounded-lg hover:bg-blue-900 transition-colors text-sm">
                            Login
                        </Link>
                    )}
                </div>
            )}
        </nav>
    )
}

export default Navbar
