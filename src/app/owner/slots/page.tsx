import { slots } from "@/data/mock";
import { SlotCard } from "@/components/ui/Cards";
import { SectionLabel } from "@/components/ui/SectionLabel";

export default function OwnerSlotsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <SectionLabel>Slots</SectionLabel>
        <h1 className="mt-3 font-display text-5xl">Availability board</h1>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {slots.map((s) => (
          <SlotCard key={s.id} slot={s} />
        ))}
      </div>
    </div>
  );
}
