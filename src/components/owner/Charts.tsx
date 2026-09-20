"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartPoint } from "@/types";

const tooltipStyle = {
  backgroundColor: "#101010",
  border: "1px solid rgba(255,255,255,0.1)",
  fontSize: 12,
};

export function RevenueChart({ data }: { data: ChartPoint[] }) {
  return (
    <ChartShell title="Revenue">
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c8f542" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#c8f542" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="label" stroke="#666" fontSize={11} tickLine={false} />
          <YAxis stroke="#666" fontSize={11} tickLine={false} width={40} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#c8f542"
            fill="url(#rev)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function OccupancyChart({ data }: { data: ChartPoint[] }) {
  return (
    <ChartShell title="Occupancy">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="label" stroke="#666" fontSize={11} tickLine={false} />
          <YAxis stroke="#666" fontSize={11} tickLine={false} width={30} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="value" fill="#c8f542" radius={[0, 0, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function DemandChart({ data }: { data: ChartPoint[] }) {
  return (
    <ChartShell title="Sport demand">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
          <XAxis type="number" stroke="#666" fontSize={11} tickLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            stroke="#666"
            fontSize={11}
            tickLine={false}
            width={80}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="value" fill="rgba(200,245,66,0.75)" />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

function ChartShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-white/10 bg-qc-panel p-4 md:p-5">
      <p className="mb-4 text-[10px] uppercase tracking-[0.2em] text-qc-muted">
        {title}
      </p>
      {children}
    </div>
  );
}
