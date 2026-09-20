"use client";

import { SportsSceneController } from "@/components/cinematic/SportsSceneController";

/**
 * CinematicHero wraps the signature scroll-driven sports film.
 * Football opens as the first full-viewport scene; scroll advances scenes.
 */
export function CinematicHero() {
  return <SportsSceneController />;
}
