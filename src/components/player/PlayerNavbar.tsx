"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  Compass,
  Heart,
  User,
  Home,
  LogOut,
  Building2,
  Menu,
  X,
  Sparkles,
  CalendarCheck,
  Activity,
} from "lucide-react";

export function PlayerNavbar() {
  const pathname = usePathname();
  const { user, playerProfile, role, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: "Home", href: "/player", icon: Home },
    { label: "Discover", href: "/player/discover", icon: Compass },
    { label: "Bookings", href: "/player/bookings", icon: CalendarCheck },
    { label: "Activity", href: "/player/activity", icon: Activity },
    { label: "Favorites", href: "/player/favorites", icon: Heart },
    { label: "Profile", href: "/player/profile", icon: User },
  ];

  return (
    <>
      {/* Top Header for Desktop & Mobile */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-qc-black/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            <Link
              href="/player"
              className="flex items-center gap-2 group"
            >
              <div className="flex h-9 w-9 items-center justify-center border border-qc-lime/40 bg-qc-charcoal group-hover:border-qc-lime transition">
                <span className="font-display text-xl tracking-wider text-qc-lime">QC</span>
              </div>
              <div>
                <span className="font-display text-2xl tracking-[0.08em] text-qc-white">
                  QuickCourt
                </span>
                <span className="ml-2 rounded border border-qc-lime/30 bg-qc-lime/10 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-qc-lime">
                  Play
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/player"
                    ? pathname === "/player"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] transition",
                      isActive
                        ? "text-qc-lime border-b-2 border-qc-lime"
                        : "text-white/60 hover:text-qc-white hover:bg-white/5"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3">
            {/* AI Assistant Link */}
            <Link
              href="/player/ai"
              className="flex items-center gap-1.5 border border-qc-lime/40 bg-qc-lime/10 px-2.5 sm:px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-qc-lime hover:bg-qc-lime hover:text-qc-black transition"
            >
              <Sparkles className="h-3.5 w-3.5 text-qc-lime group-hover:text-qc-black" />
              <span className="hidden sm:inline">AI Assistant</span>
              <span className="sm:hidden">AI</span>
            </Link>

            {/* Facility Portal switch */}
            <Link
              href="/owner/login"
              className="hidden lg:flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-white/50 hover:text-qc-lime transition border border-white/10 px-3 py-1.5 bg-qc-panel"
            >
              <Building2 className="h-3 w-3 text-qc-lime" />
              Venue Owners
            </Link>

            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/player/profile"
                  className="flex items-center gap-2 border border-white/10 bg-qc-panel px-3 py-1.5 transition hover:border-qc-lime/40"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-qc-lime/20 text-qc-lime text-xs font-bold">
                    {(playerProfile?.name || user.displayName || "P")[0].toUpperCase()}
                  </div>
                  <span className="hidden sm:inline text-xs font-medium text-qc-white truncate max-w-[120px]">
                    {playerProfile?.name || user.displayName || "Player"}
                  </span>
                </Link>
                <button
                  onClick={() => logout()}
                  title="Log out"
                  className="flex h-9 w-9 items-center justify-center border border-white/10 bg-qc-panel text-white/60 hover:text-red-400 hover:border-red-400/40 transition"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button href="/player/login" variant="ghost" size="sm" className="text-xs">
                  Sign In
                </Button>
                <Button href="/player/signup" size="sm" className="text-xs">
                  Join Free
                </Button>
              </div>
            )}

            {/* Mobile menu toggle for extra links */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center border border-white/10 bg-qc-panel text-white/70 hover:text-qc-white md:hidden"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-white/10 bg-qc-charcoal/95 px-5 py-4 backdrop-blur-xl md:hidden">
            <div className="flex flex-col space-y-3">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 text-xs uppercase tracking-[0.16em] py-2 border-b border-white/5",
                    pathname.startsWith(item.href) ? "text-qc-lime" : "text-white/70"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
              <Link
                href="/owner/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-qc-lime/80 py-2"
              >
                <Building2 className="h-4 w-4 text-qc-lime" />
                Venue Owner Portal →
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Bottom Navigation Bar (Fixed) */}
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-qc-charcoal/95 backdrop-blur-xl md:hidden shadow-2xl">
        <div className="grid grid-cols-6 h-16">
          {navItems.map((item) => {
            const isActive =
              item.href === "/player"
                ? pathname === "/player"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 transition px-0.5",
                  isActive
                    ? "text-qc-lime"
                    : "text-white/50 hover:text-qc-white"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[9px] font-medium tracking-wider uppercase truncate max-w-full">
                  {item.label}
                </span>
                {isActive && (
                  <span className="h-0.5 w-3 bg-qc-lime rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
