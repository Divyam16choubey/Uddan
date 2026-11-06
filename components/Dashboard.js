"use client"
import React, { useEffect, useState } from 'react'
import { useSession } from "next-auth/react"
import { useRouter } from 'next/navigation'
import { fetchuser, updateProfile } from '@/actions/useractions'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Bounce } from 'react-toastify';

/* ── Shared input class ───────────────────────────────────────────────────── */
const inputCls =
    "block w-full px-3 py-2.5 text-sm text-white bg-white/5 border border-white/15 " +
    "rounded-lg placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 " +
    "focus:border-transparent transition-colors hover:bg-white/10"

const readOnlyCls =
    "block w-full px-3 py-2.5 text-sm text-slate-400 bg-white/[0.03] border border-white/10 " +
    "rounded-lg cursor-not-allowed"

/* ── Field wrapper ────────────────────────────────────────────────────────── */
const Field = ({ label, hint, children }) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-200">
            {label}
        </label>
        {children}
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
)

/* ── Section divider ─────────────────────────────────────────────────────── */
const SectionTitle = ({ children }) => (
    <div className="flex items-center gap-3 pt-2 pb-1">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{children}</span>
        <div className="flex-1 h-px bg-white/10" />
    </div>
)

const Dashboard = () => {
    const { data: session, update } = useSession()
    const router = useRouter()
    const [form, setform] = useState({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!session) {
            router.push('/login')
        } else {
            ;(async () => {
                const u = await fetchuser(session.user.name)
                if (u) setform(u)
                setLoading(false)
            })()
        }
    }, [session, router])

    const handleChange = (e) => {
        setform({ ...form, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (formData) => {
        setSaving(true)
        const result = await updateProfile(formData, session.user.name)
        setSaving(false)

        if (result?.error) {
            toast.error(result.error, {
                position: "top-right", autoClose: 5000, hideProgressBar: false,
                closeOnClick: true, pauseOnHover: true, draggable: true,
                theme: "dark", transition: Bounce,
            });
        } else {
            await update()
            toast.success('Profile updated!', {
                position: "top-right", autoClose: 4000, hideProgressBar: false,
                closeOnClick: true, pauseOnHover: true, draggable: true,
                theme: "dark", transition: Bounce,
            });
        }
    }

    /* ── Loading skeleton ─────────────────────────────────────────────── */
    if (loading) {
        return (
            <div className="container mx-auto py-10 px-6 max-w-2xl">
                <div className="h-8 w-56 bg-white/10 rounded-lg mx-auto mb-8 animate-pulse" />
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 space-y-5">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="space-y-2">
                            <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                            <div className="h-10 w-full bg-white/10 rounded-lg animate-pulse" />
                        </div>
                    ))}
                    <div className="h-10 w-full bg-blue-900/40 rounded-lg animate-pulse mt-4" />
                </div>
            </div>
        )
    }

    return (
        <>
            <ToastContainer
                position="top-right" autoClose={5000} hideProgressBar={false}
                newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss
                draggable pauseOnHover theme="dark" />

            <div className="container mx-auto py-10 px-6 max-w-2xl">
                <h1 className="text-center text-2xl md:text-3xl font-bold mb-8">
                    Your Dashboard
                </h1>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
                    <form action={handleSubmit} className="space-y-4">

                        <SectionTitle>Profile</SectionTitle>

                        <Field label="Name">
                            <input
                                value={form.name ?? ""}
                                onChange={handleChange}
                                type="text" name="name" id="name"
                                className={inputCls}
                                placeholder="Your display name"
                                autoComplete="name"
                            />
                        </Field>

                        <Field label="Email" hint="Email is managed by your OAuth provider and cannot be changed here.">
                            <input
                                value={form.email ?? ""}
                                readOnly type="email" name="email" id="email"
                                className={readOnlyCls}
                                tabIndex={-1}
                            />
                        </Field>

                        <Field label="Username" hint="Used in your public page URL: uddan.app/username">
                            <input
                                value={form.username ?? ""}
                                onChange={handleChange}
                                type="text" name="username" id="username"
                                className={inputCls}
                                placeholder="your-username"
                                autoComplete="username"
                            />
                        </Field>

                        <SectionTitle>Appearance</SectionTitle>

                        <Field label="Profile Picture URL" hint="Paste the full URL of your profile photo (HTTPS).">
                            <input
                                value={form.profilepic ?? ""}
                                onChange={handleChange}
                                type="url" name="profilepic" id="profilepic"
                                className={inputCls}
                                placeholder="https://example.com/avatar.jpg"
                            />
                        </Field>

                        <Field label="Cover Picture URL" hint="Paste the full URL of your cover/banner image (HTTPS).">
                            <input
                                value={form.coverpic ?? ""}
                                onChange={handleChange}
                                type="url" name="coverpic" id="coverpic"
                                className={inputCls}
                                placeholder="https://example.com/cover.jpg"
                            />
                        </Field>

                        <SectionTitle>Payment</SectionTitle>

                        <Field label="Razorpay Key ID" hint="Your Razorpay Key ID starting with rzp_">
                            <input
                                value={form.razorpayid ?? ""}
                                onChange={handleChange}
                                type="text" name="razorpayid" id="razorpayid"
                                className={inputCls}
                                placeholder="rzp_test_xxxxxxxxxxxx"
                                autoComplete="off"
                            />
                        </Field>

                        <Field label="Razorpay Key Secret" hint="Never share this. Stored securely and never exposed publicly.">
                            <input
                                value={form.razorpaysecret ?? ""}
                                onChange={handleChange}
                                type="password" name="razorpaysecret" id="razorpaysecret"
                                className={inputCls}
                                placeholder="••••••••••••••••"
                                autoComplete="off"
                            />
                        </Field>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                            >
                                {saving ? (
                                    <>
                                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                        </svg>
                                        Saving…
                                    </>
                                ) : "Save Changes"}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </>
    )
}

export default Dashboard
