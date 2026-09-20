"use client";

import { facilities } from "@/data/mock";
import { FacilityCard } from "@/components/ui/FacilityCard";
import { MapView } from "@/components/map/MapView";
import { SectionLabel } from "@/components/ui/SectionLabel";

export function FacilityMatchingSection() {
  const matched = facilities.slice(0, 3);

  return (
    <section className="border-t border-white/8 bg-qc-black px-5 py-28 md:px-12 lg:px-20">
      <div className="mx-auto max-w-6xl">
        <SectionLabel>Facility matching</SectionLabel>
        <h2 className="mt-6 font-display text-5xl text-qc-white md:text-7xl">
          We found your court.
        </h2>
        <p className="mt-4 text-sm uppercase tracking-[0.16em] text-qc-muted">
          3 courts match your game.
        </p>

        <div className="mt-12 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            {matched.map((f) => (
              <FacilityCard key={f.id} facility={f} cta="Choose court" />
            ))}
          </div>
          <MapView
            markers={matched.map((f) => ({
              id: f.id,
              label: f.name,
              lat: f.lat,
              lng: f.lng,
              kind: "facility" as const,
            }))}
          />
        </div>
      </div>
    </section>
  );
}
