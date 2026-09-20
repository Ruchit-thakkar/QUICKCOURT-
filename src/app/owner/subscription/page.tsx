"use client";

import { pricingPlans, subscription } from "@/data/mock";
import { SubscriptionCard } from "@/components/ui/Cards";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";
import { formatINR } from "@/lib/format";
import { useState } from "react";

export default function OwnerSubscriptionPage() {
  const [billing, setBilling] = useState<"1" | "6" | "12">("1");
  const [renewed, setRenewed] = useState(false);

  const multiplier = billing === "12" ? 10 : billing === "6" ? 5.5 : 1;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <SectionLabel>Subscription</SectionLabel>
        <h1 className="mt-3 font-display text-5xl">Facility SaaS plans</h1>
        <p className="mt-3 text-sm text-qc-lime">14 day free trial</p>
      </header>

      <div className="border border-white/10 bg-qc-panel p-6">
        <p className="text-[10px] uppercase tracking-[0.18em] text-qc-muted">
          Current plan
        </p>
        <p className="mt-2 font-display text-5xl text-qc-lime">{subscription.plan}</p>
        <p className="mt-2 text-sm text-qc-muted">
          {subscription.status} · expires in {subscription.expiresInDays} days ·{" "}
          {formatINR(subscription.priceMonthly)}/mo
        </p>
        <div className="mt-5">
          <Button
            size="sm"
            onClick={() => setRenewed(true)}
            disabled={renewed}
          >
            {renewed ? "Renewal scheduled (demo)" : "Renew plan"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["1", "Monthly"],
            ["6", "6 months"],
            ["12", "12 months"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setBilling(id)}
            className={`border px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] ${
              billing === id
                ? "border-qc-lime/40 text-qc-lime"
                : "border-white/10 text-qc-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {pricingPlans.map((p) => (
          <SubscriptionCard
            key={p.id}
            name={p.name}
            price={Math.round(p.price * multiplier)}
            features={p.features}
            highlighted={"highlighted" in p && p.highlighted}
            cta={p.id === subscription.plan ? "Current plan" : undefined}
          />
        ))}
      </div>
      <p className="text-xs text-qc-dim">
        Mock payment state — no real charges processed.
      </p>
    </div>
  );
}
