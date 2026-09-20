import { players } from "@/data/mock";
import { PlayerMatchCard } from "@/components/ui/Cards";
import { SectionLabel } from "@/components/ui/SectionLabel";

export default function OwnerCustomersPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <SectionLabel>Customers</SectionLabel>
        <h1 className="mt-3 font-display text-5xl">Player CRM</h1>
      </header>
      <div className="space-y-3">
        {players.map((p) => (
          <PlayerMatchCard
            key={p.id}
            name={p.name}
            sport={p.sports[0]}
            score={p.playScore}
          />
        ))}
      </div>
    </div>
  );
}
