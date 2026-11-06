"use client"
import React, { useEffect } from 'react'
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

const Login = () => {
    const { data: session } = useSession()
    const router = useRouter()

    useEffect(() => {
        if (session) {
            router.push('/dashboard')
        }
    }, [session, router])

    return (
        <div className="flex flex-col items-center justify-center px-6 py-20 md:py-28">
            {/* Card */}
            <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-8 shadow-xl">
                {/* Logo mark */}
                <div className="flex flex-col items-center gap-3 mb-8">
                    <img src="/uddan.gif" width={56} height={56} alt="Uddan logo" />
                    <h1 className="text-2xl font-bold text-white text-center">
                        Welcome to Uddan
                    </h1>
                    <p className="text-slate-400 text-sm text-center">
                        Sign in to manage your page and connect with supporters.
                    </p>
                </div>

                {/* GitHub — only provider currently configured */}
                <button
                    onClick={() => signIn("github")}
                    className="flex items-center justify-center gap-3 w-full bg-white hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-900 font-semibold rounded-lg px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                >
                    {/* GitHub mark */}
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 73 73" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="1" y="1" width="69" height="69" rx="13" fill="#000" stroke="#000" strokeWidth="2" />
                        <path fillRule="evenodd" clipRule="evenodd" fill="#fff"
                            d="M36.5 10C21.9 10 10 21.9 10 36.5c0 11.7 7.6 21.7 18.1 25.2 1.3.2 1.8-.6 1.8-1.3v-4.6c-7.4 1.6-9-3.6-9-3.6-1.2-3.1-3-3.9-3-3.9-2.4-1.7.2-1.6.2-1.6 2.7.2 4.1 2.8 4.1 2.8 2.4 4.1 6.3 2.9 7.8 2.2.2-1.7.9-2.9 1.7-3.6-5.9-.7-12.1-3-12.1-13.2 0-2.9 1-5.3 2.7-7.2-.3-.7-1.2-3.4.3-7.1 0 0 2.2-.7 7.3 2.7 2.1-.6 4.4-.9 6.6-.9s4.5.3 6.6.9c5-3.4 7.3-2.7 7.3-2.7 1.4 3.7.5 6.4.3 7.1 1.7 1.9 2.7 4.3 2.7 7.2 0 10.2-6.2 12.5-12.2 13.2.9.8 1.8 2.4 1.8 4.8v7.2c0 .7.5 1.5 1.8 1.3C54.4 58.2 62 48.2 62 36.5 62 21.9 50.1 10 36.5 10z" />
                    </svg>
                    Continue with GitHub
                </button>

                <p className="text-center text-xs text-slate-500 mt-6">
                    By signing in you agree to our&nbsp;
                    <span className="text-slate-400 underline cursor-default">Terms of Service</span>
                    &nbsp;and&nbsp;
                    <span className="text-slate-400 underline cursor-default">Privacy Policy</span>.
                </p>
            </div>
        </div>
    )
}

export default Login
