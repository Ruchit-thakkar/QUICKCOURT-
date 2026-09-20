"use client";

import { games, facilities, quickFillOffers } from "@/data/mock";
import { GameCard } from "@/components/ui/FacilityCard";
import { QuickFillCard } from "@/components/ui/Cards";
import { FacilityCard } from "@/components/ui/FacilityCard";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Search } from "lucide-react";

export default function PlayerHomePage() {
  return (
    <div className="space-y-10">
      <header>
        <p className="text-sm text-qc-muted">Good evening 👋</p>
        <h1 className="mt-2 font-display text-5xl text-qc-white md:text-6xl">
          Ready to play?
        </h1>
        <div className="mt-6 flex items-center gap-3 border border-white/10 bg-qc-panel px-4 py-3">
          <Search className="h-4 w-4 text-qc-muted" />
          <input
            placeholder="Search sport, facility or game"
            className="w-full bg-transparent text-sm outline-none placeholder:text-white/30"
          />
        </div>
      </header>

      <section>
        <SectionLabel live>Games near you</SectionLabel>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {games.slice(0, 4).map((g) => (
            <GameCard
              key={g.id}
              title={g.sport.toUpperCase()}
              meta={`${g.time} · ${g.facilityName}`}
              progress={`${g.playersJoined}/${g.playersNeeded} players · ${g.matchPct}% match`}
              href="/player/games"
            />
          ))}
        </div>
      </section>

      <section>
        <SectionLabel>QuickFill offers</SectionLabel>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickFillOffers.map((o) => (
            <QuickFillCard key={o.id} offer={o} />
          ))}
        </div>
      </section>

      <section>
        <SectionLabel>Recommended games</SectionLabel>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {games.slice(1, 3).map((g) => (
            <GameCard
              key={g.id}
              title={g.sport.toUpperCase()}
              meta={`${g.date} · ${g.time}`}
              progress={`${g.skill} · ₹${g.pricePerPlayer}/player`}
              href="/player/games"
            />
          ))}
        </div>
      </section>

      <section>
        <SectionLabel>Popular facilities</SectionLabel>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {facilities.slice(0, 4).map((f) => (
            <FacilityCard key={f.id} facility={f} />
          ))}
        </div>
      </section>

      <section>
        <SectionLabel>Upcoming games</SectionLabel>
        <div className="mt-4 space-y-3">
          {games.slice(0, 2).map((g) => (
            <div
              key={g.id}
              className="flex items-center justify-between border border-white/10 bg-qc-panel px-4 py-4"
            >
              <div>
                <p className="font-display text-2xl capitalize">{g.sport}</p>
                <p className="text-sm text-qc-muted">
                  {g.date} · {g.time}
                </p>
              </div>
              <p className="text-qc-lime">{g.playersJoined}/{g.playersNeeded}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
