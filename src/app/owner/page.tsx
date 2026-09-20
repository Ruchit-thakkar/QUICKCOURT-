"use client";

import { demandOpportunities, ownerCharts, ownerKpis } from "@/data/mock";
import { StatsCard } from "@/components/ui/StatsCard";
import { RevenueChart, OccupancyChart, DemandChart } from "@/components/owner/Charts";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";
import { formatINR } from "@/lib/format";
import { useAsyncData } from "@/hooks/useAsyncData";
import { fetchOwnerCharts, fetchOwnerKpis } from "@/lib/api";
import { AsyncStateView } from "@/components/ui/AsyncStateView";

export default function OwnerDashboardPage() {
  const kpis = useAsyncData(() => fetchOwnerKpis(), []);
  const charts = useAsyncData(() => fetchOwnerCharts(), []);

  const kpi = kpis.data ?? ownerKpis;
  const chartData = charts.data ?? ownerCharts;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <p className="text-sm text-qc-muted">Good morning,</p>
        <h1 className="font-display text-5xl md:text-6xl">ABC Arena.</h1>
      </header>

      <AsyncStateView state={kpis.state === "error" ? "error" : "success"} error={kpis.error}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatsCard label="Today's revenue" value={formatINR(kpi.todayRevenue)} accent />
          <StatsCard label="Occupancy" value={`${kpi.occupancy}%`} />
          <StatsCard label="Bookings" value={kpi.bookings} />
          <StatsCard label="Empty slots" value={kpi.emptySlots} hint="Recover with QuickFill" />
        </div>
      </AsyncStateView>

      <div className="grid gap-4 lg:grid-cols-2">
        <RevenueChart data={chartData.revenue} />
        <OccupancyChart data={chartData.occupancy} />
        <OccupancyChart data={chartData.peakHours} />
        <DemandChart data={chartData.sportDemand} />
      </div>

      <section>
        <SectionLabel>Demand opportunities</SectionLabel>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {demandOpportunities.map((d) => (
            <article key={d.id} className="border border-white/10 bg-qc-panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-3xl capitalize">{d.sport}</h3>
                  <p className="mt-1 text-sm text-qc-muted">{d.when}</p>
                </div>
                <span
                  className={`border px-2 py-1 text-[10px] uppercase tracking-[0.14em] ${
                    d.demand === "HIGH"
                      ? "border-qc-lime/40 text-qc-lime"
                      : "border-white/15 text-qc-muted"
                  }`}
                >
                  {d.demand === "HIGH" ? "High demand" : "Low occupancy"}
                </span>
              </div>
              <p className="mt-4 text-sm text-qc-muted">
                {d.nearbyPlayers} nearby players · capacity {d.capacity}
                {d.opportunity > 0 ? ` · opportunity +${d.opportunity}` : ""}
              </p>
              <div className="mt-5">
                <Button href="/owner/offers" size="sm">
                  {d.recommendation}
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
