# QuickCourt

**Don't just book a court. Find your game.**

Cinematic sports-tech product — demand-first player discovery + facility SaaS with QuickFill.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Framer Motion + GSAP ScrollTrigger
- Lucide React + Recharts

## Run

```bash
npm install
npm run videos    # download Mixkit sports footage into public/videos
npm run posters   # generate poster fallbacks
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes

| Path | Experience |
|------|------------|
| `/` | Cinematic landing + product story |
| `/player` | Player app (home, explore, games, bookings, profile) |
| `/owner` | Facility SaaS (KPIs, demand, QuickFill, analytics, billing) |
| `/admin` | Platform admin |
| `/pricing` | Owner plans |
| `/for-players` · `/for-facilities` | Audience pages |

## Videos

Real moving footage (not Ken Burns):

- `public/videos/football.mp4`
- `public/videos/basketball.mp4`
- `public/videos/cricket.mp4`
- `public/videos/badminton.mp4`
- `public/videos/tennis.mp4`

Only the active scroll scene plays. Poster fallbacks live in `public/videos/posters/`.

Licensed Mixkit stock — see `public/videos/README.md`.

| Sport | Mixkit source |
|-------|----------------|
| Football | Player dribbling one-on-one (#43484) |
| Basketball | Player dribbling (#744) |
| Cricket | Cinematic bat-swing sports footage (#853) |
| Badminton | Players with racket action (#13038) |
| Tennis | Player serve (#878) |

## Architecture notes

- Mock data in `src/data/mock.ts`
- Future API surface in `src/lib/api.ts`
- Map is Mapbox-ready via `MapView` (`NEXT_PUBLIC_MAPBOX_TOKEN`)
- `prefers-reduced-motion` simplifies the scroll film
