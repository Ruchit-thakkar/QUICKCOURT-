import { bookings } from "@/data/mock";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { formatINR } from "@/lib/format";

export default function OwnerBookingsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <SectionLabel>Bookings</SectionLabel>
        <h1 className="mt-3 font-display text-5xl">Incoming games</h1>
      </header>
      <div className="space-y-3">
        {bookings.map((b) => (
          <div
            key={b.id}
            className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-qc-panel px-4 py-4"
          >
            <div>
              <p className="font-display text-2xl capitalize">{b.sport}</p>
              <p className="text-sm text-qc-muted">
                {b.date} · {b.time} · {b.players} players
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl">{formatINR(b.total)}</p>
              <p className="text-[10px] uppercase tracking-[0.14em] text-qc-lime">
                {b.status}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
