"use client";

import { quickFillOffers } from "@/data/mock";
import { QuickFillCard } from "@/components/ui/Cards";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";
import { createQuickFillOffer } from "@/lib/api";
import { useState } from "react";

export default function OwnerOffersPage() {
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <SectionLabel>Offers</SectionLabel>
          <h1 className="mt-3 font-display text-5xl">QuickFill desk</h1>
        </div>
        <Button
          size="sm"
          onClick={async () => {
            await createQuickFillOffer({ demo: true });
            setMsg("Smart offer released (demo).");
          }}
        >
          Create offer
        </Button>
      </header>
      {msg && <p className="text-sm text-qc-lime">{msg}</p>}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {quickFillOffers.map((o) => (
          <QuickFillCard key={o.id} offer={o} />
        ))}
      </div>
    </div>
  );
}
