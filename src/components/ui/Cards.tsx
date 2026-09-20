import type { QuickFillOffer, Slot } from "@/types";
import { formatINR, formatPct } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export function QuickFillCard({ offer }: { offer: QuickFillOffer }) {
  return (
    <article className="border border-qc-lime/20 bg-qc-lime/5 p-5">
      <p className="text-[10px] uppercase tracking-[0.2em] text-qc-lime">
        QuickFill
      </p>
      <h3 className="mt-3 font-display text-3xl text-qc-white">
        {offer.facilityName}
      </h3>
      <p className="mt-1 text-sm capitalize text-qc-muted">
        {offer.sport} · {offer.slot}
      </p>
      <div className="mt-4 flex items-end gap-3">
        <span className="text-sm text-white/35 line-through">
          {formatINR(offer.originalPrice)}
        </span>
        <span className="font-display text-4xl text-qc-lime">
          {formatINR(offer.offerPrice)}
        </span>
      </div>
      <p className="mt-3 text-xs text-qc-muted">
        {offer.nearbyPlayers} nearby · expected {formatPct(offer.expectedOccupancy)}
      </p>
      <div className="mt-5">
        <Button href="/player/games" size="sm">
          Claim spot
        </Button>
      </div>
    </article>
  );
}

export function SlotCard({ slot }: { slot: Slot }) {
  const tone =
    slot.status === "AVAILABLE"
      ? "border-white/15 text-white"
      : slot.status === "BOOKED"
        ? "border-white/10 text-white/50"
        : slot.status === "QUICKFILL"
          ? "border-qc-lime/30 text-qc-lime"
          : "border-red-400/20 text-red-300";

  return (
    <div className={cn("border bg-qc-panel p-4", tone)}>
      <p className="text-[10px] uppercase tracking-[0.18em]">{slot.status}</p>
      <p className="mt-2 font-display text-2xl text-qc-white">
        {slot.startTime}–{slot.endTime}
      </p>
      <p className="mt-1 text-sm text-qc-muted">
        {slot.date} · {formatINR(slot.price)}
      </p>
      <p className="mt-3 text-xs text-qc-dim">
        Occupancy {formatPct(slot.occupancyPct)}
      </p>
    </div>
  );
}

export function SubscriptionCard({
  name,
  price,
  features,
  highlighted,
  cta,
}: {
  name: string;
  price: number;
  features: string[];
  highlighted?: boolean;
  cta?: string;
}) {
  return (
    <article
      className={cn(
        "flex flex-col border p-6",
        highlighted
          ? "border-qc-lime/40 bg-qc-lime/5"
          : "border-white/10 bg-qc-panel",
      )}
    >
      <p className="text-[10px] uppercase tracking-[0.2em] text-qc-muted">
        {highlighted ? "Most popular" : "Plan"}
      </p>
      <h3 className="mt-3 font-display text-4xl">{name}</h3>
      <p className="mt-4 font-display text-5xl text-qc-lime">
        {formatINR(price)}
        <span className="ml-1 text-sm tracking-normal text-qc-muted">/mo</span>
      </p>
      <ul className="mt-6 flex-1 space-y-2 text-sm text-qc-muted">
        {features.map((f) => (
          <li key={f}>— {f}</li>
        ))}
      </ul>
      <div className="mt-8">
        <Button
          href="/owner/subscription"
          variant={highlighted ? "primary" : "secondary"}
          className="w-full"
        >
          {cta ?? "Start 14-day trial"}
        </Button>
      </div>
    </article>
  );
}

export function PlayerMatchCard({
  name,
  sport,
  score,
}: {
  name: string;
  sport: string;
  score: number;
}) {
  return (
    <div className="flex items-center justify-between border border-white/10 bg-qc-panel px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center bg-qc-elevated text-xs">
          {name
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </div>
        <div>
          <p className="text-sm text-qc-white">{name}</p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-qc-muted">
            {sport}
          </p>
        </div>
      </div>
      <p className="font-display text-2xl text-qc-lime">{score}</p>
    </div>
  );
}
