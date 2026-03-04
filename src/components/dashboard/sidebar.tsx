"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOutAction } from "@/actions/auth"

interface DashboardSidebarProps {
  userEmail: string
}

export function DashboardSidebar({ userEmail }: DashboardSidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => pathname === href

  return (
    <aside className="w-64 min-h-screen bg-espresso flex flex-col">
      {/* Logo */}
      <div className="px-6 py-8">
        <span className="font-playfair font-black text-2xl text-milk">
          Brief<span className="text-beeswax-deep">.</span>
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-4 space-y-1">
        <Link
          href="/dashboard"
          className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            isActive("/dashboard")
              ? "border-l-2 border-beeswax text-beeswax pl-[10px]"
              : "text-brief-muted hover:text-milk"
          }`}
        >
          Briefings
        </Link>
        <Link
          href="/dashboard/settings"
          className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            isActive("/dashboard/settings")
              ? "border-l-2 border-beeswax text-beeswax pl-[10px]"
              : "text-brief-muted hover:text-milk"
          }`}
        >
          Settings
        </Link>
      </nav>

      {/* User info + sign out */}
      <div className="px-4 py-6 border-t border-warm-brown/30 space-y-3">
        <p className="text-brief-muted text-sm truncate px-3">{userEmail}</p>
        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full text-left px-3 py-1.5 text-sm text-brief-muted hover:text-milk transition-colors rounded-md hover:bg-warm-brown/20"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
