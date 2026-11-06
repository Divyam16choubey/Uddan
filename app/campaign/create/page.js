import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import CampaignForm from "@/components/CampaignForm"
import Link from "next/link"

export const instant = false

export const metadata = {
    title: "Create Campaign — Uddan",
}

export default async function CreateCampaignPage() {
    // Server-side auth guard — unauthenticated users go straight to /login
    const session = await getServerSession(authOptions)
    if (!session) {
        redirect("/login")
    }

    return (
        <div className="container mx-auto px-4 py-10 max-w-2xl">
            {/* Toast container lives here so the client form can fire toasts */}
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
                    Start a New Campaign
                </h1>
                <p className="text-slate-400 text-sm mt-2">
                    Fill in the details below to launch your fundraising campaign on Uddan.
                </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
                <CampaignForm mode="create" />
            </div>
        </div>
    )
}
