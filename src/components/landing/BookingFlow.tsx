"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { confirmBooking } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/cn";

const steps = [
  "Facility",
  "Court",
  "Date",
  "Time",
  "Players",
  "Payment",
  "Confirm",
] as const;

export function BookingFlow() {
  const [step, setStep] = useState(0);
  const [players, setPlayers] = useState(10);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const total = useMemo(() => players * 599, [players]);

  const next = async () => {
    if (step < steps.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    setLoading(true);
    try {
      await confirmBooking({
        facility: "Arena X",
        court: "Pitch A",
        date: "Today",
        time: "8:00 PM",
        players,
        total,
      });
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <section className="border-t border-white/8 bg-qc-charcoal px-5 py-28 md:px-12 lg:px-20">
        <BookingConfirmation
          sport="Football"
          facility="Arena X"
          when="Today • 8:00 PM"
          players={players}
          total={total}
        />
      </section>
    );
  }

  return (
    <section className="border-t border-white/8 bg-qc-charcoal px-5 py-28 md:px-12 lg:px-20">
      <div className="mx-auto max-w-3xl">
        <SectionLabel>Booking</SectionLabel>
        <h2 className="mt-6 font-display text-5xl text-qc-white md:text-6xl">
          Lock the game.
        </h2>

        <div className="mt-10 flex flex-wrap gap-2">
          {steps.map((s, i) => (
            <span
              key={s}
              className={cn(
                "border px-3 py-1.5 text-[10px] uppercase tracking-[0.16em]",
                i === step
                  ? "border-qc-lime/40 text-qc-lime"
                  : i < step
                    ? "border-white/20 text-white/70"
                    : "border-white/8 text-white/30",
              )}
            >
              {s}
            </span>
          ))}
        </div>

        <div className="mt-10 border border-white/10 bg-qc-panel p-6 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
            >
              <p className="text-[11px] uppercase tracking-[0.2em] text-qc-muted">
                Step {step + 1} · {steps[step]}
              </p>
              {step === 0 && <p className="mt-4 font-display text-4xl">Arena X</p>}
              {step === 1 && <p className="mt-4 font-display text-4xl">Pitch A · Football</p>}
              {step === 2 && <p className="mt-4 font-display text-4xl">Today</p>}
              {step === 3 && <p className="mt-4 font-display text-4xl">8:00 PM – 9:00 PM</p>}
              {step === 4 && (
                <div className="mt-4 flex items-center gap-4">
                  <button
                    type="button"
                    className="h-10 w-10 border border-white/15"
                    onClick={() => setPlayers((p) => Math.max(2, p - 1))}
                  >
                    −
                  </button>
                  <p className="font-display text-5xl">{players}</p>
                  <button
                    type="button"
                    className="h-10 w-10 border border-white/15"
                    onClick={() => setPlayers((p) => Math.min(14, p + 1))}
                  >
                    +
                  </button>
                </div>
              )}
              {step === 5 && (
                <div className="mt-4">
                  <p className="font-display text-4xl">{formatINR(total)}</p>
                  <p className="mt-2 text-sm text-qc-muted">
                    Demo payment — no charge processed.
                  </p>
                </div>
              )}
              {step === 6 && (
                <div className="mt-4 space-y-2 text-qc-muted">
                  <p>Arena X · Pitch A</p>
                  <p>Today · 8:00 PM</p>
                  <p>
                    {players} players · {formatINR(total)}
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-10 flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              Back
            </Button>
            <Button onClick={next} disabled={loading}>
              {step === steps.length - 1
                ? loading
                  ? "Confirming…"
                  : "Confirm booking"
                : "Continue"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function BookingConfirmation({
  sport,
  facility,
  when,
  players,
  total,
}: {
  sport: string;
  facility: string;
  when: string;
  players: number;
  total: number;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="border border-qc-lime/30 bg-qc-lime/5 px-6 py-16"
      >
        <p className="text-[11px] uppercase tracking-[0.28em] text-qc-lime">
          Confirmed
        </p>
        <h2 className="mt-4 font-display text-6xl text-qc-white md:text-7xl">
          Game locked.
        </h2>
        <div className="mx-auto mt-10 max-w-sm space-y-3 text-left text-sm text-qc-muted">
          <Row label="Sport" value={sport} />
          <Row label="Facility" value={facility} />
          <Row label="When" value={when} />
          <Row label="Players" value={String(players)} />
          <Row label="Total" value={formatINR(total)} />
        </div>
        <div className="mt-10 flex justify-center gap-3">
          <Button href="/owner/login" size="lg">
            Facility Portal
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/8 pb-3">
      <span className="uppercase tracking-[0.14em] text-[10px]">{label}</span>
      <span className="text-qc-white">{value}</span>
    </div>
  );
}
