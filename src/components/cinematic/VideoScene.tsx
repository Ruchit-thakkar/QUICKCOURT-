"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type VideoSceneProps = {
  src: string;
  webm?: string;
  poster: string;
  active: boolean;
  className?: string;
  objectPosition?: string;
  scale?: number;
};

export function VideoScene({
  src,
  webm,
  poster,
  active,
  className,
  objectPosition = "center center",
  scale = 1,
}: VideoSceneProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);

  const playSafe = useCallback(async () => {
    const el = videoRef.current;
    if (!el) return;
    try {
      el.muted = true;
      await el.play();
    } catch {
      // Autoplay can fail; poster remains visible.
    }
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (active && !failed) {
      playSafe();
    } else {
      el.pause();
      try {
        el.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
  }, [active, failed, playSafe]);

  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-qc-black", className)}>
      {!failed ? (
        <video
          ref={videoRef}
          className="h-full w-full object-cover will-change-transform"
          style={{
            objectPosition,
            transform: `scale(${scale})`,
          }}
          muted
          loop
          playsInline
          preload={active ? "auto" : "none"}
          poster={posterFailed ? undefined : poster}
          onError={() => setFailed(true)}
          aria-hidden
        >
          {webm && <source src={webm} type="video/webm" />}
          <source src={src} type="video/mp4" />
        </video>
      ) : !posterFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          className="h-full w-full object-cover"
          style={{ objectPosition, transform: `scale(${scale})` }}
          onError={() => setPosterFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-qc-ink via-qc-black to-qc-panel">
          <div className="text-center">
            <p className="font-display text-5xl text-white/20">QUICKCOURT</p>
            <p className="mt-2 text-xs tracking-[0.2em] text-qc-dim">
              VIDEO UNAVAILABLE
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
