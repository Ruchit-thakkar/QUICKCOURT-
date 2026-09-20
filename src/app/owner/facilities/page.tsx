import { facilities } from "@/data/mock";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";

export default function OwnerFacilitiesPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <SectionLabel>Facilities</SectionLabel>
          <h1 className="mt-3 font-display text-5xl">Manage venues</h1>
        </div>
        <Button size="sm">Add facility</Button>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {facilities.map((f) => (
          <article key={f.id} className="border border-white/10 bg-qc-panel p-5">
            <h2 className="font-display text-3xl">{f.name}</h2>
            <p className="mt-1 text-sm text-qc-muted">{f.address}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.14em] text-qc-dim">
              {f.sports.join(" · ")}
            </p>
            <p className="mt-2 text-sm text-qc-muted">{f.operatingHours}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
