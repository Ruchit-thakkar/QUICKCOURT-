"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  getDateRangeForPeriod,
  getOwnerBookingsForDateRange,
  calculateRevenue,
  calculateBookingsBreakdown,
  calculateAverageBookingValue,
  calculateOccupancyRate,
  calculateTrendData,
  calculatePeakAndLowDemandHours,
  calculatePopularSports,
  calculatePopularCourts,
  generateBusinessInsights,
} from "@/services/analyticsService";
import type {
  OwnerBooking,
  AnalyticsTimePeriod,
  OwnerAnalyticsSummary,
} from "@/types";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  IndianRupee,
  CalendarCheck,
  Percent,
  XCircle,
  Clock,
  Sparkles,
  Lightbulb,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Grid3X3,
  Trophy,
  Loader2,
  Calendar,
  Layers,
} from "lucide-react";

const PERIOD_OPTIONS: { id: AnalyticsTimePeriod; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7days", label: "7 Days" },
  { id: "30days", label: "30 Days" },
  { id: "thisMonth", label: "This Month" },
];

const tooltipStyle = {
  backgroundColor: "#101010",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#ffffff",
  fontSize: 12,
  borderRadius: 0,
};

export default function OwnerAnalyticsPage() {
  const { user, businessProfile } = useAuth();
  const [period, setPeriod] = useState<AnalyticsTimePeriod>("7days");
  const [bookings, setBookings] = useState<OwnerBooking[]>([]);
  const [prevBookings, setPrevBookings] = useState<OwnerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChartTab, setActiveChartTab] = useState<"revenue" | "bookings">("revenue");

  // Fetch real data on period change or businessProfile update
  useEffect(() => {
    if (!businessProfile?.businessId) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    const { startDate, endDate, prevStartDate, prevEndDate } = getDateRangeForPeriod(period);

    Promise.all([
      getOwnerBookingsForDateRange(businessProfile.businessId, startDate, endDate, user?.uid),
      getOwnerBookingsForDateRange(businessProfile.businessId, prevStartDate, prevEndDate, user?.uid),
    ])
      .then(([currentList, prevList]) => {
        if (!active) return;
        setBookings(currentList);
        setPrevBookings(prevList);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load analytics bookings:", err);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [businessProfile?.businessId, period, user?.uid]);

  // Calculations for current period
  const { startDate, endDate } = useMemo(() => getDateRangeForPeriod(period), [period]);

  const summary: OwnerAnalyticsSummary = useMemo(() => {
    const totalRev = calculateRevenue(bookings);
    const breakdown = calculateBookingsBreakdown(bookings);
    const validCount = breakdown.total - breakdown.cancelled;
    const abv = calculateAverageBookingValue(totalRev, validCount);
    const occ = calculateOccupancyRate(businessProfile, bookings, startDate, endDate);

    return {
      totalBookings: breakdown.total,
      confirmedBookings: breakdown.confirmed,
      cancelledBookings: breakdown.cancelled,
      completedBookings: breakdown.completed,
      totalRevenue: totalRev,
      averageBookingValue: abv,
      occupancyRate: occ.occupancyRate,
      totalAvailableSlots: occ.totalAvailableSlots,
      bookedSlots: occ.bookedSlots,
      cancellationRate: breakdown.cancellationRate,
    };
  }, [bookings, businessProfile, startDate, endDate]);

  // Calculations for previous period (for comparison)
  const prevSummary: OwnerAnalyticsSummary | null = useMemo(() => {
    if (prevBookings.length === 0) return null;
    const totalRev = calculateRevenue(prevBookings);
    const breakdown = calculateBookingsBreakdown(prevBookings);
    const validCount = breakdown.total - breakdown.cancelled;
    const abv = calculateAverageBookingValue(totalRev, validCount);

    return {
      totalBookings: breakdown.total,
      confirmedBookings: breakdown.confirmed,
      cancelledBookings: breakdown.cancelled,
      completedBookings: breakdown.completed,
      totalRevenue: totalRev,
      averageBookingValue: abv,
      occupancyRate: 0,
      totalAvailableSlots: 0,
      bookedSlots: validCount,
      cancellationRate: breakdown.cancellationRate,
    };
  }, [prevBookings]);

  // Trend data points
  const trendPoints = useMemo(() => {
    return calculateTrendData(bookings, startDate, endDate, period);
  }, [bookings, startDate, endDate, period]);

  // Peak & Low Demand Hours
  const { peakHours, lowDemandHours } = useMemo(() => {
    return calculatePeakAndLowDemandHours(bookings, businessProfile);
  }, [bookings, businessProfile]);

  // Popular Sports
  const popularSports = useMemo(() => {
    return calculatePopularSports(bookings);
  }, [bookings]);

  // Popular Courts
  const popularCourts = useMemo(() => {
    return calculatePopularCourts(bookings, businessProfile);
  }, [bookings, businessProfile]);

  // Rule-Based Business Insights
  const insights = useMemo(() => {
    return generateBusinessInsights(
      summary,
      prevSummary,
      peakHours,
      lowDemandHours,
      popularSports,
      popularCourts
    );
  }, [summary, prevSummary, peakHours, lowDemandHours, popularSports, popularCourts]);

  // Revenue change percentage
  const revenueGrowthPct = useMemo(() => {
    if (!prevSummary || prevSummary.totalRevenue === 0) return null;
    const diff = summary.totalRevenue - prevSummary.totalRevenue;
    return Math.round((diff / prevSummary.totalRevenue) * 100);
  }, [summary.totalRevenue, prevSummary]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      {/* Header & Controls */}
      <header className="flex flex-col gap-4 border-b border-white/8 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SectionLabel>Analytics & Reports</SectionLabel>
          <h1 className="mt-2 font-display text-4xl text-qc-white md:text-5xl">
            Venue Performance
          </h1>
          <p className="mt-1 text-sm text-qc-muted">
            Track real-time revenue, slot utilization, peak demand periods, and court profitability.
          </p>
        </div>

        {/* Time Period Filter Pills */}
        <div className="flex items-center gap-1.5 border border-white/10 bg-qc-charcoal p-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setPeriod(opt.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition",
                period === opt.id
                  ? "bg-qc-lime text-qc-black"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </header>

      {/* Loading state indicator */}
      {loading && (
        <div className="flex items-center justify-center gap-3 border border-white/10 bg-qc-charcoal py-12 text-sm text-qc-muted">
          <Loader2 className="h-5 w-5 animate-spin text-qc-lime" />
          <span>Analyzing venue booking records...</span>
        </div>
      )}

      {!loading && (
        <>
          {/* Overview Metric Cards (5 Cards) */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {/* Total Revenue */}
            <div className="border border-white/10 bg-qc-charcoal p-5 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-qc-muted">
                  Total Revenue
                </span>
                <IndianRupee className="h-4 w-4 text-qc-lime" />
              </div>
              <p className="mt-3 font-display text-3xl text-qc-white md:text-4xl">
                {formatINR(summary.totalRevenue)}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-qc-muted">
                {revenueGrowthPct !== null ? (
                  <span
                    className={cn(
                      "inline-flex items-center font-medium",
                      revenueGrowthPct >= 0 ? "text-qc-lime" : "text-amber-400"
                    )}
                  >
                    {revenueGrowthPct >= 0 ? (
                      <ArrowUpRight className="h-3 w-3 inline mr-0.5" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 inline mr-0.5" />
                    )}
                    {revenueGrowthPct > 0 ? `+${revenueGrowthPct}%` : `${revenueGrowthPct}%`}
                  </span>
                ) : (
                  <span>Valid bookings</span>
                )}
                <span>vs prev period</span>
              </div>
            </div>

            {/* Total Bookings */}
            <div className="border border-white/10 bg-qc-charcoal p-5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-qc-muted">
                  Total Bookings
                </span>
                <CalendarCheck className="h-4 w-4 text-qc-lime" />
              </div>
              <p className="mt-3 font-display text-3xl text-qc-white md:text-4xl">
                {summary.totalBookings}
              </p>
              <p className="mt-2 text-xs text-qc-muted">
                {summary.confirmedBookings} confirmed • {summary.completedBookings} completed
              </p>
            </div>

            {/* Average Booking Value (ABV) */}
            <div className="border border-white/10 bg-qc-charcoal p-5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-qc-muted">
                  Avg Booking Value
                </span>
                <TrendingUp className="h-4 w-4 text-qc-lime" />
              </div>
              <p className="mt-3 font-display text-3xl text-qc-white md:text-4xl">
                {formatINR(summary.averageBookingValue)}
              </p>
              <p className="mt-2 text-xs text-qc-muted">
                Per valid match reserved
              </p>
            </div>

            {/* Occupancy Rate */}
            <div className="border border-white/10 bg-qc-charcoal p-5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-qc-muted">
                  Occupancy Rate
                </span>
                <Percent className="h-4 w-4 text-qc-lime" />
              </div>
              <p className="mt-3 font-display text-3xl text-qc-white md:text-4xl">
                {summary.occupancyRate}%
              </p>
              <p className="mt-2 text-xs text-qc-muted">
                {summary.bookedSlots} / {summary.totalAvailableSlots} slots occupied
              </p>
            </div>

            {/* Cancelled Bookings */}
            <div className="border border-white/10 bg-qc-charcoal p-5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-qc-muted">
                  Cancelled
                </span>
                <XCircle className="h-4 w-4 text-red-400" />
              </div>
              <p className="mt-3 font-display text-3xl text-qc-white md:text-4xl">
                {summary.cancelledBookings}
              </p>
              <p className="mt-2 text-xs text-qc-muted">
                {summary.cancellationRate}% cancellation rate
              </p>
            </div>
          </div>

          {/* Business Insights (Rule-Based) */}
          <div className="border border-white/10 bg-qc-charcoal p-6">
            <div className="flex items-center gap-2 border-b border-white/8 pb-4 mb-4">
              <Sparkles className="h-4 w-4 text-qc-lime" />
              <h2 className="font-display text-lg uppercase tracking-wider text-qc-white">
                Automated Venue Insights
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {insights.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "border p-4 transition",
                    item.type === "alert"
                      ? "border-amber-500/30 bg-amber-500/5"
                      : item.type === "opportunity"
                      ? "border-cyan-500/30 bg-cyan-500/5"
                      : "border-qc-lime/30 bg-qc-lime/5"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={cn(
                        "text-[9px] font-bold uppercase tracking-[0.2em]",
                        item.type === "alert"
                          ? "text-amber-400"
                          : item.type === "opportunity"
                          ? "text-cyan-400"
                          : "text-qc-lime"
                      )}
                    >
                      {item.type}
                    </span>
                    {item.metric && (
                      <span className="border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-qc-white">
                        {item.metric}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-qc-white">{item.title}</h3>
                  <p className="mt-1 text-xs text-qc-muted leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue & Bookings Trends Chart */}
          <div className="border border-white/10 bg-qc-panel p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-qc-muted">
                  Performance Trends
                </p>
                <h3 className="font-display text-xl text-qc-white mt-1">
                  {activeChartTab === "revenue" ? "Revenue Timeline (₹)" : "Bookings Volume"}
                </h3>
              </div>

              {/* Chart Toggle Buttons */}
              <div className="flex items-center gap-1 border border-white/10 bg-qc-charcoal p-1 self-start sm:self-auto">
                <button
                  onClick={() => setActiveChartTab("revenue")}
                  className={cn(
                    "px-3 py-1 text-xs font-semibold uppercase tracking-wider transition",
                    activeChartTab === "revenue"
                      ? "bg-qc-lime text-qc-black"
                      : "text-white/60 hover:text-white"
                  )}
                >
                  Revenue
                </button>
                <button
                  onClick={() => setActiveChartTab("bookings")}
                  className={cn(
                    "px-3 py-1 text-xs font-semibold uppercase tracking-wider transition",
                    activeChartTab === "bookings"
                      ? "bg-qc-lime text-qc-black"
                      : "text-white/60 hover:text-white"
                  )}
                >
                  Bookings
                </button>
              </div>
            </div>

            {/* Empty State for Chart */}
            {summary.totalBookings === 0 ? (
              <div className="flex h-56 flex-col items-center justify-center text-center text-qc-muted border border-white/5 bg-qc-charcoal/50">
                <Calendar className="h-8 w-8 text-white/20 mb-2" />
                <p className="text-sm text-qc-white font-medium">No bookings in this period</p>
                <p className="text-xs text-qc-muted mt-1 max-w-sm">
                  Once players reserve courts during this timeframe, revenue trends and booking density will appear here.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                {activeChartTab === "revenue" ? (
                  <AreaChart data={trendPoints}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#c8f542" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#c8f542" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#666"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#666"
                      fontSize={11}
                      tickLine={false}
                      width={50}
                      tickFormatter={(v) => `₹${v}`}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v: any) => [`₹${v}`, "Revenue"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#c8f542"
                      fill="url(#revGrad)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={trendPoints}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#666"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#666"
                      fontSize={11}
                      tickLine={false}
                      width={30}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v: any) => [v, "Bookings"]}
                    />
                    <Bar
                      dataKey="bookings"
                      fill="#c8f542"
                      radius={[0, 0, 0, 0]}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}
          </div>

          {/* Peak Hours & Low-Demand Hours Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Peak Hours Card */}
            <div className="border border-white/10 bg-qc-charcoal p-5">
              <div className="flex items-center gap-2 border-b border-white/8 pb-3 mb-4">
                <Clock className="h-4 w-4 text-qc-lime" />
                <h3 className="font-display text-base uppercase tracking-wider text-qc-white">
                  Peak Booking Hours
                </h3>
              </div>

              {peakHours.length === 0 ? (
                <p className="text-xs text-qc-muted py-6 text-center">
                  No bookings recorded yet in this period to establish peak hours.
                </p>
              ) : (
                <div className="space-y-3">
                  {peakHours.map((slot, index) => (
                    <div
                      key={slot.slotLabel}
                      className="flex items-center justify-between border border-white/5 bg-qc-panel p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center border border-qc-lime/40 bg-qc-lime/10 font-mono text-xs font-bold text-qc-lime">
                          #{index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-qc-white">
                            {slot.slotLabel}
                          </p>
                          <p className="text-[11px] text-qc-muted">
                            {slot.bookingCount} match{slot.bookingCount > 1 ? "es" : ""} booked
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="inline-block rounded-none border border-qc-lime/30 bg-qc-lime/10 px-2 py-0.5 text-[10px] font-bold text-qc-lime">
                          {slot.percentage}% of bookings
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Low-Demand Hours Card */}
            <div className="border border-white/10 bg-qc-charcoal p-5">
              <div className="flex items-center gap-2 border-b border-white/8 pb-3 mb-4">
                <AlertCircle className="h-4 w-4 text-cyan-400" />
                <h3 className="font-display text-base uppercase tracking-wider text-qc-white">
                  Low-Demand / Off-Peak Hours
                </h3>
              </div>

              {!lowDemandHours.hasEnoughData ? (
                <div className="py-6 px-4 text-center border border-white/5 bg-qc-panel/50">
                  <p className="text-xs text-qc-muted">
                    {lowDemandHours.message ||
                      "Insufficient booking data to identify low-demand hours. At least 3 bookings are required."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lowDemandHours.slots.map((slot) => (
                    <div
                      key={slot.slotLabel}
                      className="flex items-center justify-between border border-white/5 bg-qc-panel p-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-qc-white">
                          {slot.slotLabel}
                        </p>
                        <p className="text-[11px] text-cyan-400">
                          Low utilization ({slot.bookingCount} match{slot.bookingCount > 1 ? "es" : ""})
                        </p>
                      </div>

                      <span className="text-[10px] uppercase tracking-wider text-qc-muted border border-white/10 bg-white/5 px-2 py-0.5">
                        Off-Peak Slot
                      </span>
                    </div>
                  ))}
                  <p className="text-[11px] text-qc-muted italic mt-2">
                    Tip: Target these hours with promo pricing to boost off-peak court occupancy.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Popular Sports & Popular Courts Performance */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Popular Sports */}
            <div className="border border-white/10 bg-qc-charcoal p-5">
              <div className="flex items-center gap-2 border-b border-white/8 pb-3 mb-4">
                <Trophy className="h-4 w-4 text-qc-lime" />
                <h3 className="font-display text-base uppercase tracking-wider text-qc-white">
                  Most Booked Sports
                </h3>
              </div>

              {popularSports.length === 0 ? (
                <p className="text-xs text-qc-muted py-6 text-center">
                  No sport activity registered yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {popularSports.map((s) => (
                    <div key={s.sportId} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-qc-white">{s.sportName}</span>
                        <span className="text-qc-muted">
                          {s.bookingCount} bookings ({s.percentage}%) • {formatINR(s.revenue)}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full bg-qc-lime transition-all duration-500"
                          style={{ width: `${s.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Popular Courts Performance */}
            <div className="border border-white/10 bg-qc-charcoal p-5">
              <div className="flex items-center gap-2 border-b border-white/8 pb-3 mb-4">
                <Grid3X3 className="h-4 w-4 text-qc-lime" />
                <h3 className="font-display text-base uppercase tracking-wider text-qc-white">
                  Court Performance
                </h3>
              </div>

              {popularCourts.length === 0 ? (
                <p className="text-xs text-qc-muted py-6 text-center">
                  No courts configured or active.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-wider text-qc-muted">
                        <th className="pb-2">Court</th>
                        <th className="pb-2">Sport</th>
                        <th className="pb-2 text-center">Bookings</th>
                        <th className="pb-2 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {popularCourts.map((c) => (
                        <tr key={c.courtId} className="hover:bg-white/5">
                          <td className="py-2.5 font-medium text-qc-white">{c.courtName}</td>
                          <td className="py-2.5 text-qc-muted">{c.sportName}</td>
                          <td className="py-2.5 text-center font-mono text-qc-white">
                            {c.bookingCount}
                          </td>
                          <td className="py-2.5 text-right font-mono text-qc-lime">
                            {formatINR(c.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
