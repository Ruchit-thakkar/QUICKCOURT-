"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { games, players } from "@/data/mock";
import { Button } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { joinGame } from "@/lib/api";
import { formatINR } from "@/lib/format";

export default function PlayerGamesPage() {
  const [counts, setCounts] = useState(
    Object.fromEntries(games.map((g) => [g.id, g.playersJoined])),
  );

  const onJoin = async (id: string) => {
    const res = await joinGame(id);
    setCounts((c) => ({ ...c, [id]: res.playersJoined }));
  };

  return (
    <div className="space-y-8">
      <header>
        <SectionLabel live>Games</SectionLabel>
        <h1 className="mt-3 font-display text-5xl">Forming near you</h1>
      </header>

      <div className="space-y-4">
        {games.map((g) => (
          <article key={g.id} className="border border-white/10 bg-qc-panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl uppercase">{g.sport}</h2>
                <p className="mt-1 text-sm text-qc-muted">
                  {g.facilityName} · {g.date} · {g.time}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.14em] text-qc-dim">
                  {g.skill} · {formatINR(g.pricePerPlayer)}/player
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-4xl text-qc-lime">
                  <motion.span key={counts[g.id]} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {counts[g.id]}
                  </motion.span>
                  /{g.playersNeeded}
                </p>
                <p className="text-[10px] uppercase tracking-[0.16em] text-qc-muted">
                  {g.matchPct}% match
                </p>
              </div>
            </div>
            <div className="mt-4 flex -space-x-2">
              {players.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className="flex h-8 w-8 items-center justify-center border border-qc-black bg-qc-elevated text-[10px]"
                >
                  {p.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
              ))}
            </div>
            <div className="mt-5">
              <Button size="sm" onClick={() => onJoin(g.id)}>
                Join game
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
