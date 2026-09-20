/**
 * Generates simple WebP/PNG poster placeholders if ffmpeg isn't available.
 * Creates SVG posters that the VideoScene can use as fallbacks.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const postersDir = path.join(__dirname, "..", "public", "videos", "posters");
mkdirSync(postersDir, { recursive: true });

const sports = [
  { id: "football", label: "FOOTBALL", accent: "#c8f542" },
  { id: "basketball", label: "BASKETBALL", accent: "#c8f542" },
  { id: "cricket", label: "CRICKET", accent: "#c8f542" },
  { id: "badminton", label: "BADMINTON", accent: "#c8f542" },
  { id: "tennis", label: "TENNIS", accent: "#c8f542" },
];

for (const s of sports) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#050505"/>
      <stop offset="50%" stop-color="#101010"/>
      <stop offset="100%" stop-color="#151515"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#g)"/>
  <circle cx="1320" cy="540" r="220" fill="none" stroke="${s.accent}" stroke-opacity="0.25" stroke-width="2"/>
  <circle cx="1320" cy="540" r="120" fill="none" stroke="${s.accent}" stroke-opacity="0.4" stroke-width="2"/>
  <text x="120" y="520" fill="#f5f5f0" font-family="Arial Black, sans-serif" font-size="120">${s.label}</text>
  <text x="120" y="600" fill="${s.accent}" font-family="Arial, sans-serif" font-size="28" letter-spacing="8">QUICKCOURT</text>
</svg>`;
  // Store as .webp path expected by app — browsers accept SVG if served correctly,
  // but we also write .svg and a copy named .webp as SVG bytes for graceful fallback.
  writeFileSync(path.join(postersDir, `${s.id}.svg`), svg);
  writeFileSync(path.join(postersDir, `${s.id}.webp`), svg);
  console.log(`poster ${s.id}`);
}
