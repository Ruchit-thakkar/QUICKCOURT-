import { courts } from "@/data/mock";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { formatINR } from "@/lib/format";

export default function OwnerCourtsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <SectionLabel>Courts</SectionLabel>
        <h1 className="mt-3 font-display text-5xl">Court inventory</h1>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {courts.map((c) => (
          <article key={c.id} className="border border-white/10 bg-qc-panel p-5">
            <h2 className="font-display text-3xl">{c.name}</h2>
            <p className="mt-2 text-sm capitalize text-qc-muted">{c.sport}</p>
            <div className="mt-4 flex gap-4 text-xs uppercase tracking-[0.14em] text-qc-dim">
              <span>Capacity {c.capacity}</span>
              <span>{formatINR(c.pricePerHour)}/hr</span>
              <span>{c.available ? "Available" : "Offline"}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
