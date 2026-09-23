"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Ticket,
  BarChart3,
  Users,
  Grid3X3,
  Boxes,
  UserCog,
  Building2,
  Settings,
  LogOut,
  Menu,
  X,
  Loader2,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuth } from "@/context/AuthContext";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  disabled?: boolean;
}

const navItems: NavItem[] = [
  { href: "/owner/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/owner/bookings", label: "Bookings", icon: Ticket },
  { href: "/owner/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/owner/ai", label: "AI Assistant", icon: Sparkles, badge: "AI" },
  { href: "/owner/customers", label: "Customers", icon: Users },
  { href: "/owner/courts", label: "Courts & Pricing", icon: Grid3X3 },
  { href: "/owner/business-profile", label: "Business Profile", icon: Building2 },
  { href: "/owner/inventory", label: "Inventory", icon: Boxes },
  { href: "/owner/staff", label: "Staff", icon: UserCog },
  { href: "/owner/settings", label: "Settings", icon: Settings },
];

export function OwnerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ownerProfile, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      router.push("/owner/login");
    } finally {
      setLoggingOut(false);
    }
  };

  const displayName = ownerProfile?.name || user?.displayName || user?.email?.split("@")[0] || "Facility Owner";
  const displayEmail = ownerProfile?.email || user?.email || "";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-white/8 bg-qc-charcoal lg:flex lg:flex-col">
      <div className="sticky top-0 flex h-screen flex-col px-4 py-6">
        {/* Brand */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/owner/dashboard" className="font-display text-2xl tracking-wide text-qc-white hover:text-qc-lime transition">
              QuickCourt
            </Link>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-qc-lime font-medium">
              Owner Portal
            </p>
          </div>
          <span className="border border-qc-lime/30 bg-qc-lime/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-qc-lime">
            Phase 2
          </span>
        </div>

        {/* Navigation */}
        <nav className="mt-8 flex-1 space-y-1 overflow-y-auto qc-scrollbar">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/owner/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center justify-between px-3 py-2.5 text-sm transition",
                  active
                    ? "bg-qc-lime/10 text-qc-lime font-medium border-l-2 border-qc-lime"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("h-4 w-4 shrink-0", active ? "text-qc-lime" : "text-white/40 group-hover:text-white")} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/40">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Footer */}
        <div className="mt-auto border-t border-white/8 pt-4 space-y-3">
          {/* Owner Profile Card */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-qc-lime/40 bg-qc-lime/15 text-qc-lime font-display text-base">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-qc-white">
                {displayName}
              </p>
              <p className="truncate text-[10px] text-qc-muted">
                {displayEmail}
              </p>
            </div>
          </div>

          {/* Action Links */}
          <div className="flex flex-col gap-1.5 pt-1">
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs uppercase tracking-[0.14em] text-red-400/80 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
            >
              {loggingOut ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LogOut className="h-3.5 w-3.5" />
              )}
              <span>{loggingOut ? "Logging out..." : "Log Out"}</span>
            </button>

            <Link
              href="/"
              target="_blank"
              className="flex items-center justify-between border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-qc-muted transition hover:border-white/20 hover:text-qc-white"
            >
              <span>View Public Site</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function OwnerMobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, ownerProfile, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      setOpen(false);
      router.push("/owner/login");
    } finally {
      setLoggingOut(false);
    }
  };

  const displayName = ownerProfile?.name || user?.displayName || "Facility Owner";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/8 bg-qc-charcoal px-4 lg:hidden">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setOpen(!open)}
          className="flex h-9 w-9 items-center justify-center border border-white/15 bg-qc-panel text-qc-white"
          aria-label="Toggle navigation menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div>
          <Link href="/owner/dashboard" className="font-display text-xl text-qc-white">
            QuickCourt
          </Link>
          <span className="ml-2 text-[9px] uppercase tracking-[0.16em] text-qc-lime font-medium">
            Owner
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center border border-qc-lime/30 bg-qc-lime/10 text-xs font-display text-qc-lime">
          {initial}
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {open && (
        <div
          className="fixed inset-0 top-16 z-50 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        >
          <div
            className="h-full w-4/5 max-w-xs border-r border-white/10 bg-qc-charcoal p-5 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 border-b border-white/8 pb-4">
              <p className="font-display text-lg text-qc-white">{displayName}</p>
              <p className="truncate text-xs text-qc-muted">{user?.email}</p>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/owner/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 text-sm transition",
                      active
                        ? "bg-qc-lime/10 text-qc-lime font-medium border-l-2 border-qc-lime"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="border border-white/10 bg-white/5 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-white/40">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-8 border-t border-white/8 pt-4 space-y-2">
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs uppercase tracking-[0.14em] text-red-400 transition hover:bg-red-500/10"
              >
                {loggingOut ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <LogOut className="h-3.5 w-3.5" />
                )}
                <span>{loggingOut ? "Logging out..." : "Log Out"}</span>
              </button>

              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="block border border-white/10 px-3 py-2 text-center text-[10px] uppercase tracking-[0.16em] text-qc-muted hover:text-white"
              >
                Public Homepage
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
