"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  CalendarDays,
  LayoutDashboard,
  Megaphone,
  Radar,
  Settings2,
  Ticket,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/cn";

const links = [
  { href: "/owner", label: "Overview", icon: LayoutDashboard },
  { href: "/owner/facilities", label: "Facilities", icon: Building2 },
  { href: "/owner/courts", label: "Courts", icon: Settings2 },
  { href: "/owner/slots", label: "Slots", icon: CalendarDays },
  { href: "/owner/bookings", label: "Bookings", icon: Ticket },
  { href: "/owner/customers", label: "Customers", icon: Users },
  { href: "/owner/demand", label: "Demand", icon: Radar },
  { href: "/owner/offers", label: "Offers", icon: Megaphone },
  { href: "/owner/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/owner/subscription", label: "Subscription", icon: Wallet },
];

export function OwnerSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-white/8 bg-qc-charcoal lg:block">
      <div className="sticky top-0 flex h-screen flex-col px-4 py-6">
        <Link href="/owner" className="font-display text-2xl tracking-wide">
          QuickCourt
        </Link>
        <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-qc-muted">
          Facility OS
        </p>
        <nav className="mt-8 space-y-1 overflow-y-auto qc-scrollbar">
          {links.map((link) => {
            const active =
              pathname === link.href ||
              (link.href !== "/owner" && pathname.startsWith(link.href));
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-sm transition",
                  active
                    ? "bg-qc-lime/10 text-qc-lime"
                    : "text-white/60 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/"
          className="mt-auto border border-white/10 px-3 py-2 text-center text-[10px] uppercase tracking-[0.16em] text-qc-muted hover:text-white"
        >
          Back to site
        </Link>
      </div>
    </aside>
  );
}
