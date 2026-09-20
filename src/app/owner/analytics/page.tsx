"use client";

import { ownerCharts } from "@/data/mock";
import { RevenueChart, OccupancyChart, DemandChart } from "@/components/owner/Charts";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { formatINR } from "@/lib/format";

export default function OwnerAnalyticsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <SectionLabel>Analytics</SectionLabel>
        <h1 className="mt-3 font-display text-5xl">Performance</h1>
      </header>

      <div className="border border-qc-lime/25 bg-qc-lime/5 p-6">
        <p className="text-[10px] uppercase tracking-[0.2em] text-qc-lime">
          QuickFill recovery
        </p>
        <p className="mt-3 font-display text-5xl md:text-6xl">
          {formatINR(ownerCharts.quickFillRecovery)}
        </p>
        <p className="mt-2 text-sm text-qc-muted">
          recovered from previously unused capacity.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RevenueChart data={ownerCharts.revenue} />
        <OccupancyChart data={ownerCharts.occupancy} />
        <OccupancyChart data={ownerCharts.peakHours} />
        <DemandChart data={ownerCharts.sportDemand} />
        <OccupancyChart data={ownerCharts.emptySlotRate} />
      </div>
    </div>
  );
}
