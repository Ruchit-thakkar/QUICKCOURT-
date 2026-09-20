/**
 * Downloads royalty-free sports footage into /public/videos
 * Sources: Mixkit (Stock Video Free License)
 *
 * Run: npm run videos
 */

import { createWriteStream, existsSync, mkdirSync, statSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const videosDir = path.join(root, "public", "videos");
mkdirSync(path.join(videosDir, "posters"), { recursive: true });

/** Working Mixkit CDN pattern: /videos/{id}/{id}-720.mp4 */
const ASSETS = [
  {
    id: "football",
    // Player dribbling in a one-on-one soccer game
    url: "https://assets.mixkit.co/videos/43484/43484-720.mp4",
    fallbacks: [
      "https://assets.mixkit.co/videos/42530/42530-720.mp4",
      "https://assets.mixkit.co/videos/43514/43514-720.mp4",
    ],
  },
  {
    id: "basketball",
    // Basketball player dribbling
    url: "https://assets.mixkit.co/videos/744/744-720.mp4",
    fallbacks: [
      "https://assets.mixkit.co/videos/22854/22854-720.mp4",
      "https://assets.mixkit.co/videos/1170/1170-720.mp4",
    ],
  },
  {
    id: "cricket",
    // Cinematic bat swing (licensed Mixkit sports batting footage)
    url: "https://assets.mixkit.co/videos/853/853-720.mp4",
    fallbacks: [
      "https://assets.mixkit.co/videos/23452/23452-720.mp4",
      "https://assets.mixkit.co/videos/26242/26242-720.mp4",
    ],
  },
  {
    id: "badminton",
    // Badminton players with racket movement
    url: "https://assets.mixkit.co/videos/13038/13038-720.mp4",
    fallbacks: [
      "https://assets.mixkit.co/videos/13037/13037-720.mp4",
    ],
  },
  {
    id: "tennis",
    // Tennis serve
    url: "https://assets.mixkit.co/videos/878/878-720.mp4",
    fallbacks: [
      "https://assets.mixkit.co/videos/876/876-720.mp4",
      "https://assets.mixkit.co/videos/4011/4011-720.mp4",
    ],
  },
];

async function download(url, dest) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Referer: "https://mixkit.co/",
      Accept: "video/mp4,*/*",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get("content-type") || "";
  if (type.includes("text/html")) throw new Error("HTML response");
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

async function tryDownload(asset) {
  const dest = path.join(videosDir, `${asset.id}.mp4`);
  if (existsSync(dest) && statSync(dest).size > 50_000) {
    console.log(`✓ ${asset.id}.mp4 already present`);
    return true;
  }
  for (const url of [asset.url, ...(asset.fallbacks || [])]) {
    try {
      console.log(`↓ ${asset.id} ← ${url}`);
      await download(url, dest);
      console.log(`✓ saved ${asset.id}.mp4 (${statSync(dest).size} bytes)`);
      return true;
    } catch (err) {
      console.warn(`  failed: ${err.message}`);
    }
  }
  console.error(`✗ could not download ${asset.id}`);
  return false;
}

async function main() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  let ok = 0;
  for (const asset of ASSETS) {
    if (await tryDownload(asset)) ok += 1;
  }
  console.log(`\nDone: ${ok}/${ASSETS.length} videos.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
