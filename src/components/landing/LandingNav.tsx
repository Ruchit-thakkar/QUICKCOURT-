"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const links = [
  { href: "/for-players", label: "For Players" },
  { href: "/for-facilities", label: "For Facilities" },
  { href: "/pricing", label: "Pricing" },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

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
          ? "border-b border-white/8 bg-qc-black/75 backdrop-blur-xl"
          : "bg-transparent",
      )}
    >
      <nav className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-5 md:h-20 md:px-8">
        <Link
          href="/"
          className="font-display text-2xl tracking-[0.08em] text-qc-white md:text-3xl"
        >
          QuickCourt
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[11px] uppercase tracking-[0.2em] text-white/65 transition hover:text-qc-white"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <Button href="/player" size="sm" className="hidden sm:inline-flex">
          Find a game
        </Button>

        <Button href="/player" size="sm" className="sm:hidden">
          Play
        </Button>
      </nav>
    </header>
  );
}
