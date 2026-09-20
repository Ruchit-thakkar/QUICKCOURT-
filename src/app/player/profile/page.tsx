"use client";

import { players } from "@/data/mock";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";

export default function PlayerProfilePage() {
  const player = players[0];

  return (
    <div className="space-y-8">
      <header className="flex items-end gap-5">
        <div className="flex h-20 w-20 items-center justify-center bg-qc-panel font-display text-3xl">
          AM
        </div>
        <div>
          <SectionLabel>Profile</SectionLabel>
          <h1 className="mt-2 font-display text-4xl md:text-5xl">{player.name}</h1>
          <p className="text-sm text-qc-muted">{player.location}</p>
        </div>
      </header>

      <section className="border border-qc-lime/25 bg-qc-lime/5 p-6">
        <p className="text-[10px] uppercase tracking-[0.2em] text-qc-lime">
          PlayScore
        </p>
        <p className="mt-2 font-display text-7xl text-qc-white">{player.playScore}</p>
        <p className="mt-3 max-w-lg text-sm text-qc-muted">
          PlayScore reflects reliability, punctuality, sportsmanship, and games
          completed. Higher scores unlock priority matching and QuickFill access.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Stat label="Games played" value={player.gamesPlayed} />
        <Stat label="Games joined" value={player.gamesJoined} />
      </section>

      <section>
        <SectionLabel>Sports identity</SectionLabel>
        <div className="mt-4 space-y-3">
          {player.sports.map((sport) => (
            <div
              key={sport}
              className="flex items-center justify-between border border-white/10 bg-qc-panel px-4 py-3"
            >
              <span className="capitalize">{sport}</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-qc-lime">
                {player.skillLevels[sport]}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionLabel>Privacy</SectionLabel>
        <div className="mt-4 space-y-3 border border-white/10 bg-qc-panel p-5 text-sm text-qc-muted">
          <ToggleRow label="Show profile to nearby players" on />
          <ToggleRow label="Share PlayScore on game cards" on />
          <ToggleRow label="Allow facility marketing offers" />
        </div>
        <div className="mt-4">
          <Button variant="secondary" size="sm">
            Save privacy settings
          </Button>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-white/10 bg-qc-panel p-5">
      <p className="text-[10px] uppercase tracking-[0.16em] text-qc-muted">
        {label}
      </p>
      <p className="mt-2 font-display text-4xl">{value}</p>
    </div>
  );
}

function ToggleRow({ label, on }: { label: string; on?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/8 pb-3 last:border-0 last:pb-0">
      <span>{label}</span>
      <span
        className={`h-5 w-9 ${on ? "bg-qc-lime" : "bg-white/15"} relative`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 bg-qc-black transition ${
            on ? "right-0.5" : "left-0.5"
          }`}
        />
      </span>
    </div>
  );
}
