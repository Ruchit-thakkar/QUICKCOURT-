"use client";

import { bookings } from "@/data/mock";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { AsyncStateView } from "@/components/ui/AsyncStateView";
import { formatINR } from "@/lib/format";
import { useAsyncData } from "@/hooks/useAsyncData";
import { fetchBookings } from "@/lib/api";

export default function PlayerBookingsPage() {
  const { data, state, error } = useAsyncData(() => fetchBookings(), []);

  return (
    <div className="space-y-8">
      <header>
        <SectionLabel>Bookings</SectionLabel>
        <h1 className="mt-3 font-display text-5xl">Your courts</h1>
      </header>

      <AsyncStateView state={state} error={error} emptyMessage="No bookings yet.">
        <div className="space-y-4">
          {(data ?? bookings).map((b) => (
            <article
              key={b.id}
              className="flex flex-wrap items-center justify-between gap-4 border border-white/10 bg-qc-panel p-5"
            >
              <div>
                <p className="font-display text-3xl capitalize">{b.sport}</p>
                <p className="text-sm text-qc-muted">
                  {b.facilityName} · {b.date} · {b.time}
                </p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-qc-lime">
                  {b.status}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-3xl">{formatINR(b.total)}</p>
                <p className="text-xs text-qc-muted">{b.players} players</p>
              </div>
            </article>
          ))}
        </div>
      </AsyncStateView>
    </div>
  );
}
