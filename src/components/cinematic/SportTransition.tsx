"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { VideoAsset } from "@/types";
import { Button } from "@/components/ui/Button";
import { SportHUD } from "@/components/cinematic/SportHUD";
import { VideoScene } from "@/components/cinematic/VideoScene";
import { cn } from "@/lib/cn";

type SportSceneProps = {
  asset: VideoAsset;
  active: boolean;
  progress?: number;
  showHeroCopy?: boolean;
  scale?: number;
};

export function SportTransition({
  asset,
  active,
  progress = 0,
  showHeroCopy = false,
  scale = 1,
}: SportSceneProps) {
  const isLeft = asset.textSide === "left";

  return (
    <div
      className={cn(
        "absolute inset-0",
        active ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!active}
    >
      <VideoScene
        src={asset.src}
        webm={asset.webm}
        poster={asset.poster}
        active={active}
        scale={scale}
        objectPosition={isLeft ? "70% center" : "30% center"}
      />

      <div
        className={cn(
          "absolute inset-0",
          isLeft ? "qc-video-overlay" : "qc-video-overlay-right",
        )}
      />

      <div className="relative z-10 flex h-full min-h-[100svh] flex-col justify-end px-5 pb-24 pt-28 md:justify-center md:px-12 lg:px-20 lg:pb-16">
        <div
          className={cn(
            "max-w-xl",
            isLeft ? "mr-auto" : "ml-auto text-right",
            isLeft ? "" : "flex flex-col items-end",
          )}
          style={{
            transform: `translateY(${progress * -40}px)`,
            opacity: active ? 1 - progress * 0.35 : 0,
          }}
        >
          {!showHeroCopy && (
            <>
              <motion.p
                initial={false}
                animate={{ opacity: active ? 1 : 0, y: active ? 0 : 24 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="text-[11px] uppercase tracking-[0.28em] text-qc-lime"
              >
                Scene · {asset.label}
              </motion.p>
              <motion.h2
                initial={false}
                animate={{ opacity: active ? 1 : 0, y: active ? 0 : 40 }}
                transition={{ duration: 0.85, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="mt-4 font-display text-[18vw] leading-[0.85] text-qc-white md:text-[9vw] lg:text-[7.5vw]"
              >
                {asset.label}
              </motion.h2>
              <motion.p
                initial={false}
                animate={{ opacity: active ? 1 : 0, y: active ? 0 : 20 }}
                transition={{ duration: 0.7, delay: 0.12 }}
                className="mt-4 text-sm uppercase tracking-[0.18em] text-white/70 md:text-base"
              >
                {asset.demandLabel}
              </motion.p>
              <div className={cn("mt-8", !isLeft && "flex justify-end")}>
                <SportHUD
                  signal={asset.hud.signal}
                  radius={asset.hud.radius}
                  time={asset.hud.time}
                  className={!isLeft ? "justify-items-end" : undefined}
                />
              </div>
              <div className={cn("mt-8", !isLeft && "flex justify-end")}>
                <Button href={asset.ctaHref} size="lg">
                  {asset.cta}
                </Button>
              </div>
            </>
          )}

          {showHeroCopy && (
            <>
              <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-qc-lime">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-qc-lime opacity-50" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-qc-lime" />
                </span>
                Live demand near you
              </p>
              <h1 className="mt-6 font-display text-[18vw] leading-[0.82] text-qc-white md:text-[9.5vw] lg:text-[8vw]">
                Your game
                <br />
                is waiting.
              </h1>
              <p className="mt-6 max-w-md text-base text-white/70 md:text-lg">
                Find the players. Find the court. Make the game happen.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Button href="/player" size="lg">
                  Find my game
                </Button>
                <Button href="/for-facilities" variant="secondary" size="lg">
                  List your facility
                </Button>
              </div>
              <p className="mt-4 text-xs text-white/40">
                Tagline: Don&apos;t just book a court. Find your game.
              </p>
            </>
          )}
        </div>
      </div>

      {showHeroCopy && (
        <Link
          href="#film"
          className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-white/55"
        >
          Scroll to enter
          <span className="relative h-10 w-px overflow-hidden bg-white/20">
            <span className="absolute inset-x-0 top-0 h-1/2 animate-[scrollHint_1.6s_ease-in-out_infinite] bg-qc-lime" />
          </span>
        </Link>
      )}
    </div>
  );
}
