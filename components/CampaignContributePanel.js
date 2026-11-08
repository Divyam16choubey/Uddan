"use client"
import React, { useState, useEffect } from "react"
import Script from "next/script"
import { useSearchParams, useRouter } from "next/navigation"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { Bounce } from "react-toastify"
import { initiateCampaignPayment } from "@/actions/campaignactions"

// ── Constants ─────────────────────────────────────────────────────────────────
const QUICK_AMOUNTS = [50, 100, 500, 1000]
const MIN_INR = 10
const MAX_INR = 100000

// ── Shared input class — consistent with Dashboard.js / CampaignForm.js ───────
const inputCls =
    "block w-full px-3 py-2.5 text-sm text-white bg-white/5 border border-white/15 " +
    "rounded-lg placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 " +
    "focus:border-transparent transition-colors hover:bg-white/10"

// ── Spinner icon ──────────────────────────────────────────────────────────────
const Spinner = ({ className = "w-4 h-4" }) => (
    <svg className={`animate-spin shrink-0 ${className}`} fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
)

// ── Main component ────────────────────────────────────────────────────────────
/**
 * CampaignContributePanel
 *
 * Props:
 *   campaignSlug   string   — used to call initiateCampaignPayment
 *   campaignTitle  string   — shown in the form header
 *   canSupport     boolean  — false when campaign is expired / completed
 *   closedReason   string   — message to show when canSupport is false
 */
const CampaignContributePanel = ({
    campaignSlug,
    campaignTitle,
    canSupport = true,
    closedReason = "Campaign has ended",
}) => {
    const searchParams = useSearchParams()
    const router       = useRouter()

    const [open,    setOpen]    = useState(false)           // panel expanded?
    const [amount,  setAmount]  = useState("")              // rupees (string)
    const [name,    setName]    = useState("")
    const [message, setMessage] = useState("")
    const [status,  setStatus]  = useState("idle")         // idle | creating | open | done | error
    const [errMsg,  setErrMsg]  = useState("")

    // ── Handle paymentdone redirect ───────────────────────────────────────
    useEffect(() => {
        if (searchParams.get("paymentdone") === "true") {
            toast.success("Thank you for your contribution! 🎉", {
                position: "top-right", autoClose: 6000, hideProgressBar: false,
                closeOnClick: true, pauseOnHover: true, draggable: true,
                theme: "dark", transition: Bounce,
            })
            // Strip the query param and hard-refresh so the server component
            // re-fetches updated raisedAmount / supporterCount from MongoDB.
            router.replace(`/campaign/${campaignSlug}`)
            router.refresh()
        }
    }, [searchParams, campaignSlug, router])

    // ── Form helpers ──────────────────────────────────────────────────────
    const setQuickAmount = (val) => setAmount(String(val))

    const amountNum   = Number(amount)
    const amountValid = amount !== "" && Number.isInteger(amountNum) && amountNum >= MIN_INR && amountNum <= MAX_INR
    const nameValid   = name.trim().length >= 2
    const canSubmit   = amountValid && nameValid && status === "idle"

    // ── Pay handler ───────────────────────────────────────────────────────
    const handlePay = async () => {
        if (!canSubmit) return
        setStatus("creating")
        setErrMsg("")

        const result = await initiateCampaignPayment(
            campaignSlug,
            amountNum,
            { name: name.trim(), message: message.trim() }
        )

        if (result?.error) {
            setStatus("error")
            setErrMsg(result.error)
            toast.error(result.error, {
                position: "top-right", autoClose: 5000, hideProgressBar: false,
                closeOnClick: true, pauseOnHover: true, draggable: true,
                theme: "dark", transition: Bounce,
            })
            // Reset to idle after a short delay so user can try again
            setTimeout(() => setStatus("idle"), 3000)
            return
        }

        // ── Open Razorpay checkout ────────────────────────────────────────
        setStatus("open")

        const options = {
            key:          result.razorpayKeyId,
            amount:       result.amountPaise,
            currency:     "INR",
            name:         "Uddan",
            description:  `Support: ${result.campaignTitle}`,
            order_id:     result.orderId,
            // Redirect mode: Razorpay POSTs to /api/razorpay after payment.
            // This mirrors the existing creator-profile payment flow exactly.
            callback_url: `${process.env.NEXT_PUBLIC_URL}/api/razorpay`,
            prefill: {
                name: name.trim(),
            },
            theme: { color: "#3b82f6" },
            modal: {
                // When the user closes the modal without paying, reset state.
                ondismiss: () => setStatus("idle"),
            },
        }

        const rzp = new Razorpay(options)
        rzp.open()
    }

    // ── Closed state (expired / completed) ───────────────────────────────
    if (!canSupport) {
        return (
            <div className="w-full py-3 text-sm font-medium text-slate-500 bg-white/5 rounded-lg text-center cursor-not-allowed border border-white/10">
                {closedReason}
            </div>
        )
    }

    // ── Collapsed CTA ─────────────────────────────────────────────────────
    if (!open) {
        return (
            <>
                <ToastContainer position="top-right" autoClose={6000} hideProgressBar={false}
                    newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss
                    draggable pauseOnHover theme="dark" />
                <Script src="https://checkout.razorpay.com/v1/checkout.js" />

                <button
                    onClick={() => setOpen(true)}
                    className="w-full py-3 text-sm font-semibold text-white bg-gradient-to-br from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 transition-all rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                    Support This Campaign
                </button>
            </>
        )
    }

    // ── Expanded contribution form ────────────────────────────────────────
    return (
        <>
            <ToastContainer position="top-right" autoClose={6000} hideProgressBar={false}
                newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss
                draggable pauseOnHover theme="dark" />
            <Script src="https://checkout.razorpay.com/v1/checkout.js" />

            <div className="space-y-4">
                {/* Header row */}
                <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">Make a Contribution</p>
                    <button
                        onClick={() => { setOpen(false); setStatus("idle"); setErrMsg("") }}
                        className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded"
                        aria-label="Close contribution form"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Quick-amount pills */}
                <div>
                    <p className="text-xs text-slate-500 mb-2">Quick amounts</p>
                    <div className="flex flex-wrap gap-2">
                        {QUICK_AMOUNTS.map((q) => (
                            <button
                                key={q}
                                onClick={() => setQuickAmount(q)}
                                disabled={status !== "idle"}
                                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                                    Number(amount) === q
                                        ? "bg-blue-600 border-blue-600 text-white"
                                        : "bg-white/5 border-white/15 text-slate-300 hover:bg-white/10"
                                }`}
                            >
                                ₹{q}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Custom amount */}
                <div>
                    <label htmlFor="contrib-amount" className="block text-xs text-slate-400 mb-1.5">
                        Custom amount (₹) <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-sm pointer-events-none">₹</span>
                        <input
                            id="contrib-amount"
                            type="number"
                            min={MIN_INR}
                            max={MAX_INR}
                            step="1"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            disabled={status !== "idle"}
                            className={`${inputCls} pl-7`}
                            placeholder={`${MIN_INR}–${MAX_INR.toLocaleString("en-IN")}`}
                        />
                    </div>
                    {amount !== "" && !amountValid && (
                        <p className="text-xs text-red-400 mt-1">
                            Enter a whole number between ₹{MIN_INR} and ₹{MAX_INR.toLocaleString("en-IN")}
                        </p>
                    )}
                </div>

                {/* Name */}
                <div>
                    <label htmlFor="contrib-name" className="block text-xs text-slate-400 mb-1.5">
                        Your name <span className="text-red-400">*</span>
                    </label>
                    <input
                        id="contrib-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={status !== "idle"}
                        maxLength={100}
                        className={inputCls}
                        placeholder="How should we credit you?"
                        autoComplete="name"
                    />
                </div>

                {/* Message (optional) */}
                <div>
                    <label htmlFor="contrib-message" className="block text-xs text-slate-400 mb-1.5">
                        Message <span className="text-slate-600">(optional)</span>
                    </label>
                    <input
                        id="contrib-message"
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        disabled={status !== "idle"}
                        maxLength={500}
                        className={inputCls}
                        placeholder="Leave a note of encouragement…"
                    />
                </div>

                {/* Error message */}
                {status === "error" && errMsg && (
                    <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                        {errMsg}
                    </p>
                )}

                {/* Submit button */}
                <button
                    onClick={handlePay}
                    disabled={!canSubmit}
                    className="flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold text-white bg-gradient-to-br from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed transition-all rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                    {status === "creating" ? (
                        <><Spinner /> Creating order…</>
                    ) : status === "open" ? (
                        <><Spinner /> Checkout open…</>
                    ) : (
                        <>
                            Pay {amountValid ? `₹${amountNum.toLocaleString("en-IN")}` : ""}
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </>
                    )}
                </button>

                <p className="text-xs text-slate-500 text-center">
                    Secured by Razorpay · Your contribution goes directly to the creator.
                </p>
            </div>
        </>
    )
}

export default CampaignContributePanel
