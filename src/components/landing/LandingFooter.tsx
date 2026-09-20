import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function LandingFooter() {
  return (
    <footer className="border-t border-white/8 bg-qc-black px-5 py-16 md:px-12 lg:px-20">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-display text-5xl text-qc-white md:text-6xl">
            QuickCourt
          </p>
          <p className="mt-3 max-w-sm text-sm text-qc-muted">
            Don&apos;t just book a court. Find your game.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button href="/player">Find a game</Button>
          <Button href="/owner" variant="secondary">
            Facility login
          </Button>
          <Button href="/admin" variant="ghost">
            Admin
          </Button>
        </div>
      </div>
      <div className="mx-auto mt-12 flex max-w-6xl flex-wrap gap-6 text-[11px] uppercase tracking-[0.16em] text-white/35">
        <Link href="/for-players">Players</Link>
        <Link href="/for-facilities">Facilities</Link>
        <Link href="/pricing">Pricing</Link>
        <span>Demo facilities are fictional</span>
      </div>
    </footer>
  );
}
