"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { games, players } from "@/data/mock";
import { Button } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { joinGame } from "@/lib/api";
import { formatINR } from "@/lib/format";

export function GameMatchingSection() {
  const game = games[0];
  const [joined, setJoined] = useState(game.playersJoined);
  const [busy, setBusy] = useState(false);

  const onJoin = async () => {
    if (joined >= game.playersNeeded || busy) return;
    setBusy(true);
    try {
      const res = await joinGame(game.id);
      setJoined(res.playersJoined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="border-t border-white/8 bg-qc-ink px-5 py-28 md:px-12 lg:px-20">
      <div className="mx-auto max-w-6xl">
        <SectionLabel live>Game matching</SectionLabel>
        <h2 className="mt-6 font-display text-5xl text-qc-white md:text-7xl">
          Your game is forming.
        </h2>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="border border-white/10 bg-qc-panel p-6 md:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-display text-5xl text-qc-white">
                  {game.sport.toUpperCase()}
                </p>
                <p className="mt-2 text-sm uppercase tracking-[0.16em] text-qc-muted">
                  {game.time} · {game.facilityName}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-5xl text-qc-lime">
                  <motion.span
                    key={joined}
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                  >
                    {joined}
                  </motion.span>
                  /{game.playersNeeded}
                </p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-qc-muted">
                  Players
                </p>
              </div>
            </div>

            <div className="mt-8 h-2 overflow-hidden bg-white/10">
              <motion.div
                className="h-full bg-qc-lime"
                animate={{ width: `${(joined / game.playersNeeded) * 100}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              />
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <div className="flex -space-x-3">
                {players.slice(0, 5).map((p) => (
                  <div
                    key={p.id}
                    className="flex h-10 w-10 items-center justify-center border border-qc-black bg-qc-elevated text-xs font-medium"
                    title={p.name}
                  >
                    {p.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                ))}
              </div>
              <p className="text-sm text-qc-muted">
                {formatINR(game.pricePerPlayer)} / player
              </p>
            </div>

            <div className="mt-8">
              <Button onClick={onJoin} disabled={busy || joined >= game.playersNeeded} size="lg">
                {joined >= game.playersNeeded ? "Game full" : "Join game"}
              </Button>
            </div>
          </div>

          <div className="border border-white/10 bg-black/40 p-6 md:p-8">
            <p className="font-display text-6xl text-qc-white">{game.matchPct}%</p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-qc-lime">
              Match
            </p>
            <ul className="mt-8 space-y-3 text-sm text-qc-muted">
              {["Sport", "Time", "Location", "Skill"].map((factor) => (
                <li
                  key={factor}
                  className="flex items-center justify-between border-b border-white/8 pb-3"
                >
                  <span>{factor}</span>
                  <span className="text-qc-lime">Aligned</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
