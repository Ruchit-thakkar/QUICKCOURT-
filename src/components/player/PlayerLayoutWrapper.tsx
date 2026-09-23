"use client";

import { usePathname } from "next/navigation";
import { PlayerNavbar } from "@/components/player/PlayerNavbar";

export function PlayerLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthPage =
    pathname === "/player/login" || pathname === "/player/signup";

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-qc-black text-qc-white">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-qc-black text-qc-white">
      <PlayerNavbar />
      <main className="flex-1 pb-24 md:pb-12">{children}</main>
      <footer className="hidden md:block border-t border-white/8 py-8 text-center text-xs text-white/40">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} QuickCourt. Demand-first sports venue discovery.</p>
          <div className="flex items-center gap-6">
            <span className="text-[10px] uppercase tracking-widest text-qc-lime">
              Player Discovery Platform
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
