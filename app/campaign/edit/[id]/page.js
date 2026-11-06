import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect, notFound } from "next/navigation"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import CampaignForm from "@/components/CampaignForm"
import Link from "next/link"
import { getCampaignById } from "@/actions/campaignactions"

export const instant = false

export const metadata = {
    title: "Edit Campaign — Uddan",
}

// params is a Promise in Next.js 15/16 — must be awaited
export default async function EditCampaignPage({ params }) {
    const session = await getServerSession(authOptions)
    if (!session) {
        redirect("/login")
    }

    const { id } = await params

    const result = await getCampaignById(id)

    if (result.error === "Campaign not found") {
        notFound()
    }

    if (result.error) {
        // Covers "Unauthorised" and unexpected errors — redirect to dashboard
        redirect("/dashboard")
    }

    const campaign = result.campaign

    // Completed campaigns cannot be edited — bounce back with the campaign
    // status displayed in the dashboard
    if (campaign.status === "completed") {
        redirect("/dashboard")
    }

    return (
        <div className="container mx-auto px-4 py-10 max-w-2xl">
            <ToastContainer
                position="top-right" autoClose={5000} hideProgressBar={false}
                newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss
                draggable pauseOnHover theme="dark"
            />

            {/* Back link */}
            <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
            </Link>

            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                    Edit Campaign
                </h1>
                <p className="text-slate-400 text-sm mt-2 truncate">
                    {campaign.title}
                </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
                <CampaignForm
                    mode="edit"
                    initialData={campaign}
                    campaignId={campaign._id}
                />
            </div>
        </div>
    )
}
