"use client"

/**
 * Login page — Uddan
 *
 * Three authentication methods:
 *   1. GitHub  — always shown; existing NextAuth provider.
 *   2. Google  — shown only when the server has the Google provider configured.
 *                Determined at runtime by fetching /api/auth/providers.
 *                No button is rendered when credentials are missing.
 *   3. Email OTP — two-step flow:
 *        Step 1: enter email → POST /api/auth/otp/send
 *        Step 2: enter 6-digit code → signIn("email-otp", { email, otp })
 *
 * Security notes:
 *   - OTP values are never logged, displayed in error messages, or stored
 *     in component state beyond the controlled input.
 *   - Internal authentication errors from NextAuth are translated to a
 *     generic user-facing message.
 *   - The provider ID passed to signIn() is the exact string "email-otp"
 *     as registered in the CredentialsProvider.
 *   - Leading zeros in OTP input are preserved via type="text" + pattern.
 */

import React, { useEffect, useState, useRef, useCallback } from "react"
import { useSession, signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

// ── OTP step constants ────────────────────────────────────────────────────────

const STEP_EMAIL  = "email"
const STEP_OTP    = "otp"

// ── SVG icons ─────────────────────────────────────────────────────────────────

const GitHubIcon = () => (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 73 73" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="69" height="69" rx="13" fill="#000" stroke="#000" strokeWidth="2" />
        <path fillRule="evenodd" clipRule="evenodd" fill="#fff"
            d="M36.5 10C21.9 10 10 21.9 10 36.5c0 11.7 7.6 21.7 18.1 25.2 1.3.2 1.8-.6 1.8-1.3v-4.6c-7.4 1.6-9-3.6-9-3.6-1.2-3.1-3-3.9-3-3.9-2.4-1.7.2-1.6.2-1.6 2.7.2 4.1 2.8 4.1 2.8 2.4 4.1 6.3 2.9 7.8 2.2.2-1.7.9-2.9 1.7-3.6-5.9-.7-12.1-3-12.1-13.2 0-2.9 1-5.3 2.7-7.2-.3-.7-1.2-3.4.3-7.1 0 0 2.2-.7 7.3 2.7 2.1-.6 4.4-.9 6.6-.9s4.5.3 6.6.9c5-3.4 7.3-2.7 7.3-2.7 1.4 3.7.5 6.4.3 7.1 1.7 1.9 2.7 4.3 2.7 7.2 0 10.2-6.2 12.5-12.2 13.2.9.8 1.8 2.4 1.8 4.8v7.2c0 .7.5 1.5 1.8 1.3C54.4 58.2 62 48.2 62 36.5 62 21.9 50.1 10 36.5 10z" />
    </svg>
)

const GoogleIcon = () => (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
)

const EmailIcon = () => (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
)

const Spinner = () => (
    <svg className="animate-spin w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
)

const BackIcon = () => (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
)

// ── Shared input style ────────────────────────────────────────────────────────

const inputCls =
    "block w-full px-3 py-2.5 text-sm text-white bg-white/5 border border-white/15 " +
    "rounded-lg placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 " +
    "focus:border-transparent transition-colors"

// ── Main component ────────────────────────────────────────────────────────────

const Login = () => {
    const { data: session }   = useSession()
    const router              = useRouter()

    // OAuth providers available on this deployment (fetched from NextAuth)
    const [googleAvailable, setGoogleAvailable] = useState(false)
    const [providersLoaded, setProvidersLoaded] = useState(false)

    // OTP flow state
    const [step,            setStep]            = useState(STEP_EMAIL)
    const [email,           setEmail]           = useState("")
    const [otp,             setOtp]             = useState("")
    const [emailError,      setEmailError]      = useState("")
    const [sendError,       setSendError]       = useState("")
    const [verifyError,     setVerifyError]     = useState("")
    const [isSending,       setIsSending]       = useState(false)
    const [isVerifying,     setIsVerifying]     = useState(false)
    const [resendCooldown,  setResendCooldown]  = useState(0)   // seconds remaining
    const [showOtpFlow,     setShowOtpFlow]     = useState(false)

    // OAuth loading states
    const [githubLoading,   setGithubLoading]   = useState(false)
    const [googleLoading,   setGoogleLoading]   = useState(false)

    const cooldownTimerRef = useRef(null)
    const otpInputRef      = useRef(null)

    // ── Redirect if already authenticated ────────────────────────────────────
    useEffect(() => {
        if (session) router.push("/dashboard")
    }, [session, router])

    // ── Fetch available providers ─────────────────────────────────────────────
    // Determines whether to show the Google button without hard-coding env
    // variable values in client-side code.
    useEffect(() => {
        fetch("/api/auth/providers")
            .then((r) => r.json())
            .then((data) => {
                setGoogleAvailable("google" in data)
                setProvidersLoaded(true)
            })
            .catch(() => {
                // On fetch failure assume Google is unavailable — fail safe.
                setProvidersLoaded(true)
            })
    }, [])

    // ── Resend cooldown ticker ────────────────────────────────────────────────
    const startCooldown = useCallback((seconds) => {
        setResendCooldown(seconds)
        clearInterval(cooldownTimerRef.current)
        cooldownTimerRef.current = setInterval(() => {
            setResendCooldown((prev) => {
                if (prev <= 1) {
                    clearInterval(cooldownTimerRef.current)
                    return 0
                }
                return prev - 1
            })
        }, 1000)
    }, [])

    useEffect(() => () => clearInterval(cooldownTimerRef.current), [])

    // ── Focus OTP input when step changes ────────────────────────────────────
    useEffect(() => {
        if (step === STEP_OTP && otpInputRef.current) {
            otpInputRef.current.focus()
        }
    }, [step])

    // ── Email validation ──────────────────────────────────────────────────────
    function validateEmail(value) {
        const t = value.trim().toLowerCase()
        if (!t) return "Please enter your email address."
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return "Please enter a valid email address."
        if (t.length > 254) return "Email address is too long."
        return ""
    }

    // ── Step 1: Send OTP ──────────────────────────────────────────────────────
    async function handleSendOtp(e) {
        e.preventDefault()
        const err = validateEmail(email)
        if (err) { setEmailError(err); return }

        setEmailError("")
        setSendError("")
        setIsSending(true)

        try {
            const res  = await fetch("/api/auth/otp/send", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ email: email.trim().toLowerCase() }),
            })
            const data = await res.json()

            if (!res.ok) {
                // Surface the server message directly — the backend produces
                // safe, user-readable errors (rate limit, restriction, etc.)
                setSendError(data?.error || "Could not send verification code. Please try again.")
                return
            }

            // Success — advance to OTP entry step.
            setOtp("")
            setVerifyError("")
            setStep(STEP_OTP)
            if (data.resendCooldown) startCooldown(data.resendCooldown)
        } catch {
            setSendError("A network error occurred. Please check your connection and try again.")
        } finally {
            setIsSending(false)
        }
    }

    // ── Resend OTP ────────────────────────────────────────────────────────────
    async function handleResend() {
        if (resendCooldown > 0 || isSending) return
        setSendError("")
        setVerifyError("")
        setIsSending(true)

        try {
            const res  = await fetch("/api/auth/otp/send", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ email: email.trim().toLowerCase() }),
            })
            const data = await res.json()

            if (!res.ok) {
                setSendError(data?.error || "Could not resend verification code.")
                return
            }

            setOtp("")
            if (data.resendCooldown) startCooldown(data.resendCooldown)
        } catch {
            setSendError("A network error occurred. Please try again.")
        } finally {
            setIsSending(false)
        }
    }

    // ── Step 2: Verify OTP ────────────────────────────────────────────────────
    async function handleVerifyOtp(e) {
        e.preventDefault()
        if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
            setVerifyError("Please enter the 6-digit code from your email.")
            return
        }

        setVerifyError("")
        setIsVerifying(true)

        try {
            const result = await signIn("email-otp", {
                email:    email.trim().toLowerCase(),
                otp,
                redirect: false,
            })

            if (result?.error) {
                // NextAuth returns a generic "CredentialsSignin" string on
                // failure — translate it rather than exposing internal detail.
                setVerifyError("Incorrect or expired code. Please check and try again.")
            }
            // On success, the session useEffect redirects to /dashboard.
        } catch {
            setVerifyError("A network error occurred. Please try again.")
        } finally {
            setIsVerifying(false)
        }
    }

    // ── Return to email step ──────────────────────────────────────────────────
    function handleBackToEmail() {
        setStep(STEP_EMAIL)
        setOtp("")
        setVerifyError("")
        setSendError("")
        clearInterval(cooldownTimerRef.current)
        setResendCooldown(0)
    }

    // ── Toggle email flow visibility ──────────────────────────────────────────
    function handleToggleEmailFlow() {
        if (showOtpFlow) {
            // Collapse: also reset any in-progress OTP state
            setShowOtpFlow(false)
            setStep(STEP_EMAIL)
            setEmail("")
            setOtp("")
            setEmailError("")
            setSendError("")
            setVerifyError("")
            clearInterval(cooldownTimerRef.current)
            setResendCooldown(0)
        } else {
            setShowOtpFlow(true)
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col items-center justify-center px-6 py-20 md:py-28">
            <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-8 shadow-xl">

                {/* Logo + heading */}
                <div className="flex flex-col items-center gap-3 mb-8">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/uddan.gif" width={56} height={56} alt="Uddan logo" />
                    <h1 className="text-2xl font-bold text-white text-center">
                        Welcome to Uddan
                    </h1>
                    <p className="text-slate-400 text-sm text-center">
                        Sign in to manage your page and connect with supporters.
                    </p>
                </div>

                <div className="flex flex-col gap-3">

                    {/* ── GitHub ─────────────────────────────────────────── */}
                    <button
                        onClick={() => { setGithubLoading(true); signIn("github") }}
                        disabled={githubLoading || googleLoading || isSending || isVerifying}
                        className="flex items-center justify-center gap-3 w-full bg-white hover:bg-gray-100 active:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-gray-900 font-semibold rounded-lg px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                    >
                        {githubLoading ? <Spinner /> : <GitHubIcon />}
                        {githubLoading ? "Redirecting…" : "Continue with GitHub"}
                    </button>

                    {/* ── Google (conditional) ───────────────────────────── */}
                    {providersLoaded && googleAvailable && (
                        <button
                            onClick={() => { setGoogleLoading(true); signIn("google") }}
                            disabled={githubLoading || googleLoading || isSending || isVerifying}
                            className="flex items-center justify-center gap-3 w-full bg-white hover:bg-gray-100 active:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-gray-900 font-semibold rounded-lg px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400"
                        >
                            {googleLoading ? <Spinner /> : <GoogleIcon />}
                            {googleLoading ? "Redirecting…" : "Continue with Google"}
                        </button>
                    )}

                    {/* ── Email OTP toggle ───────────────────────────────── */}
                    <button
                        onClick={handleToggleEmailFlow}
                        disabled={githubLoading || googleLoading || isVerifying}
                        className="flex items-center justify-center gap-3 w-full bg-white/5 hover:bg-white/10 active:bg-white/15 disabled:opacity-60 disabled:cursor-not-allowed transition-colors border border-white/15 text-white font-semibold rounded-lg px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        <EmailIcon />
                        Continue with Email
                    </button>

                    {/* ── Email OTP flow ─────────────────────────────────── */}
                    {showOtpFlow && (
                        <div className="mt-1 border border-white/10 rounded-xl p-4 bg-white/[0.03] flex flex-col gap-4">

                            {step === STEP_EMAIL && (
                                /* Step 1 — email entry */
                                <form onSubmit={handleSendOtp} noValidate className="flex flex-col gap-3">
                                    <div>
                                        <label htmlFor="otp-email" className="block text-xs font-medium text-slate-300 mb-1.5">
                                            Email address
                                        </label>
                                        <input
                                            id="otp-email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => { setEmail(e.target.value); setEmailError("") }}
                                            placeholder="you@example.com"
                                            autoComplete="email"
                                            className={`${inputCls}${emailError ? " border-red-500 focus:ring-red-500" : ""}`}
                                            disabled={isSending}
                                        />
                                        {emailError && (
                                            <p className="mt-1.5 text-xs text-red-400">{emailError}</p>
                                        )}
                                    </div>

                                    {sendError && (
                                        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                                            {sendError}
                                        </p>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={isSending}
                                        className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    >
                                        {isSending ? (
                                            <><Spinner /> Sending code…</>
                                        ) : (
                                            "Send verification code"
                                        )}
                                    </button>
                                </form>
                            )}

                            {step === STEP_OTP && (
                                /* Step 2 — OTP entry */
                                <form onSubmit={handleVerifyOtp} noValidate className="flex flex-col gap-3">

                                    {/* Back link + email reminder */}
                                    <div className="flex items-center justify-between">
                                        <button
                                            type="button"
                                            onClick={handleBackToEmail}
                                            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                                        >
                                            <BackIcon />
                                            Change email
                                        </button>
                                        <span className="text-xs text-slate-500 truncate max-w-[180px]" title={email}>
                                            {email}
                                        </span>
                                    </div>

                                    <p className="text-xs text-slate-400">
                                        Enter the 6-digit code sent to your email. It expires in 5&nbsp;minutes.
                                    </p>

                                    <div>
                                        <label htmlFor="otp-code" className="block text-xs font-medium text-slate-300 mb-1.5">
                                            Verification code
                                        </label>
                                        <input
                                            id="otp-code"
                                            ref={otpInputRef}
                                            /* type="text" preserves leading zeros; pattern restricts to digits */
                                            type="text"
                                            inputMode="numeric"
                                            pattern="\d{6}"
                                            maxLength={6}
                                            value={otp}
                                            onChange={(e) => {
                                                // Accept digits only; preserve leading zeros.
                                                const v = e.target.value.replace(/\D/g, "").slice(0, 6)
                                                setOtp(v)
                                                setVerifyError("")
                                            }}
                                            placeholder="000000"
                                            autoComplete="one-time-code"
                                            className={`${inputCls} tracking-[0.4em] text-center text-lg font-semibold${verifyError ? " border-red-500 focus:ring-red-500" : ""}`}
                                            disabled={isVerifying}
                                        />
                                        {verifyError && (
                                            <p className="mt-1.5 text-xs text-red-400">{verifyError}</p>
                                        )}
                                    </div>

                                    {sendError && (
                                        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                                            {sendError}
                                        </p>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={isVerifying || otp.length !== 6}
                                        className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    >
                                        {isVerifying ? (
                                            <><Spinner /> Verifying…</>
                                        ) : (
                                            "Verify code"
                                        )}
                                    </button>

                                    {/* Resend */}
                                    <div className="text-center">
                                        {resendCooldown > 0 ? (
                                            <p className="text-xs text-slate-500">
                                                Resend available in {resendCooldown}s
                                            </p>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={handleResend}
                                                disabled={isSending || isVerifying}
                                                className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:underline"
                                            >
                                                {isSending ? "Sending…" : "Resend code"}
                                            </button>
                                        )}
                                    </div>
                                </form>
                            )}
                        </div>
                    )}
                </div>

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
