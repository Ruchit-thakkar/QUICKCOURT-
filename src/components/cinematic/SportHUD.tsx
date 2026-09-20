"use client";

import { cn } from "@/lib/cn";

export function SportHUD({
  signal,
  radius,
  time,
  className,
}: {
  signal: string;
  radius: string;
  time: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none grid gap-2 text-[10px] uppercase tracking-[0.18em] text-white/70",
        className,
      )}
    >
      <div className="inline-flex w-fit items-center gap-2 border border-white/15 bg-black/40 px-3 py-2 backdrop-blur-md">
        <span className="h-1.5 w-1.5 rounded-full bg-qc-lime" />
        {signal}
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="border border-white/10 bg-black/35 px-3 py-2 backdrop-blur-md">
          {radius}
        </span>
        <span className="border border-white/10 bg-black/35 px-3 py-2 backdrop-blur-md">
          {time}
        </span>
      </div>
    </div>
  );
}
