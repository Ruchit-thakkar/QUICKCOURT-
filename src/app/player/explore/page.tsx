"use client";

import { useMemo, useState } from "react";
import { facilities, games } from "@/data/mock";
import { FacilityCard, GameCard } from "@/components/ui/FacilityCard";
import { MapView } from "@/components/map/MapView";
import { SectionLabel } from "@/components/ui/SectionLabel";
import type { Sport } from "@/types";
import { cn } from "@/lib/cn";

const sports: Array<Sport | "all"> = [
  "all",
  "football",
  "basketball",
  "cricket",
  "badminton",
  "tennis",
];

export default function ExplorePage() {
  const [sport, setSport] = useState<Sport | "all">("all");
  const [maxPrice, setMaxPrice] = useState(800);
  const [maxDistance, setMaxDistance] = useState(10);

  const filteredFacilities = useMemo(
    () =>
      facilities.filter(
        (f) =>
          (sport === "all" || f.sports.includes(sport)) &&
          f.priceFrom <= maxPrice &&
          f.distanceKm <= maxDistance,
      ),
    [sport, maxPrice, maxDistance],
  );

  const filteredGames = useMemo(
    () => games.filter((g) => sport === "all" || g.sport === sport),
    [sport],
  );

  return (
    <div className="space-y-8">
      <header>
        <SectionLabel>Explore</SectionLabel>
        <h1 className="mt-3 font-display text-5xl">Find facilities & games</h1>
      </header>

      <div className="flex flex-wrap gap-2">
        {sports.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSport(s)}
            className={cn(
              "border px-3 py-1.5 text-[10px] uppercase tracking-[0.16em]",
              sport === s
                ? "border-qc-lime/40 text-qc-lime"
                : "border-white/10 text-qc-muted",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="border border-white/10 bg-qc-panel p-4 text-sm">
          <span className="text-[10px] uppercase tracking-[0.16em] text-qc-muted">
            Max price ₹{maxPrice}
          </span>
          <input
            type="range"
            min={200}
            max={1200}
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            className="mt-3 w-full accent-qc-lime"
          />
        </label>
        <label className="border border-white/10 bg-qc-panel p-4 text-sm">
          <span className="text-[10px] uppercase tracking-[0.16em] text-qc-muted">
            Distance {maxDistance} km
          </span>
          <input
            type="range"
            min={1}
            max={15}
            value={maxDistance}
            onChange={(e) => setMaxDistance(Number(e.target.value))}
            className="mt-3 w-full accent-qc-lime"
          />
        </label>
      </div>

      <MapView
        markers={[
          ...filteredFacilities.map((f) => ({
            id: f.id,
            label: f.name,
            lat: f.lat,
            lng: f.lng,
            kind: "facility" as const,
          })),
          ...filteredGames.slice(0, 3).map((g, i) => ({
            id: g.id,
            label: g.sport,
            lat: 19.06 + i * 0.02,
            lng: 72.84 + i * 0.015,
            kind: "game" as const,
          })),
        ]}
        filters={
          <span className="border border-white/10 bg-black/70 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white/70">
            Sport · Price · Distance · Time · Rating
          </span>
        }
      />

      <section>
        <SectionLabel>Facilities</SectionLabel>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {filteredFacilities.map((f) => (
            <FacilityCard key={f.id} facility={f} />
          ))}
        </div>
      </section>

      <section>
        <SectionLabel>Games</SectionLabel>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {filteredGames.map((g) => (
            <GameCard
              key={g.id}
              title={g.sport.toUpperCase()}
              meta={`${g.time} · ${g.facilityName}`}
              progress={`${g.playersJoined}/${g.playersNeeded}`}
              href="/player/games"
            />
          ))}
        </div>
      </section>
    </div>
  );
}
