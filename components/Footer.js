"use client"
import React from "react";
import Link from "next/link";

const CURRENT_YEAR = new Date().getFullYear();

const Footer = () => {
    return (
        <footer className="bg-blue-950 text-white border-t border-white/10">
            <div className="container mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">

                {/* Brand */}
                <div className="flex items-center gap-2">
                    <img src="uddan.gif" width={24} height={24} alt="Uddan" className="invertImg opacity-80" />
                    <span className="font-semibold text-sm tracking-wide">Uddan</span>
                </div>

                {/* Nav links */}
                <nav className="flex items-center gap-5 text-sm text-slate-400">
                    <Link href="/" className="hover:text-white transition-colors">Home</Link>
                    <Link href="/campaigns" className="hover:text-white transition-colors">Explore</Link>
                    <Link href="/about" className="hover:text-white transition-colors">About</Link>
                    <Link href="/login" className="hover:text-white transition-colors">Login</Link>
                </nav>

                {/* Copyright */}
                <p className="text-xs text-slate-500 text-center md:text-right">
                    &copy; {CURRENT_YEAR} Uddan. All rights reserved.
                </p>

            </div>
        </footer>
    )
}

export default Footer
