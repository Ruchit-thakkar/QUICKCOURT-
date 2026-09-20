"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheck2,
  Compass,
  Home,
  UserRound,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/cn";

const items = [
  { href: "/player", label: "Home", icon: Home },
  { href: "/player/explore", label: "Explore", icon: Compass },
  { href: "/player/games", label: "Games", icon: UsersRound },
  { href: "/player/bookings", label: "Bookings", icon: CalendarCheck2 },
  { href: "/player/profile", label: "Profile", icon: UserRound },
];

export function PlayerNavbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-qc-black/90 backdrop-blur-xl md:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2 py-2">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/player" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-1 py-1 text-[10px] uppercase tracking-[0.12em]",
                  active ? "text-qc-lime" : "text-white/45",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function PlayerTopBar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-qc-black/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:h-16 md:px-6">
        <Link href="/player" className="font-display text-xl tracking-wide md:text-2xl">
          QuickCourt
        </Link>
        <div className="hidden items-center gap-6 md:flex">
          {items.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/player" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-[11px] uppercase tracking-[0.18em]",
                  active ? "text-qc-lime" : "text-white/55 hover:text-white",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        <Link
          href="/"
          className="text-[10px] uppercase tracking-[0.16em] text-qc-muted hover:text-white"
        >
          Exit
        </Link>
      </div>
    </header>
  );
}
