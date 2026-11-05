"use client"
import React from "react";

// Evaluated once when the client-side JS module is loaded — not during the
// server prerender, so Next.js 16 does not flag it.
const CURRENT_YEAR = new Date().getFullYear();

const Footer = () => {
    return (
        <footer className="bg-blue-950 text-white flex items-center justify-center px-4 h-12">
            <p className='text-center'>
                Copyright &copy; {CURRENT_YEAR} Uddan - All rights reserved!
            </p>
        </footer>
    )
}

export default Footer
