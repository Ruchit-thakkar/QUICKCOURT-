"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { Menu, X, Shield } from "lucide-react";

const links = [
  { href: "/player", label: "Find Courts" },
  { href: "#film", label: "Film" },
  { href: "#demand", label: "Demand" },
  { href: "#booking", label: "Booking" },
  { href: "/owner/login", label: "Facility Portal" },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled
          ? "border-b border-white/8 bg-qc-black/85 backdrop-blur-xl shadow-lg"
          : "bg-transparent",
      )}
    >
      <nav className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-5 md:h-20 md:px-8">
        <Link
          href="/"
          className="font-display text-2xl tracking-[0.08em] text-qc-white transition hover:text-qc-lime md:text-3xl"
        >
          QuickCourt
        </Link>

        {/* Desktop Links */}
        <div className="hidden items-center gap-8 md:flex">
          {links.map((link) => {
            const isOwner = link.href.includes("/owner");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-[11px] uppercase tracking-[0.2em] transition hover:text-qc-white flex items-center gap-1.5",
                  isOwner
                    ? "text-qc-lime/80 hover:text-qc-lime font-medium"
                    : "text-white/65 hover:text-qc-white"
                )}
              >
                {isOwner && <Shield className="h-3 w-3 text-qc-lime" />}
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="hidden items-center gap-3 sm:flex">
          <Button href="/owner/login" variant="ghost" size="sm" className="text-xs">
            Facility Login
          </Button>
          <Button href="/owner/signup" size="sm">
            List Facility
          </Button>
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 sm:hidden">
          <Button href="/owner/login" size="sm" className="h-8 px-3 text-[10px]">
            Portal
          </Button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-8 w-8 items-center justify-center border border-white/15 bg-qc-panel text-qc-white"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-b border-white/10 bg-qc-charcoal/95 px-5 py-6 backdrop-blur-xl md:hidden">
          <div className="flex flex-col space-y-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs uppercase tracking-[0.2em] text-white/80 transition hover:text-qc-lime"
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-white/10 pt-4 flex flex-col gap-2">
              <Button
                href="/owner/login"
                variant="secondary"
                size="sm"
                className="w-full justify-center"
              >
                Owner / Facility Login
              </Button>
              <Button
                href="/owner/signup"
                size="sm"
                className="w-full justify-center"
              >
                List Facility
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
