import Link from "next/link";
import type { Facility } from "@/types";
import { formatINR } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { Star } from "lucide-react";

export function FacilityCard({
  facility,
  cta = "View",
  className,
}: {
  facility: Facility;
  cta?: string;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "flex flex-col justify-between gap-4 border border-white/10 bg-qc-panel p-5 transition hover:border-white/20",
        className,
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-3xl text-qc-white">{facility.name}</h3>
            <p className="mt-1 text-sm text-qc-muted">{facility.address}</p>
          </div>
          <div className="flex items-center gap-1 text-sm text-qc-lime">
            <Star className="h-3.5 w-3.5 fill-qc-lime" />
            {facility.rating}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.16em] text-qc-muted">
          <span className="border border-white/10 px-2 py-1">
            {facility.distanceKm} km
          </span>
          {facility.sports.slice(0, 2).map((s) => (
            <span key={s} className="border border-white/10 px-2 py-1">
              {s}
            </span>
          ))}
          <span className="border border-white/10 px-2 py-1">
            from {formatINR(facility.priceFrom)}
          </span>
        </div>
      </div>
      <Button href="#booking" size="sm" className="w-fit">
        {cta}
      </Button>
    </article>
  );
}

export function GameCard({
  title,
  meta,
  progress,
  href,
}: {
  title: string;
  meta: string;
  progress?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block border border-white/10 bg-qc-panel p-5 transition hover:border-qc-lime/30"
    >
      <h3 className="font-display text-2xl text-qc-white">{title}</h3>
      <p className="mt-2 text-sm text-qc-muted">{meta}</p>
      {progress && (
        <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-qc-lime">
          {progress}
        </p>
      )}
    </Link>
  );
}
