import type { Sport, VideoAsset } from "@/types";

/**
 * Video asset configuration for cinematic scenes.
 *
 * Place files at:
 *   /public/videos/{sport}.mp4
 *   /public/videos/{sport}.webm   (optional — add `webm` field when present)
 *   /public/videos/posters/{sport}.svg|.webp
 *
 * Sources: Mixkit / Pexels / Pixabay / Coverr (royalty-free)
 * See scripts/download-videos.mjs and public/videos/README.md
 */
export const SPORT_VIDEOS: Record<Sport, VideoAsset> = {
  football: {
    id: "football",
    label: "FOOTBALL",
    src: "/videos/football.mp4",
    poster: "/videos/posters/football.svg",
    textSide: "left",
    demandLabel: "18 PLAYERS LOOKING NEARBY",
    cta: "BOOK A COURT",
    ctaHref: "#booking",
    hud: { radius: "5 KM", time: "8 PM", signal: "LIVE DEMAND" },
  },
  basketball: {
    id: "basketball",
    label: "BASKETBALL",
    src: "/videos/basketball.mp4",
    poster: "/videos/posters/basketball.svg",
    textSide: "right",
    demandLabel: "12 GAMES FORMING NEAR YOU",
    cta: "BOOK A COURT",
    ctaHref: "#booking",
    hud: { radius: "4 KM", time: "7 PM", signal: "HIGH DEMAND" },
  },
  cricket: {
    id: "cricket",
    label: "CRICKET",
    src: "/videos/cricket.mp4",
    poster: "/videos/posters/cricket.svg",
    textSide: "left",
    demandLabel: "9 ACTIVE GAMES NEAR YOU",
    cta: "BOOK A COURT",
    ctaHref: "#booking",
    hud: { radius: "6 KM", time: "6 PM", signal: "BAT SWING" },
  },
  badminton: {
    id: "badminton",
    label: "BADMINTON",
    src: "/videos/badminton.mp4",
    poster: "/videos/posters/badminton.svg",
    textSide: "right",
    demandLabel: "23 OPEN SPOTS NEAR YOU",
    cta: "BOOK A COURT",
    ctaHref: "#booking",
    hud: { radius: "3 KM", time: "9 PM", signal: "OPEN SPOTS" },
  },
  tennis: {
    id: "tennis",
    label: "TENNIS",
    src: "/videos/tennis.mp4",
    poster: "/videos/posters/tennis.svg",
    textSide: "left",
    demandLabel: "7 GAMES HAPPENING NEAR YOU",
    cta: "BOOK A COURT",
    ctaHref: "#booking",
    hud: { radius: "5 KM", time: "7:30 PM", signal: "LIVE RALLY" },
  },
};

export const SCENE_ORDER: Sport[] = [
  "football",
  "basketball",
  "cricket",
  "badminton",
  "tennis",
];

export function getVideoAsset(sport: Sport): VideoAsset {
  return SPORT_VIDEOS[sport];
}
