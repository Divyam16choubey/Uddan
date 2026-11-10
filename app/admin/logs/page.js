import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import connectDb from "@/db/connectDb"
import User from "@/models/User"
import AdminNav from "@/components/AdminNav"
import AdminLogsClient from "./AdminLogsClient"

export const instant = false
export const metadata = { title: "Moderation History — Uddan" }

export default async function AdminLogsPage() {
    const session = await getServerSession(authOptions)
    if (!session) redirect("/login")

    await connectDb()
    const user = await User.findOne({ email: session.user.email }).lean()
    if (!user || user.role !== "admin") redirect("/dashboard")

    return (
        <div className="container mx-auto px-4 md:px-6 py-10 max-w-5xl">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-white">Moderation History</h1>
                <Link href="/dashboard"
                    className="text-sm text-slate-400 hover:text-white transition-colors shrink-0">
                    ← Back to User Dashboard
                </Link>
            </div>

            <AdminNav />
            <AdminLogsClient />
        </div>
    )
}
