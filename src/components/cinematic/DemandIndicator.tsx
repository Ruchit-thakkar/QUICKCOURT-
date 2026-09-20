"use client";

import { cn } from "@/lib/cn";

export function DemandIndicator({
  players,
  sport,
  className,
}: {
  players: number;
  sport: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border border-white/12 bg-black/50 px-4 py-3 backdrop-blur-xl",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-qc-lime">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-qc-lime opacity-50" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-qc-lime" />
        </span>
        LIVE
      </div>
      <p className="mt-2 font-display text-3xl leading-none text-qc-white">
        {players} PLAYERS
      </p>
      <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-qc-muted">
        Looking for {sport}
      </p>
      <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-white/40">
        Nearby
      </p>
    </div>
  );
}
