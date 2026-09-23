"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { subscribePlayerBookings } from "@/services/bookingService";
import { calculatePlayerActivity } from "@/services/analyticsService";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/cn";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import type { OwnerBooking, PlayerActivitySummary } from "@/types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Activity,
  IndianRupee,
  Trophy,
  MapPin,
  CalendarCheck,
  Compass,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Loader2,
  Calendar,
} from "lucide-react";

const tooltipStyle = {
  backgroundColor: "#101010",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#ffffff",
  fontSize: 12,
  borderRadius: 0,
};

export default function PlayerActivityPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<OwnerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewScope, setViewScope] = useState<"allTime" | "thisMonth">("allTime");
  const [businessNames, setBusinessNames] = useState<Record<string, string>>({});

  // Subscribe to real player bookings from Firestore
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribePlayerBookings(
      user.uid,
      (data) => {
        setBookings(data);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load player bookings:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Fetch business venue names for unique venues
  useEffect(() => {
    if (bookings.length === 0) return;

    const uniqueIds = Array.from(new Set(bookings.map((b) => b.businessId).filter(Boolean)));
    const missing = uniqueIds.filter((id) => !businessNames[id]);
    if (missing.length === 0) return;

    let active = true;
    Promise.all(
      missing.map(async (bId) => {
        try {
          const docSnap = await getDoc(doc(db, "businesses", bId));
          if (docSnap.exists()) {
            return { id: bId, name: docSnap.data().businessName || "Sports Venue" };
          }
        } catch {
          // ignore lookup errors
        }
        return { id: bId, name: "Sports Venue" };
      })
    ).then((results) => {
      if (!active) return;
      setBusinessNames((prev) => {
        const next = { ...prev };
        results.forEach((r) => {
          if (r) next[r.id] = r.name;
        });
        return next;
      });
    });

    return () => {
      active = false;
    };
  }, [bookings, businessNames]);

  // Calculate player activity stats
  const activity: PlayerActivitySummary = useMemo(() => {
    return calculatePlayerActivity(bookings, businessNames);
  }, [bookings, businessNames]);

  // Current month label (e.g. September)
  const currentMonthName = useMemo(() => {
    return new Date().toLocaleDateString("en-IN", { month: "long" });
  }, []);

  const activeSpending = viewScope === "thisMonth" ? activity.thisMonthSpent : activity.totalSpent;
  const activeMatches =
    viewScope === "thisMonth"
      ? activity.thisMonthBookings
      : activity.totalBookings - activity.cancelledBookings;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/8 pb-6">
        <div>
          <SectionLabel>Player Activity</SectionLabel>
          <h1 className="mt-2 font-display text-3xl sm:text-5xl text-qc-white">
            My Sports Activity
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-qc-muted">
            Track your matches, total investment in sports, favorite venues, and playing streaks.
          </p>
        </div>

        {/* Scope Selector (All Time vs This Month) */}
        <div className="flex items-center gap-1 border border-white/10 bg-qc-charcoal p-1 self-start sm:self-auto">
          <button
            onClick={() => setViewScope("allTime")}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition",
              viewScope === "allTime"
                ? "bg-qc-lime text-qc-black"
                : "text-white/60 hover:text-white"
            )}
          >
            All Time
          </button>
          <button
            onClick={() => setViewScope("thisMonth")}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition",
              viewScope === "thisMonth"
                ? "bg-qc-lime text-qc-black"
                : "text-white/60 hover:text-white"
            )}
          >
            This Month ({currentMonthName})
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center gap-3 border border-white/10 bg-qc-charcoal py-16 text-sm text-qc-muted">
          <Loader2 className="h-5 w-5 animate-spin text-qc-lime" />
          <span>Loading your match records...</span>
        </div>
      )}

      {/* Empty state when player has 0 bookings */}
      {!loading && activity.totalBookings === 0 && (
        <div className="border border-white/10 bg-qc-charcoal p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-none border border-qc-lime/40 bg-qc-lime/10 mx-auto text-qc-lime">
            <Trophy className="h-7 w-7" />
          </div>
          <h2 className="font-display text-2xl text-qc-white">
            No Sports Activity Yet
          </h2>
          <p className="text-xs sm:text-sm text-qc-muted leading-relaxed">
            Your match statistics, spending history, favorite sports, and visited venues will
            automatically appear here once you book your first game.
          </p>
          <div className="pt-2">
            <Link
              href="/player/discover"
              className="inline-flex items-center gap-2 border border-qc-lime bg-qc-lime px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-qc-black hover:bg-qc-lime/90 transition"
            >
              <Compass className="h-4 w-4" />
              Discover Nearby Venues
            </Link>
          </div>
        </div>
      )}

      {/* Main Content when bookings exist */}
      {!loading && activity.totalBookings > 0 && (
        <>
          {/* Overview Stat Cards (5 Cards) */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {/* Total Spending */}
            <div className="border border-white/10 bg-qc-charcoal p-5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-qc-muted">
                  {viewScope === "thisMonth" ? "Month Spending" : "Total Spending"}
                </span>
                <IndianRupee className="h-4 w-4 text-qc-lime" />
              </div>
              <p className="mt-3 font-display text-3xl text-qc-white md:text-4xl">
                {formatINR(activeSpending)}
              </p>
              <p className="mt-2 text-xs text-qc-muted">
                {viewScope === "thisMonth" ? `In ${currentMonthName}` : "Across all valid matches"}
              </p>
            </div>

            {/* Total Matches */}
            <div className="border border-white/10 bg-qc-charcoal p-5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-qc-muted">
                  Matches Reserved
                </span>
                <CalendarCheck className="h-4 w-4 text-qc-lime" />
              </div>
              <p className="mt-3 font-display text-3xl text-qc-white md:text-4xl">
                {activeMatches}
              </p>
              <p className="mt-2 text-xs text-qc-muted">
                {activity.cancelledBookings > 0
                  ? `${activity.cancelledBookings} cancelled bookings excluded`
                  : "All matches confirmed"}
              </p>
            </div>

            {/* Favorite Sport */}
            <div className="border border-white/10 bg-qc-charcoal p-5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-qc-muted">
                  Favorite Sport
                </span>
                <Trophy className="h-4 w-4 text-qc-lime" />
              </div>
              <p className="mt-3 font-display text-2xl text-qc-white md:text-3xl truncate">
                {activity.favoriteSport || "Not enough activity"}
              </p>
              <p className="mt-2 text-xs text-qc-muted">
                Most played discipline
              </p>
            </div>

            {/* Favorite Venue */}
            <div className="border border-white/10 bg-qc-charcoal p-5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-qc-muted">
                  Favorite Venue
                </span>
                <MapPin className="h-4 w-4 text-qc-lime" />
              </div>
              <p className="mt-3 font-display text-xl text-qc-white md:text-2xl truncate">
                {activity.favoriteVenue ? activity.favoriteVenue.businessName : "No favorite yet"}
              </p>
              <p className="mt-2 text-xs text-qc-muted">
                {activity.favoriteVenue
                  ? `${activity.favoriteVenue.bookingCount} match${activity.favoriteVenue.bookingCount > 1 ? "es" : ""} played here`
                  : "Book games to establish top venue"}
              </p>
            </div>

            {/* Venues Visited */}
            <div className="border border-white/10 bg-qc-charcoal p-5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-qc-muted">
                  Venues Visited
                </span>
                <Compass className="h-4 w-4 text-qc-lime" />
              </div>
              <p className="mt-3 font-display text-3xl text-qc-white md:text-4xl">
                {activity.uniqueVenuesVisited}
              </p>
              <p className="mt-2 text-xs text-qc-muted">
                Unique sports facilities
              </p>
            </div>
          </div>

          {/* Monthly Spotlight Banner (e.g. Your September Activity) */}
          <div className="border border-qc-lime/30 bg-qc-lime/5 p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-1.5 border border-qc-lime/40 bg-qc-lime/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-qc-lime mb-2">
                  <Sparkles className="h-3 w-3" />
                  Monthly Spotlight
                </div>
                <h2 className="font-display text-2xl md:text-3xl text-qc-white">
                  Your {currentMonthName} Activity
                </h2>
                <p className="mt-1 text-xs md:text-sm text-qc-muted max-w-xl">
                  {activity.thisMonthBookings > 0
                    ? `You have reserved ${activity.thisMonthBookings} match${activity.thisMonthBookings > 1 ? "es" : ""} this month, investing ${formatINR(activity.thisMonthSpent)} in sports and fitness.`
                    : `You haven't played any matches in ${currentMonthName} yet. Reserve a court to stay active!`}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <Link
                  href="/player/discover"
                  className="inline-flex items-center gap-2 border border-qc-lime bg-qc-lime px-4 py-2 text-xs font-bold uppercase tracking-wider text-qc-black hover:bg-qc-lime/90 transition"
                >
                  <Compass className="h-3.5 w-3.5" />
                  Book A Court
                </Link>
                <Link
                  href="/player/bookings"
                  className="inline-flex items-center gap-2 border border-white/10 bg-qc-charcoal px-4 py-2 text-xs font-medium uppercase tracking-wider text-white hover:bg-white/5 transition"
                >
                  <CalendarCheck className="h-3.5 w-3.5" />
                  View Schedule
                </Link>
              </div>
            </div>
          </div>

          {/* Sports Breakdown & Monthly Trends Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Sports Breakdown */}
            <div className="border border-white/10 bg-qc-charcoal p-5">
              <div className="flex items-center justify-between border-b border-white/8 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-qc-lime" />
                  <h3 className="font-display text-base uppercase tracking-wider text-qc-white">
                    Sports Discipline Breakdown
                  </h3>
                </div>
                <span className="text-[10px] text-qc-muted uppercase tracking-wider">
                  Matches & Spend
                </span>
              </div>

              {activity.sportBreakdown.length === 0 ? (
                <p className="text-xs text-qc-muted py-6 text-center">
                  No sports data recorded yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {activity.sportBreakdown.map((s) => {
                    const totalValidMatches = Math.max(1, activity.totalBookings - activity.cancelledBookings);
                    const pct = Math.round((s.count / totalValidMatches) * 100);
                    return (
                      <div key={s.sportName} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-qc-white">
                            {s.sportName}
                          </span>
                          <span className="text-qc-muted">
                            {s.count} match{s.count > 1 ? "es" : ""} ({pct}%) • {formatINR(s.spent)}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full bg-qc-lime transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Monthly Trends (Past 6 Months) */}
            <div className="border border-white/10 bg-qc-panel p-5">
              <div className="flex items-center justify-between border-b border-white/8 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-qc-lime" />
                  <h3 className="font-display text-base uppercase tracking-wider text-qc-white">
                    Monthly Activity Timeline
                  </h3>
                </div>
                <span className="text-[10px] text-qc-muted uppercase tracking-wider">
                  Past 6 Months
                </span>
              </div>

              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activity.monthlyTrends}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                      dataKey="monthLabel"
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
                      formatter={(v: any, name: any) => [
                        name === "spent" ? `₹${v}` : `${v} matches`,
                        name === "spent" ? "Spending" : "Matches",
                      ]}
                    />
                    <Bar
                      dataKey="bookings"
                      fill="#c8f542"
                      radius={[0, 0, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
