"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { flowSteps } from "@/data/mock";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

gsap.registerPlugin(ScrollTrigger);

export function ProductTransition() {
  const ref = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (!ref.current || reduced) return;

    const ctx = gsap.context(() => {
      gsap.from("[data-flow-step]", {
        opacity: 0,
        y: 48,
        stagger: 0.12,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 70%",
        },
      });
    }, ref);

    return () => ctx.revert();
  }, [reduced]);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden border-t border-white/8 bg-qc-charcoal px-5 py-28 md:px-12 lg:px-20"
    >
      <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-qc-lime/10 blur-[100px]" />
      <div className="mx-auto max-w-6xl">
        <SectionLabel>Demand-first discovery</SectionLabel>
        <h2 className="mt-6 max-w-4xl font-display text-[12vw] leading-[0.88] text-qc-white md:text-7xl lg:text-8xl">
          Stop searching for a court.
          <br />
          <span className="text-qc-lime">Start finding a game.</span>
        </h2>

        <div className="mt-16 grid gap-0 md:grid-cols-5">
          {flowSteps.map((step, i) => (
            <div
              key={step}
              data-flow-step
              className="relative border-t border-white/10 py-8 md:border-l md:border-t-0 md:px-5 md:py-10 first:md:border-l-0"
            >
              <p className="text-[10px] tracking-[0.2em] text-qc-lime">
                0{i + 1}
              </p>
              <p className="mt-4 font-display text-2xl text-qc-white md:text-3xl">
                {step}
              </p>
              {i < flowSteps.length - 1 && (
                <span className="absolute -bottom-3 left-0 text-qc-lime md:bottom-auto md:right-0 md:top-1/2 md:-translate-y-1/2 md:translate-x-1/2">
                  ↓
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
