import { demandOpportunities } from "@/data/mock";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";

export default function OwnerDemandPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <SectionLabel>Demand intelligence</SectionLabel>
        <h1 className="mt-3 font-display text-5xl">Opportunities</h1>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {demandOpportunities.map((d) => (
          <article key={d.id} className="border border-white/10 bg-qc-panel p-6">
            <p className="text-[10px] uppercase tracking-[0.18em] text-qc-lime">
              {d.demand} DEMAND
            </p>
            <h2 className="mt-3 font-display text-4xl capitalize">{d.sport}</h2>
            <p className="mt-2 text-qc-muted">{d.when}</p>
            <p className="mt-4 text-sm text-qc-muted">
              {d.nearbyPlayers} nearby · capacity {d.capacity}
              {d.opportunity ? ` · +${d.opportunity} players` : ""}
            </p>
            <div className="mt-6">
              <Button href="/owner/offers" size="sm">
                {d.recommendation}
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
