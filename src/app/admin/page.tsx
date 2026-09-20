"use client";

import Link from "next/link";
import { adminMetrics, facilities, bookings, subscription } from "@/data/mock";
import { StatsCard } from "@/components/ui/StatsCard";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { formatINR } from "@/lib/format";
import { useAsyncData } from "@/hooks/useAsyncData";
import { fetchAdminMetrics } from "@/lib/api";
import { AsyncStateView } from "@/components/ui/AsyncStateView";

export default function AdminPage() {
  const { data, state, error } = useAsyncData(() => fetchAdminMetrics(), []);
  const m = data ?? adminMetrics;

  return (
    <div className="min-h-screen bg-qc-black px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionLabel>Platform admin</SectionLabel>
            <h1 className="mt-3 font-display text-5xl md:text-6xl">
              QuickCourt control
            </h1>
          </div>
          <Link
            href="/"
            className="text-[10px] uppercase tracking-[0.16em] text-qc-muted hover:text-white"
          >
            Back to site
          </Link>
        </header>

        <AsyncStateView state={state === "loading" ? "loading" : "success"} error={error}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatsCard label="Total players" value={m.totalPlayers.toLocaleString()} />
            <StatsCard label="Total facilities" value={m.totalFacilities} />
            <StatsCard label="Active games" value={m.activeGames} />
            <StatsCard label="Bookings" value={m.bookings.toLocaleString()} />
            <StatsCard
              label="Platform revenue"
              value={formatINR(m.platformRevenue)}
              accent
            />
            <StatsCard label="Active subscriptions" value={m.activeSubscriptions} />
          </div>
        </AsyncStateView>

        <section className="grid gap-6 lg:grid-cols-2">
          <Panel title="Facility approvals">
            {facilities.map((f) => (
              <Row key={f.id} left={f.name} right="Pending review" />
            ))}
          </Panel>
          <Panel title="Users">
            <Row left="Players" right={m.totalPlayers.toLocaleString()} />
            <Row left="Facility owners" right="186" />
            <Row left="Admins" right="4" />
          </Panel>
          <Panel title="Bookings">
            {bookings.map((b) => (
              <Row
                key={b.id}
                left={`${b.facilityName} · ${b.sport}`}
                right={b.status}
              />
            ))}
          </Panel>
          <Panel title="Subscriptions">
            <Row left="Growth active" right={String(m.activeSubscriptions)} />
            <Row left="Sample plan" right={subscription.plan} />
            <Row left="Trial conversions" right="68%" />
          </Panel>
        </section>

        <section className="border border-white/10 bg-qc-panel p-6">
          <SectionLabel>Reports</SectionLabel>
          <p className="mt-4 text-sm text-qc-muted">
            Demo reports: GMV, QuickFill recovery, empty-slot rate, churn.
            Connect warehouse / analytics API here.
          </p>
        </section>
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-white/10 bg-qc-panel p-5">
      <p className="text-[10px] uppercase tracking-[0.2em] text-qc-muted">
        {title}
      </p>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function Row({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/8 pb-3 text-sm last:border-0">
      <span className="text-qc-white">{left}</span>
      <span className="text-qc-muted">{right}</span>
    </div>
  );
}
