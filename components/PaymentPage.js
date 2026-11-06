"use client"
import React, { useEffect, useState } from 'react'
import Script from 'next/script'
import { fetchuser, fetchpayments, initiate } from '@/actions/useractions'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Bounce } from 'react-toastify';
import { useRouter } from 'next/navigation'

const PaymentPage = ({ username }) => {
    const [paymentform, setPaymentform] = useState({ name: "", message: "", amount: "" })
    const [currentUser, setCurrentUser] = useState(null)
    const [payments, setPayments] = useState([])
    const [loadingData, setLoadingData] = useState(true)
    const searchParams = useSearchParams()
    const router = useRouter()

    /* ── Initial data load ──────────────────────────────────────────── */
    useEffect(() => {
        ;(async () => {
            const [u, dbpayments] = await Promise.all([
                fetchuser(username),
                fetchpayments(username),
            ])
            setCurrentUser(u)
            setPayments(dbpayments)
            setLoadingData(false)
        })()
    }, [username])

    /* ── Payment-done toast — only when query param is present ─────── */
    useEffect(() => {
        if (searchParams.get("paymentdone") === "true") {
            toast.success('Thanks for your contribution! 🎉', {
                position: "top-right", autoClose: 5000, hideProgressBar: false,
                closeOnClick: true, pauseOnHover: true, draggable: true,
                theme: "dark", transition: Bounce,
            });
            // Remove the query param without a full reload
            router.replace(`/${username}`)
        }
    }, [searchParams, username, router])

    const handleChange = (e) => {
        setPaymentform({ ...paymentform, [e.target.name]: e.target.value })
    }

    const pay = async (amount) => {
        let a = await initiate(amount, username, paymentform)
        let orderId = a.id
        var options = {
            "key": currentUser.razorpayid,
            "amount": amount,
            "currency": "INR",
            "name": "Uddan",
            "description": "Support " + username,
            "image": "https://example.com/your_logo",
            "order_id": orderId,
            "callback_url": `${process.env.NEXT_PUBLIC_URL}/api/razorpay`,
            "prefill": {
                "name": "Gaurav Kumar",
                "email": "gaurav.kumar@example.com",
                "contact": "9000090000"
            },
            "notes": { "address": "Razorpay Corporate Office" },
            "theme": { "color": "#3b82f6" }
        }
        var rzp1 = new Razorpay(options);
        rzp1.open();
    }

    const payDisabled =
        !paymentform.name || paymentform.name.length < 3 ||
        !paymentform.message || paymentform.message.length < 4 ||
        !paymentform.amount || paymentform.amount.length < 1

    /* ── Loading skeleton ───────────────────────────────────────────── */
    if (loadingData) {
        return (
            <div>
                {/* Cover skeleton */}
                <div className="w-full h-48 md:h-72 bg-white/10 animate-pulse" />
                <div className="flex flex-col items-center mt-20 gap-3 px-4">
                    <div className="h-5 w-32 bg-white/10 rounded animate-pulse" />
                    <div className="h-4 w-56 bg-white/10 rounded animate-pulse" />
                    <div className="h-4 w-40 bg-white/10 rounded animate-pulse" />
                </div>
            </div>
        )
    }

    const totalRaised = payments.reduce((a, b) => a + b.amount, 0)

    return (
        <>
            <ToastContainer
                position="top-right" autoClose={5000} hideProgressBar={false}
                newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss
                draggable pauseOnHover theme="dark" />
            <Script src="https://checkout.razorpay.com/v1/checkout.js" />

            {/* ── Cover + Profile pic ──────────────────────────────── */}
            <div className="relative w-full">
                {/* Cover image — dark gradient fallback when no image */}
                <div className="w-full h-48 md:h-72 bg-gradient-to-br from-blue-950 to-slate-900 overflow-hidden">
                    {currentUser?.coverpic && (
                        <img
                            className="w-full h-full object-cover"
                            src={currentUser.coverpic}
                            alt={`${username} cover`}
                        />
                    )}
                </div>

                {/* Profile pic — centred horizontally */}
                <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 size-28 rounded-full border-4 border-[#00091d] overflow-hidden bg-slate-800 shadow-xl">
                    {currentUser?.profilepic ? (
                        <img
                            className="w-full h-full object-cover"
                            src={currentUser.profilepic}
                            alt={`${username} avatar`}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-slate-400">
                            {username.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
            </div>

            {/* ── User info ────────────────────────────────────────── */}
            <div className="flex flex-col items-center mt-20 mb-10 gap-1.5 px-4 text-center">
                <h1 className="font-bold text-xl text-white">@{username}</h1>
                <p className="text-slate-400 text-sm">
                    Support {username} and help make their dreams come true!
                </p>
                <p className="text-slate-500 text-xs mt-1">
                    <span className="text-slate-300 font-medium">{payments.length}</span> supporter{payments.length !== 1 ? "s" : ""}
                    &nbsp;·&nbsp;
                    <span className="text-slate-300 font-medium">₹{totalRaised.toLocaleString("en-IN")}</span> raised
                </p>
            </div>

            {/* ── Two-column layout ────────────────────────────────── */}
            <div className="flex flex-col md:flex-row gap-4 w-full max-w-5xl mx-auto px-4 pb-16">

                {/* Supporters leaderboard */}
                <div className="w-full md:w-1/2 bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Top Supporters
                    </h2>

                    {payments.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-8 text-center">
                            <img src="/avatar.gif" width={48} alt="" className="opacity-40" />
                            <p className="text-slate-400 text-sm">No supporters yet.</p>
                            <p className="text-slate-500 text-xs">Be the first to contribute!</p>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {payments.map((p, i) => (
                                <li key={i} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                                    <img
                                        width={32} height={32}
                                        src="/avatar.gif"
                                        alt="avatar"
                                        className="rounded-full shrink-0 mt-0.5"
                                    />
                                    <div className="text-sm leading-snug">
                                        <span className="font-medium text-white">{p.name}</span>
                                        <span className="text-slate-400"> donated </span>
                                        <span className="font-semibold text-green-400">₹{p.amount.toLocaleString("en-IN")}</span>
                                        {p.message && (
                                            <span className="text-slate-400"> — &quot;{p.message}&quot;</span>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Payment form */}
                <div className="w-full md:w-1/2 bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h2 className="text-lg font-bold mb-4">Make a Payment</h2>

                    <div className="flex flex-col gap-3">
                        <input
                            onChange={handleChange}
                            value={paymentform.name}
                            name="name"
                            type="text"
                            className="w-full px-3 py-2.5 text-sm rounded-lg bg-white/10 border border-white/15 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                            placeholder="Your name"
                        />
                        <input
                            onChange={handleChange}
                            value={paymentform.message}
                            name="message"
                            type="text"
                            className="w-full px-3 py-2.5 text-sm rounded-lg bg-white/10 border border-white/15 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                            placeholder="Leave a message"
                        />
                        <input
                            onChange={handleChange}
                            value={paymentform.amount}
                            name="amount"
                            type="number"
                            min="1"
                            className="w-full px-3 py-2.5 text-sm rounded-lg bg-white/10 border border-white/15 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                            placeholder="Amount (₹)"
                        />

                        <button
                            onClick={() => pay(Number.parseInt(paymentform.amount) * 100)}
                            type="button"
                            disabled={payDisabled}
                            className="w-full py-3 text-sm font-semibold rounded-lg bg-gradient-to-br from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                            Pay ₹{paymentform.amount || "—"}
                        </button>
                    </div>

                    {/* Quick-pay */}
                    <div className="mt-4">
                        <p className="text-xs text-slate-500 mb-2">Quick amounts</p>
                        <div className="flex gap-2 flex-wrap">
                            {[10, 20, 50, 100].map((amt) => (
                                <button
                                    key={amt}
                                    onClick={() => pay(amt * 100)}
                                    className="px-4 py-2 text-sm rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                                >
                                    ₹{amt}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </>
    )
}

export default PaymentPage
