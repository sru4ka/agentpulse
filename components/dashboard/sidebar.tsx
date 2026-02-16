"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    label: "Agents",
    href: "/dashboard/agents",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 17.5C3 14.4624 5.46243 12 8.5 12H11.5C14.5376 12 17 14.4624 17 17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Costs",
    href: "/dashboard/costs",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 2V18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M14 6C14 4.34315 12.2091 3 10 3C7.79086 3 6 4.34315 6 6C6 7.65685 7.79086 9 10 9C12.2091 9 14 10.3431 14 12C14 13.6569 12.2091 15 10 15C7.79086 15 6 13.6569 6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Alerts",
    href: "/dashboard/alerts",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 2L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M5 8C5 5.23858 7.23858 3 10 3C12.7614 3 15 5.23858 15 8V11L16.5 14H3.5L5 11V8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M8 14C8 15.1046 8.89543 16 10 16C11.1046 16 12 15.1046 12 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 1.5V4M10 16V18.5M18.5 10H16M4 10H1.5M16.01 3.99L14.24 5.76M5.76 14.24L3.99 16.01M16.01 16.01L14.24 14.24M5.76 5.76L3.99 3.99" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

interface SidebarProps {
  user?: { email?: string } | null;
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const handleSignOut = async () => {
    const { createBrowserSupabaseClient } = await import("@/lib/supabase");
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] bg-[#0A0A0B] border-r border-[#2A2A2D] flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 py-6">
        <div className="relative flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="14" cy="14" r="8" fill="#7C3AED" className="animate-pulse" />
            <circle cx="14" cy="14" r="12" stroke="#7C3AED" strokeWidth="1.5" strokeOpacity="0.4" className="animate-ping" />
          </svg>
        </div>
        <span className="text-[#FAFAFA] font-bold text-lg tracking-tight">AgentPulse</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 mt-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#7C3AED]/15 text-[#7C3AED]"
                      : "text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#141415]"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User / Sign Out */}
      <div className="px-4 py-4 border-t border-[#2A2A2D]">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#A1A1AA] truncate max-w-[140px]">
            {user?.email || "User"}
          </span>
          <button
            onClick={handleSignOut}
            className="text-xs text-[#A1A1AA] hover:text-[#EF4444] transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
