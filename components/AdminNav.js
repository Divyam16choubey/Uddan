"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

const NavLink = ({ href, active, children }) => (
    <Link
        href={href}
        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            active
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-white/10"
        }`}
    >
        {children}
    </Link>
)

const AdminNav = () => {
    const pathname = usePathname()

    const links = [
        { href: "/admin",          label: "Overview",   icon: "📊" },
        { href: "/admin/campaigns", label: "Campaigns", icon: "📋" },
        { href: "/admin/users",    label: "Users",      icon: "👥" },
        { href: "/admin/logs",     label: "History",    icon: "📜" },
    ]

    return (
        <div className="flex gap-2 overflow-x-auto mb-6 bg-white/5 border border-white/10 rounded-xl p-1">
            {links.map((link) => {
                const active = pathname === link.href
                return (
                    <NavLink key={link.href} href={link.href} active={active}>
                        <span>{link.icon}</span>
                        {link.label}
                    </NavLink>
                )
            })}
        </div>
    )
}

export default AdminNav
