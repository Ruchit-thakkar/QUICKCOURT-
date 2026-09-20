"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/SectionLabel";
import {
  Ticket,
  IndianRupee,
  Users,
  Grid3X3,
  PlusCircle,
  Building2,
  CalendarCheck,
  Inbox,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  X,
  MapPin,
  Sparkles,
  AlertTriangle,
  Power,
  Loader2,
} from "lucide-react";
import { updateBusinessStatus } from "@/services/businessService";
import { subscribeToIncomingBookings } from "@/services/bookingService";
import { formatINR } from "@/lib/format";
import type { OwnerBooking } from "@/types";

const COMMON_CLOSE_REASONS = [
  "Closed for today",
  "Maintenance",
  "Private event",
  "Holiday",
  "Fully booked",
  "Staff unavailable",
  "Emergency",
  "Other",
];

export default function OwnerDashboardPage() {
  const { user, ownerProfile, businessProfile, refreshBusinessProfile } = useAuth();
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Live Bookings State
  const [bookings, setBookings] = useState<OwnerBooking[]>([]);

  // Business Status & Close Modal States
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [selectedReasonOption, setSelectedReasonOption] = useState("Maintenance");
  const [customReasonText, setCustomReasonText] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Subscribe to real bookings for this business
  useEffect(() => {
    if (!businessProfile?.businessId) return;
    const unsubscribe = subscribeToIncomingBookings(
      businessProfile.businessId,
      (data) => {
        setBookings(data);
      },
      undefined,
      user?.uid
    );
    return () => unsubscribe();
  }, [businessProfile?.businessId, user?.uid]);

  // Today's metrics calculation
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const todayBookings = useMemo(() => {
    return bookings.filter(
      (b) => b.gameDate === todayStr && b.bookingStatus !== "cancelled"
    );
  }, [bookings, todayStr]);

  const todayRevenue = useMemo(() => {
    return todayBookings.reduce((sum, b) => sum + (b.pricing?.total || 0), 0);
  }, [todayBookings]);

  const todayCustomersCount = useMemo(() => {
    return todayBookings.reduce((sum, b) => sum + (b.playerCount || 1), 0);
  }, [todayBookings]);

  const activeCourtsCount = useMemo(() => {
    return businessProfile?.courts?.length || 1;
  }, [businessProfile?.courts]);

  // Next upcoming game
  const nextGame = useMemo(() => {
    const upcoming = bookings.filter(
      (b) => b.bookingStatus !== "cancelled" && b.gameDate >= todayStr
    );
    return upcoming.length > 0 ? upcoming[0] : null;
  }, [bookings, todayStr]);

  const ownerName =
    businessProfile?.owner?.name ||
    ownerProfile?.name ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Facility Owner";

  const venueName = businessProfile?.businessName || "Your Sports Venue";
  const pinCode = businessProfile?.location?.pinCode || "";
  const categories = businessProfile?.categories || [];
  const businessStatus = businessProfile?.businessStatus || "open";
  const isOpen = businessStatus === "open";
  const closedReason = businessProfile?.closedReason || "";
  const closedMessage =
    businessProfile?.closedMessage ||
    "We are currently closed. Please check our business hours and visit us later.";

  // Format operating hours for display: "10:00 PM"
  const formatTime12h = (time24?: string) => {
    if (!time24) return "";
    const [h, m] = time24.split(":").map(Number);
    if (isNaN(h)) return time24;
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m || 0).padStart(2, "0")} ${period}`;
  };

  const closingTimeFormatted = businessProfile?.businessHours?.endTime
    ? formatTime12h(businessProfile.businessHours.endTime)
    : "10:00 PM";

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Handle Toggle Switch Click
  const handleToggleStatusClick = () => {
    setStatusError(null);
    if (isOpen) {
      // Prompt for reason before closing
      setSelectedReasonOption("Maintenance");
      setCustomReasonText("");
      setShowCloseModal(true);
    } else {
      // Directly reopen business without reason prompt
      handleReopen();
    }
  };

  const handleReopen = async () => {
    if (!businessProfile?.businessId) return;
    setUpdatingStatus(true);
    setStatusError(null);
    try {
      await updateBusinessStatus(businessProfile.businessId, "open", "");
      await refreshBusinessProfile();
    } catch (err: unknown) {
      console.error("Failed to reopen business:", err);
      setStatusError(err instanceof Error ? err.message : "Failed to reopen venue.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleConfirmClose = async () => {
    if (!businessProfile?.businessId) return;
    const finalReason =
      selectedReasonOption === "Other"
        ? (customReasonText.trim() || "Temporarily Closed")
        : (customReasonText.trim() ? customReasonText.trim() : selectedReasonOption);

    setUpdatingStatus(true);
    setStatusError(null);
    try {
      await updateBusinessStatus(businessProfile.businessId, "closed", finalReason);
      await refreshBusinessProfile();
      setShowCloseModal(false);
    } catch (err: unknown) {
      console.error("Failed to close business:", err);
      setStatusError(err instanceof Error ? err.message : "Failed to close venue.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <header className="flex flex-col gap-6 border-b border-white/8 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-[0.24em] text-qc-lime font-medium">
              QUICKCOURT Owner Dashboard
            </span>
            <span className="flex items-center gap-1.5 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] uppercase tracking-wider text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          </div>

          <h1 className="mt-2 font-display text-4xl text-qc-white md:text-5xl lg:text-6xl">
            Welcome back, {ownerName}
          </h1>

          {/* Venue & Location Badge */}
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <span className="font-display text-xl tracking-wide text-qc-lime">
              {venueName}
            </span>
            {pinCode && (
              <span className="flex items-center gap-1 border border-white/10 bg-qc-panel px-2 py-0.5 text-xs text-qc-muted font-mono">
                <MapPin className="h-3 w-3 text-qc-lime" /> PIN {pinCode}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-qc-muted">
              <Clock className="h-3.5 w-3.5 text-qc-lime/70" />
              {currentDate}
            </span>
          </div>

          {/* Active Sports Chips */}
          {categories.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-qc-muted mr-1">
                Hosted Sports:
              </span>
              {categories.map((cat) => (
                <span
                  key={cat}
                  className="border border-white/15 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium capitalize text-qc-white"
                >
                  {cat.replace("_", " ")}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Prominent Business Status Control Card */}
          <div className={`flex items-center justify-between gap-4 border px-4 py-2.5 transition-all ${
            isOpen
              ? "border-emerald-500/30 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
              : "border-red-500/30 bg-red-950/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
          }`}>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[9px] uppercase tracking-[0.16em] text-qc-muted font-medium">
                  Business Status
                </span>
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase ${
                  isOpen ? "text-emerald-400" : "text-red-400"
                }`}>
                  <span className={`h-2 w-2 rounded-full ${
                    isOpen ? "bg-emerald-400 animate-pulse" : "bg-red-400"
                  }`} />
                  {isOpen ? "OPEN" : "CLOSED"}
                </span>
              </div>
              <p className="text-[11px] text-white/70">
                {isOpen ? (
                  <span>Open until: <strong className="text-qc-white font-mono">{closingTimeFormatted}</strong></span>
                ) : (
                  <span>{closedReason || "Temporarily Closed"}</span>
                )}
              </p>
            </div>

            {/* Toggle Switch Button */}
            <button
              type="button"
              onClick={handleToggleStatusClick}
              disabled={updatingStatus}
              title={isOpen ? "Switch to Closed" : "Switch to Open"}
              className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-300 ease-in-out focus:outline-none disabled:opacity-50 ${
                isOpen
                  ? "border-emerald-500 bg-emerald-500/30"
                  : "border-red-500/60 bg-white/10"
              }`}
            >
              <span className="sr-only">Toggle Business Status</span>
              <span
                className={`pointer-events-none inline-flex h-7 w-7 transform items-center justify-center rounded-full text-[10px] font-bold transition duration-300 ease-in-out ${
                  isOpen
                    ? "translate-x-8 bg-emerald-400 text-qc-black shadow-lg"
                    : "translate-x-0 bg-red-500 text-white shadow-lg"
                }`}
              >
                {updatingStatus ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isOpen ? (
                  "ON"
                ) : (
                  "OFF"
                )}
              </span>
            </button>
          </div>

          <Button
            onClick={() => setShowBookingModal(true)}
            variant="secondary"
            size="sm"
            className="flex items-center gap-2"
          >
            <PlusCircle className="h-3.5 w-3.5 text-qc-lime" />
            Create Booking
          </Button>
          <Button href="/owner/business-profile" size="sm">
            Business Profile
          </Button>
        </div>
      </header>

      {/* Error notification if status update fails */}
      {statusError && (
        <div className="flex items-center justify-between border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300">
          <span>{statusError}</span>
          <button onClick={() => setStatusError(null)} className="text-red-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Prominent CLOSED Notice Banner when Closed */}
      {!isOpen && (
        <div className="border border-red-500/30 bg-red-950/20 p-5 md:p-6 space-y-3 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-red-500/20 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <h2 className="font-display text-xl text-red-400 tracking-wide">
                VENUE CURRENTLY CLOSED
              </h2>
            </div>
            <button
              onClick={handleReopen}
              disabled={updatingStatus}
              className="inline-flex items-center gap-2 border border-emerald-500/50 bg-emerald-500/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-300 hover:bg-emerald-500/30 transition disabled:opacity-50"
            >
              {updatingStatus ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
              Reopen Venue (Open)
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 pt-1 text-xs">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-qc-muted block mb-1">
                Reason:
              </span>
              <p className="font-medium text-qc-white bg-black/30 p-2.5 border border-white/5">
                {closedReason || "Maintenance"}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-qc-muted block mb-1">
                Message to Players & Staff:
              </span>
              <p className="text-white/80 bg-black/30 p-2.5 border border-white/5 italic">
                &ldquo;{closedMessage}&rdquo;
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Prominent OPEN Operating Status Bar when Open */}
      {isOpen && (
        <div className="border border-white/8 bg-qc-charcoal/50 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              OPEN
            </span>
            <span className="text-white/20">|</span>
            <span className="text-qc-muted">
              Operating Schedule: <strong className="text-qc-white font-mono font-normal">
                {formatTime12h(businessProfile?.businessHours?.startTime || "08:00")} → {closingTimeFormatted}
              </strong>
            </span>
          </div>

          <Link
            href="/owner/business-profile"
            className="text-qc-lime text-[11px] uppercase tracking-wider hover:underline"
          >
            Adjust Hours &rarr;
          </Link>
        </div>
      )}

      {/* Today's Overview */}
      <section>
        <div className="flex items-center justify-between">
          <SectionLabel>Today&apos;s Overview</SectionLabel>
          <span className="text-[10px] uppercase tracking-[0.16em] text-qc-muted">
            Live Daily Metrics
          </span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <OverviewCard
            icon={Ticket}
            label="Bookings"
            value={String(todayBookings.length)}
            subtext={todayBookings.length === 1 ? "1 game scheduled today" : `${todayBookings.length} games scheduled today`}
          />
          <OverviewCard
            icon={IndianRupee}
            label="Revenue"
            value={formatINR(todayRevenue)}
            subtext={`${formatINR(todayRevenue)} collected today`}
            accent
          />
          <OverviewCard
            icon={Users}
            label="Customers"
            value={String(todayCustomersCount)}
            subtext={`${todayCustomersCount} player check-ins`}
          />
          <OverviewCard
            icon={Grid3X3}
            label="Available Courts"
            value={String(activeCourtsCount)}
            subtext="Configured in business profile"
          />
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <SectionLabel>Quick Actions</SectionLabel>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <QuickActionCard
            title="Create Booking"
            description="Open interactive slot calendar to schedule court reservations."
            icon={PlusCircle}
            href="/owner/bookings"
            actionLabel="Schedule slot"
          />
          <QuickActionCard
            title="Business Profile"
            description="Update your sports arena info, photos, address, and amenities."
            icon={Building2}
            href="/owner/business-profile"
            actionLabel="Edit profile"
          />
          <QuickActionCard
            title="View Bookings"
            description="Review incoming reservations, match schedules, and cancellations."
            icon={CalendarCheck}
            href="/owner/bookings"
            actionLabel="Open calendar"
          />
        </div>
      </section>

      {/* Grid: Setup Progress & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity — Honest Empty State */}
        <section className="border border-white/10 bg-qc-charcoal/80 p-6">
          <div className="flex items-center justify-between border-b border-white/8 pb-4">
            <h3 className="font-display text-2xl text-qc-white">Recent Activity</h3>
            <Link
              href="/owner/bookings"
              className="text-[10px] uppercase tracking-[0.16em] text-qc-lime hover:underline"
            >
              View All ({bookings.length})
            </Link>
          </div>

          {bookings.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center border border-white/10 bg-qc-panel text-white/40">
                <Inbox className="h-6 w-6" />
              </div>
              <p className="mt-4 font-display text-xl text-qc-white">
                No activity yet
              </p>
              <p className="mt-1.5 max-w-sm text-xs text-qc-muted leading-relaxed">
                When players book courts or join games at your facility, incoming activities and slot confirmations will appear here in real-time.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-2.5">
              {bookings.slice(0, 4).map((b) => (
                <div
                  key={b.bookingId}
                  className="flex items-center justify-between border border-white/8 bg-qc-panel/60 p-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs text-qc-white capitalize">
                        {b.sport?.name}
                      </span>
                      <span className="text-[10px] text-qc-muted">
                        · {b.court?.name}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] font-mono text-qc-lime">
                      {b.gameDate} · {b.startTime} - {b.endTime}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-sm text-qc-white">
                      {formatINR(b.pricing?.total || 0)}
                    </p>
                    <span className="text-[9px] uppercase tracking-wider text-qc-muted">
                      {b.customer?.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Venue Setup Progress */}
        <section className="border border-white/10 bg-qc-charcoal/80 p-6">
          <div className="flex items-center justify-between border-b border-white/8 pb-4">
            <div>
              <h3 className="font-display text-2xl text-qc-white">
                Venue Onboarding
              </h3>
              <p className="mt-0.5 text-xs text-qc-muted">
                Complete these steps to go live on QuickCourt
              </p>
            </div>
            <span className="border border-qc-lime/30 bg-qc-lime/10 px-2 py-1 text-[10px] uppercase tracking-wider text-qc-lime font-medium">
              Step 2 of 4
            </span>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-start gap-3 border border-qc-lime/20 bg-qc-lime/5 p-3.5">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-qc-lime" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-qc-white">
                  1. Owner Account Created
                </p>
                <p className="text-[11px] text-qc-muted truncate">
                  Authenticated as {user?.email}
                </p>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-qc-lime">
                Done
              </span>
            </div>

            <div className="flex items-start gap-3 border border-qc-lime/20 bg-qc-lime/5 p-3.5">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-qc-lime" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-qc-white">
                  2. Business Profile Completed
                </p>
                <p className="text-[11px] text-qc-muted truncate">
                  {venueName} · PIN {pinCode || "Configured"}
                </p>
              </div>
              <Link
                href="/owner/business-profile"
                className="text-[10px] uppercase tracking-wider text-qc-lime hover:underline"
              >
                Edit
              </Link>
            </div>

            <div className="flex items-start gap-3 border border-white/5 bg-qc-panel/40 p-3.5 opacity-60">
              <Grid3X3 className="h-5 w-5 shrink-0 text-white/30" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-white/60">
                  3. Add Courts & Pricing (Phase 3)
                </p>
                <p className="text-[11px] text-white/40">
                  Define turf slots, hourly pricing, and capacity
                </p>
              </div>
              <span className="border border-white/10 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-white/30">
                Next
              </span>
            </div>

            <div className="flex items-start gap-3 border border-white/5 bg-qc-panel/40 p-3.5 opacity-60">
              <ShieldCheck className="h-5 w-5 shrink-0 text-white/30" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-white/60">
                  4. Enable QuickFill Demand Pool (Phase 3)
                </p>
                <p className="text-[11px] text-white/40">
                  Auto-fill empty hours with dynamic smart pricing
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Manual Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md border border-white/15 bg-qc-charcoal p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-display text-2xl text-qc-white">
                Create Manual Booking
              </h3>
              <button
                onClick={() => setShowBookingModal(false)}
                className="text-qc-muted hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs text-qc-muted">
              <p>
                Offline and manual booking scheduling is queued for <span className="text-qc-lime font-medium">Phase 3</span> after court inventory and slot configuration are connected.
              </p>
              <div className="border border-white/10 bg-qc-panel p-3 text-[11px]">
                <p className="font-medium text-qc-white">Planned Workflow:</p>
                <p className="mt-1">
                  1. Select court & sport → 2. Choose date & time slot → 3. Enter player phone & advance payment.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button size="sm" onClick={() => setShowBookingModal(false)}>
                Understood
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Close Business Reason Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg border border-white/15 bg-qc-charcoal p-6 md:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <h3 className="font-display text-2xl text-qc-white">
                  Close Business
                </h3>
              </div>
              <button
                onClick={() => setShowCloseModal(false)}
                disabled={updatingStatus}
                className="text-qc-muted hover:text-white disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <p className="text-sm font-medium text-qc-white">
                Why are you closing the business?
              </p>
              <p className="mt-0.5 text-xs text-qc-muted">
                Select a reason or enter custom details for players and visitors.
              </p>
            </div>

            {/* Predefined Reason Chips */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-[0.14em] text-qc-muted font-medium">
                Common Reasons:
              </span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {COMMON_CLOSE_REASONS.map((r) => {
                  const isSelected = selectedReasonOption === r;
                  return (
                    <button
                      type="button"
                      key={r}
                      onClick={() => {
                        setSelectedReasonOption(r);
                        if (r !== "Other") {
                          setCustomReasonText(r);
                        } else {
                          setCustomReasonText("");
                        }
                      }}
                      className={`border px-3 py-2 text-left text-xs transition ${
                        isSelected
                          ? "border-red-500 bg-red-500/20 text-white font-medium"
                          : "border-white/10 bg-qc-panel text-qc-muted hover:border-white/20 hover:text-white"
                      }`}
                    >
                      • {r}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Reason Input */}
            <div className="space-y-1.5">
              <label className="block text-xs uppercase tracking-[0.14em] text-qc-muted">
                Reason Details (Editable)
              </label>
              <input
                type="text"
                value={customReasonText}
                onChange={(e) => setCustomReasonText(e.target.value)}
                placeholder="Enter reason (e.g., Closed for maintenance, Private tournament)..."
                className="w-full border border-white/15 bg-qc-panel px-4 py-2.5 text-sm text-qc-white placeholder:text-white/25 focus:border-red-400 focus:outline-none"
              />
            </div>

            {/* Closed Message Preview */}
            <div className="border border-white/8 bg-black/40 p-3 text-xs">
              <span className="text-[10px] uppercase tracking-wider text-qc-muted block mb-0.5">
                Current Closed Notice:
              </span>
              <p className="text-white/70 italic">&ldquo;{closedMessage}&rdquo;</p>
            </div>

            {statusError && (
              <p className="text-xs text-red-400">{statusError}</p>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowCloseModal(false)}
                disabled={updatingStatus}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmClose}
                disabled={updatingStatus}
                className="bg-red-500 text-white hover:bg-red-600 border-red-500 gap-2"
              >
                {updatingStatus ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Closing...</span>
                  </>
                ) : (
                  <span>Close Business</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OverviewCard({
  icon: Icon,
  label,
  value,
  subtext,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtext: string;
  accent?: boolean;
}) {
  return (
    <article
      className={`border p-5 transition ${
        accent
          ? "border-qc-lime/30 bg-qc-lime/5"
          : "border-white/10 bg-qc-charcoal"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.2em] text-qc-muted">
          {label}
        </span>
        <Icon className={`h-4 w-4 ${accent ? "text-qc-lime" : "text-white/40"}`} />
      </div>
      <p className="mt-3 font-display text-4xl text-qc-white md:text-5xl">
        {value}
      </p>
      <p className="mt-2 text-[11px] text-qc-muted">{subtext}</p>
    </article>
  );
}

function QuickActionCard({
  title,
  description,
  icon: Icon,
  href,
  onClick,
  actionLabel,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  href?: string;
  onClick?: () => void;
  actionLabel: string;
}) {
  const content = (
    <div className="flex h-full flex-col justify-between border border-white/10 bg-qc-charcoal p-5 transition hover:border-qc-lime/40 hover:bg-qc-panel/60 group">
      <div>
        <div className="flex h-9 w-9 items-center justify-center border border-white/10 bg-qc-panel text-white/60 group-hover:border-qc-lime/30 group-hover:text-qc-lime">
          <Icon className="h-4 w-4" />
        </div>
        <h4 className="mt-3 font-display text-2xl text-qc-white group-hover:text-qc-lime">
          {title}
        </h4>
        <p className="mt-1 text-xs text-qc-muted leading-relaxed">
          {description}
        </p>
      </div>
      <div className="mt-5 flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-qc-lime font-medium">
        <span>{actionLabel}</span>
        <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition" />
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return <button type="button" onClick={onClick} className="text-left w-full h-full">{content}</button>;
}
