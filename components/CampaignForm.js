"use client"
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCampaign, updateCampaign } from '@/actions/campaignactions'
import { toast } from 'react-toastify'
import { Bounce } from 'react-toastify'

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
    "Technology",
    "Education",
    "Health",
    "Environment",
    "Arts & Culture",
    "Community",
    "Business",
    "Other",
]

// ── Shared input class — matches Dashboard.js conventions ────────────────────
const inputCls =
    "block w-full px-3 py-2.5 text-sm text-white bg-white/5 border border-white/15 " +
    "rounded-lg placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 " +
    "focus:border-transparent transition-colors hover:bg-white/10"

const textareaCls =
    "block w-full px-3 py-2.5 text-sm text-white bg-white/5 border border-white/15 " +
    "rounded-lg placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 " +
    "focus:border-transparent transition-colors hover:bg-white/10 resize-y min-h-[120px]"

// ── Sub-components ────────────────────────────────────────────────────────────

const Field = ({ label, hint, required, children }) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-200">
            {label}
            {required && <span className="text-red-400 ml-1" aria-hidden="true">*</span>}
        </label>
        {children}
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
)

const SectionTitle = ({ children }) => (
    <div className="flex items-center gap-3 pt-2 pb-1">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {children}
        </span>
        <div className="flex-1 h-px bg-white/10" />
    </div>
)

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Return today's date + 1 day formatted as yyyy-MM-dd for the min attribute */
function getMinDeadline() {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split("T")[0]
}

/** Format an ISO date string or Date to yyyy-MM-dd for <input type="date"> */
function toDateInputValue(value) {
    if (!value) return ""
    try {
        return new Date(value).toISOString().split("T")[0]
    } catch {
        return ""
    }
}

// ── Main Component ────────────────────────────────────────────────────────────

/**
 * CampaignForm
 *
 * Props:
 *   mode         "create" | "edit"
 *   initialData  Plain object with existing campaign fields (edit mode only)
 *   campaignId   MongoDB _id string (edit mode only)
 */
const CampaignForm = ({ mode = "create", initialData = {}, campaignId = null }) => {
    const router = useRouter()
    const isEdit = mode === "edit"

    const [form, setForm] = useState({
        title:       initialData.title       ?? "",
        description: initialData.description ?? "",
        category:    initialData.category    ?? "",
        coverImage:  initialData.coverImage  ?? "",
        goalAmount:  initialData.goalAmount  ?? "",
        deadline:    toDateInputValue(initialData.deadline),
        status:      initialData.status      ?? "active",
    })
    const [submitting, setSubmitting] = useState(false)
    const [imagePreviewError, setImagePreviewError] = useState(false)

    const handleChange = (e) => {
        const { name, value } = e.target
        setForm((prev) => ({ ...prev, [name]: value }))
        if (name === "coverImage") setImagePreviewError(false)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (submitting) return
        setSubmitting(true)

        // Build FormData to match the server action signature
        const fd = new FormData()
        Object.entries(form).forEach(([k, v]) => fd.append(k, v))

        const result = isEdit
            ? await updateCampaign(campaignId, fd)
            : await createCampaign(fd)

        setSubmitting(false)

        if (result?.error) {
            toast.error(result.error, {
                position: "top-right", autoClose: 5000, hideProgressBar: false,
                closeOnClick: true, pauseOnHover: true, draggable: true,
                theme: "dark", transition: Bounce,
            })
            return
        }

        toast.success(isEdit ? "Campaign updated!" : "Campaign created!", {
            position: "top-right", autoClose: 3000, hideProgressBar: false,
            closeOnClick: true, pauseOnHover: true, draggable: true,
            theme: "dark", transition: Bounce,
        })

        // Brief pause so the toast is visible before navigation
        setTimeout(() => router.push("/dashboard"), 1200)
    }

    const showPreview = form.coverImage && !imagePreviewError

    return (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* ── Campaign Details ─────────────────────────────────── */}
            <SectionTitle>Campaign Details</SectionTitle>

            <Field label="Campaign Title" required
                hint="Give your campaign a clear, compelling name (5–120 characters).">
                <input
                    type="text"
                    name="title"
                    id="title"
                    value={form.title}
                    onChange={handleChange}
                    className={inputCls}
                    placeholder="e.g. Help Fund My Open-Source Library"
                    maxLength={120}
                    required
                    autoComplete="off"
                />
            </Field>

            <Field label="Description" required
                hint="Describe your campaign, its goals, and why people should support it (20–2000 characters).">
                <textarea
                    name="description"
                    id="description"
                    value={form.description}
                    onChange={handleChange}
                    className={textareaCls}
                    placeholder="Tell your story — what are you building, why does it matter, and how will funding help?"
                    maxLength={2000}
                    required
                />
                <p className="text-xs text-slate-600 text-right -mt-1">
                    {form.description.length}/2000
                </p>
            </Field>

            <Field label="Category" required>
                <select
                    name="category"
                    id="category"
                    value={form.category}
                    onChange={handleChange}
                    className={`${inputCls} appearance-none`}
                    required
                >
                    <option value="" disabled className="bg-slate-900">
                        Select a category
                    </option>
                    {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat} className="bg-slate-900">
                            {cat}
                        </option>
                    ))}
                </select>
            </Field>

            <Field label="Cover Image URL"
                hint="Paste a direct image link (HTTPS). Supported formats: JPG, PNG, WebP, GIF.">
                <input
                    type="url"
                    name="coverImage"
                    id="coverImage"
                    value={form.coverImage}
                    onChange={handleChange}
                    className={inputCls}
                    placeholder="https://example.com/campaign-cover.jpg"
                    autoComplete="off"
                />
                {/* Live preview */}
                {showPreview && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-white/10 h-40 bg-white/5">
                        <img
                            src={form.coverImage}
                            alt="Cover preview"
                            className="w-full h-full object-cover"
                            onError={() => setImagePreviewError(true)}
                        />
                    </div>
                )}
                {form.coverImage && imagePreviewError && (
                    <p className="text-xs text-amber-400 mt-1">
                        Could not load preview — check that the URL points directly to an image.
                    </p>
                )}
            </Field>

            {/* ── Funding Details ──────────────────────────────────── */}
            <SectionTitle>Funding Details</SectionTitle>

            <Field label="Funding Goal (₹)" required
                hint="Minimum ₹100. This is your target; supporters can contribute any amount.">
                <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-sm pointer-events-none">
                        ₹
                    </span>
                    <input
                        type="number"
                        name="goalAmount"
                        id="goalAmount"
                        value={form.goalAmount}
                        onChange={handleChange}
                        className={`${inputCls} pl-7`}
                        placeholder="50000"
                        min="100"
                        max="10000000"
                        step="1"
                        required
                    />
                </div>
            </Field>

            <Field label="Campaign Deadline" required
                hint="The date by which you aim to reach your goal. Must be a future date.">
                <input
                    type="date"
                    name="deadline"
                    id="deadline"
                    value={form.deadline}
                    onChange={handleChange}
                    className={`${inputCls} [color-scheme:dark]`}
                    min={isEdit ? undefined : getMinDeadline()}
                    required
                />
            </Field>

            {/* Status selector — only shown in edit mode */}
            {isEdit && (
                <>
                    <SectionTitle>Campaign Status</SectionTitle>
                    <Field label="Status"
                        hint="Use 'Draft' to hide from public view. 'Active' accepts support. 'Expired' disables new support.">
                        <select
                            name="status"
                            id="status"
                            value={form.status}
                            onChange={handleChange}
                            className={`${inputCls} appearance-none`}
                        >
                            <option value="draft"   className="bg-slate-900">Draft</option>
                            <option value="active"  className="bg-slate-900">Active</option>
                            <option value="expired" className="bg-slate-900">Expired</option>
                        </select>
                    </Field>
                </>
            )}

            {/* ── Submit ───────────────────────────────────────────── */}
            <div className="pt-2">
                <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                    {submitting ? (
                        <>
                            <svg className="animate-spin w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                            </svg>
                            {isEdit ? "Saving…" : "Creating…"}
                        </>
                    ) : (
                        isEdit ? "Save Changes" : "Create Campaign"
                    )}
                </button>
            </div>

            <p className="text-xs text-slate-500 text-center">
                Fields marked <span className="text-red-400">*</span> are required.
            </p>

        </form>
    )
}

export default CampaignForm
