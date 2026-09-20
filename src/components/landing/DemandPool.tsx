"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { submitDemandPool } from "@/lib/api";
import type { DemandPoolInput, SkillLevel, Sport } from "@/types";

const sports: Sport[] = [
  "football",
  "basketball",
  "cricket",
  "badminton",
  "tennis",
];

const skills: SkillLevel[] = ["beginner", "intermediate", "advanced", "pro"];

export function DemandPool() {
  const [form, setForm] = useState<DemandPoolInput>({
    sport: "football",
    date: "Today",
    time: "8:00 PM",
    location: "Andheri West",
    radiusKm: 5,
    budget: 600,
    skill: "intermediate",
  });
  const [result, setResult] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await submitDemandPool(form);
      setResult(res.matchedPlayers);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id="demand"
      className="border-t border-white/8 bg-qc-black px-5 py-28 md:px-12 lg:px-20"
    >
      <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <SectionLabel>Demand pool</SectionLabel>
          <h2 className="mt-6 font-display text-5xl text-qc-white md:text-7xl">
            Tell us how you want to play.
          </h2>
          <p className="mt-5 max-w-md text-qc-muted">
            Express demand first. We match players, form the game, then find the
            court.
          </p>

          <form onSubmit={onSubmit} className="mt-10 grid gap-4 sm:grid-cols-2">
            <Field label="Sport">
              <select
                value={form.sport}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sport: e.target.value as Sport }))
                }
                className={fieldClass}
              >
                {sports.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date">
              <input
                className={fieldClass}
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </Field>
            <Field label="Time">
              <input
                className={fieldClass}
                value={form.time}
                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
              />
            </Field>
            <Field label="Location">
              <input
                className={fieldClass}
                value={form.location}
                onChange={(e) =>
                  setForm((f) => ({ ...f, location: e.target.value }))
                }
              />
            </Field>
            <Field label="Radius">
              <input
                className={fieldClass}
                type="number"
                value={form.radiusKm}
                onChange={(e) =>
                  setForm((f) => ({ ...f, radiusKm: Number(e.target.value) }))
                }
              />
            </Field>
            <Field label="Budget / player">
              <input
                className={fieldClass}
                type="number"
                value={form.budget}
                onChange={(e) =>
                  setForm((f) => ({ ...f, budget: Number(e.target.value) }))
                }
              />
            </Field>
            <Field label="Skill level" className="sm:col-span-2">
              <select
                value={form.skill}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    skill: e.target.value as SkillLevel,
                  }))
                }
                className={fieldClass}
              >
                {skills.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" size="lg" disabled={loading} className="w-full sm:w-auto">
                {loading ? "Matching…" : "Find my game"}
              </Button>
            </div>
          </form>
        </div>

        <div className="relative min-h-[360px] border border-white/10 bg-qc-panel p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-qc-muted">
            Demand cluster
          </p>
          <div className="relative mt-8 h-64 overflow-hidden">
            {[...Array(14)].map((_, i) => (
              <motion.span
                key={i}
                className="absolute h-3 w-3 rounded-full bg-qc-lime/80"
                style={{
                  left: `${12 + ((i * 17) % 76)}%`,
                  top: `${18 + ((i * 23) % 62)}%`,
                }}
                animate={{
                  scale: [1, 1.35, 1],
                  opacity: [0.45, 1, 0.45],
                }}
                transition={{
                  duration: 2.4 + (i % 5) * 0.2,
                  repeat: Infinity,
                  delay: i * 0.08,
                }}
              />
            ))}
            <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-qc-lime/30" />
            <div className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
          </div>

          <AnimatePresence>
            {result !== null && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 border border-qc-lime/25 bg-qc-lime/5 p-4"
              >
                <p className="font-display text-5xl text-qc-lime">{result} PLAYERS</p>
                <p className="mt-2 text-sm text-qc-muted">
                  are looking for {form.sport} within {form.radiusKm} km at{" "}
                  {form.time}.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

const fieldClass =
  "h-12 w-full border border-white/10 bg-qc-ink px-3.5 capitalize text-qc-white outline-none focus:border-qc-lime/45";

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-[10px] uppercase tracking-[0.18em] text-qc-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
