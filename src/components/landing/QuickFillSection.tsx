"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { quickFillFlow } from "@/data/mock";
import { Button } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { createQuickFillOffer } from "@/lib/api";
import { formatINR, formatPct } from "@/lib/format";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/cn";

gsap.registerPlugin(ScrollTrigger);

export function QuickFillSection() {
  const ref = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  const [released, setReleased] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ref.current || reduced) return;
    const ctx = gsap.context(() => {
      gsap.from("[data-qf-step]", {
        opacity: 0,
        x: -24,
        stagger: 0.1,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: { trigger: ref.current, start: "top 65%" },
      });
    }, ref);
    return () => ctx.revert();
  }, [reduced]);

  const release = async () => {
    setBusy(true);
    try {
      await createQuickFillOffer({ facility: "ABC Arena", slot: "8-9 PM" });
      setReleased(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      ref={ref}
      className="relative overflow-hidden border-t border-white/8 bg-qc-black px-5 py-28 md:px-12 lg:px-20"
    >
      <div className="pointer-events-none absolute right-0 top-0 h-[480px] w-[480px] bg-qc-lime/8 blur-[120px]" />
      <div className="mx-auto max-w-6xl">
        <SectionLabel>QuickFill</SectionLabel>
        <h2 className="mt-6 max-w-4xl font-display text-5xl leading-[0.9] text-qc-white md:text-7xl">
          Turn empty hours
          <br />
          into playing hours.
        </h2>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          <Panel title="Owner side">
            <p className="font-display text-4xl">ABC Arena</p>
            <p className="mt-2 text-sm text-qc-muted">8–9 PM</p>
            <p className="mt-6 text-[10px] uppercase tracking-[0.18em] text-qc-muted">
              Occupancy
            </p>
            <p className="font-display text-5xl text-white/50">20%</p>
            <p className="mt-4 inline-flex border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-red-300">
              Empty slot
            </p>
          </Panel>

          <Panel title="Player demand">
            <p className="font-display text-5xl text-qc-lime">18</p>
            <p className="mt-1 text-sm uppercase tracking-[0.14em] text-qc-muted">
              Players nearby
            </p>
            <p className="mt-6 text-sm text-qc-muted">Football · 8 PM</p>
            <p className="mt-4 inline-flex border border-qc-lime/30 bg-qc-lime/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-qc-lime">
              High demand
            </p>
          </Panel>

          <Panel title="System">
            <p className="text-[10px] uppercase tracking-[0.18em] text-qc-muted">
              Smart offer
            </p>
            <p className="mt-3 font-display text-4xl">
              <span className="text-white/35 line-through">{formatINR(800)}</span>
              <span className="ml-3 text-qc-lime">{formatINR(599)}</span>
            </p>
            <p className="mt-6 text-[10px] uppercase tracking-[0.18em] text-qc-muted">
              Expected occupancy
            </p>
            <p className="font-display text-5xl">{formatPct(72)}</p>
            <div className="mt-6">
              <Button onClick={release} disabled={busy || released} size="sm">
                {released ? "Offer live" : busy ? "Releasing…" : "Release smart offer"}
              </Button>
            </div>
          </Panel>
        </div>

        <div className="mt-14 flex flex-wrap items-center gap-3 md:gap-4">
          {quickFillFlow.map((step, i) => (
            <div key={step} data-qf-step className="flex items-center gap-3 md:gap-4">
              <span
                className={cn(
                  "border px-3 py-2 text-[10px] uppercase tracking-[0.16em] md:text-[11px]",
                  released && i === quickFillFlow.length - 1
                    ? "border-qc-lime/40 text-qc-lime"
                    : "border-white/12 text-qc-muted",
                )}
              >
                {step}
              </span>
              {i < quickFillFlow.length - 1 && (
                <span className="text-qc-lime/60">→</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-white/10 bg-qc-panel/80 p-6 backdrop-blur-sm">
      <p className="text-[10px] uppercase tracking-[0.2em] text-qc-muted">{title}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}
