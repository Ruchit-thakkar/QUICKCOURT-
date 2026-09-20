"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DemandIndicator } from "@/components/cinematic/DemandIndicator";
import { SportTransition } from "@/components/cinematic/SportTransition";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { SCENE_ORDER, SPORT_VIDEOS } from "@/lib/videos";
import type { Sport } from "@/types";
import { cn } from "@/lib/cn";

gsap.registerPlugin(ScrollTrigger);

export function SportsSceneController() {
  const pinRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [scales, setScales] = useState<number[]>(SCENE_ORDER.map(() => 1.05));
  const [opacities, setOpacities] = useState<number[]>(
    SCENE_ORDER.map((_, i) => (i === 0 ? 1 : 0)),
  );
  const [blurs, setBlurs] = useState<number[]>(SCENE_ORDER.map(() => 0));
  const [clips, setClips] = useState<string[]>(
    SCENE_ORDER.map((_, i) =>
      i === 0 ? "inset(0% 0% 0% 0%)" : "inset(0% 0% 0% 100%)",
    ),
  );

  useEffect(() => {
    if (!pinRef.current) return;

    if (reduced) {
      setOpacities(SCENE_ORDER.map(() => 1));
      setClips(SCENE_ORDER.map(() => "inset(0% 0% 0% 0%)"));
      setScales(SCENE_ORDER.map(() => 1));
      return;
    }

    const ctx = gsap.context(() => {
      const totalScenes = SCENE_ORDER.length;

      ScrollTrigger.create({
        trigger: pinRef.current,
        start: "top top",
        end: `+=${totalScenes * 100}%`,
        pin: true,
        scrub: 1.1,
        anticipatePin: 1,
        onUpdate: (self) => {
          const p = self.progress;
          const raw = p * (totalScenes - 0.0001);
          const index = Math.min(totalScenes - 1, Math.floor(raw));
          const local = raw - index;
          setActiveIndex(index);
          setProgress(local);

          const nextOpacities = SCENE_ORDER.map((_, i) => {
            if (i === index) return 1 - local * 0.15;
            if (i === index + 1) return local;
            if (i < index) return 0;
            return 0;
          });

          const nextScales = SCENE_ORDER.map((_, i) => {
            if (i === index) return 1.05 + local * 0.08;
            if (i === index + 1) return 1.12 - local * 0.07;
            return 1.05;
          });

          const nextBlurs = SCENE_ORDER.map((_, i) => {
            if (i === index) return local * 8;
            if (i === index + 1) return (1 - local) * 10;
            return 0;
          });

          const nextClips = SCENE_ORDER.map((_, i) => {
            if (i === index) {
              const shrink = local * 12;
              return `inset(${shrink}% ${shrink * 0.4}% ${shrink}% ${shrink * 0.4}% round 0px)`;
            }
            if (i === index + 1) {
              const reveal = (1 - local) * 100;
              // Alternating reveal direction for cinematic variety
              if (index % 2 === 0) {
                return `inset(0% 0% 0% ${reveal}%)`;
              }
              return `inset(${reveal}% 0% 0% 0%)`;
            }
            if (i < index) return "inset(50% 50% 50% 50%)";
            return "inset(0% 0% 0% 100%)";
          });

          setOpacities(nextOpacities);
          setScales(nextScales);
          setBlurs(nextBlurs);
          setClips(nextClips);
        },
      });
    }, pinRef);

    return () => ctx.revert();
  }, [reduced]);

  if (reduced) {
    return (
      <section id="film" className="bg-qc-black">
        {SCENE_ORDER.map((sport) => (
          <div key={sport} className="relative min-h-[100svh]">
            <SportTransition
              asset={SPORT_VIDEOS[sport]}
              active
              showHeroCopy={sport === "football"}
            />
          </div>
        ))}
      </section>
    );
  }

  return (
    <section id="film" ref={pinRef} className="relative h-[100svh] bg-qc-black">
      {SCENE_ORDER.map((sport, i) => {
        const active = i === activeIndex;
        return (
          <div
            key={sport}
            className={cn(
              "absolute inset-0 will-change-[opacity,transform,filter,clip-path]",
              active ? "z-10" : "z-[5]",
            )}
            style={{
              opacity: opacities[i],
              filter: `blur(${blurs[i]}px)`,
              clipPath: clips[i],
            }}
          >
            <SportTransition
              asset={SPORT_VIDEOS[sport]}
              active={active}
              progress={active ? progress : 0}
              showHeroCopy={sport === "football" && activeIndex === 0}
              scale={scales[i]}
            />
          </div>
        );
      })}

      {activeIndex === 0 && (
        <div className="pointer-events-none absolute bottom-28 right-5 z-30 md:bottom-16 md:right-12 lg:right-20">
          <DemandIndicator players={18} sport="Football" />
        </div>
      )}

      <div className="absolute right-5 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-3 md:flex">
        {SCENE_ORDER.map((sport: Sport, i) => (
          <div
            key={sport}
            className={cn(
              "h-8 w-px transition-all duration-500",
              i === activeIndex ? "bg-qc-lime scale-y-125" : "bg-white/20",
            )}
          />
        ))}
      </div>
    </section>
  );
}
