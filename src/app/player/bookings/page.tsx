"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  MapPin,
  Clock,
  Navigation,
  XCircle,
  AlertCircle,
  Loader2,
  Compass,
  ArrowRight,
  ShieldCheck,
  Calendar,
  X,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  subscribePlayerBookings,
  cancelBookingWithLock,
} from "@/services/bookingService";
import { canPlayerCancelBooking } from "@/services/cancellationRules";
import { getDiscoverableVenues } from "@/services/playerService";
import { formatINR } from "@/lib/format";
import { format12Hour } from "@/lib/slotGenerator";
import { getGoogleMapsDirectionsUrl } from "@/lib/geo";
import { Button } from "@/components/ui/Button";
import type { OwnerBooking, BusinessProfile } from "@/types";
import { cn } from "@/lib/cn";

export default function PlayerBookingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [bookings, setBookings] = useState<OwnerBooking[]>([]);
  const [venues, setVenues] = useState<BusinessProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "cancelled">("upcoming");

  // Detailed modal state
  const [selectedBooking, setSelectedBooking] = useState<OwnerBooking | null>(null);

  // Cancellation modal state
  const [cancelModalBooking, setCancelModalBooking] = useState<OwnerBooking | null>(null);
  const [cancellationReason, setCancellationReason] = useState("Change of plans");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Load venues for details & directions lookup
  useEffect(() => {
    async function loadVenues() {
      try {
        const v = await getDiscoverableVenues();
        setVenues(v);
      } catch (err) {
        console.error("Error loading venues for bookings:", err);
      }
    }
    loadVenues();
  }, []);

  // Real-time listener for player bookings
  useEffect(() => {
    if (!user) {
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
  }, [user]);

  // Today reference string YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  // Categorize bookings into Upcoming, Past, Cancelled
  const { upcomingBookings, pastBookings, cancelledBookings } = useMemo(() => {
    const upcoming: OwnerBooking[] = [];
    const past: OwnerBooking[] = [];
    const cancelled: OwnerBooking[] = [];

    bookings.forEach((b) => {
      if (b.bookingStatus === "cancelled") {
        cancelled.push(b);
      } else if (b.gameDate >= todayStr) {
        upcoming.push(b);
      } else {
        past.push(b);
      }
    });

    return {
      upcomingBookings: upcoming,
      pastBookings: past,
      cancelledBookings: cancelled,
    };
  }, [bookings, todayStr]);

  const currentTabBookings = useMemo(() => {
    if (activeTab === "upcoming") return upcomingBookings;
    if (activeTab === "past") return pastBookings;
    return cancelledBookings;
  }, [activeTab, upcomingBookings, pastBookings, cancelledBookings]);

  // Handle Cancellation Action
  const handleCancelBooking = async () => {
    if (!cancelModalBooking) return;
    setCancelling(true);
    setCancelError(null);

    try {
      await cancelBookingWithLock(
        cancelModalBooking.bookingId,
        cancellationReason.trim() || "Cancelled by player",
        "player"
      );

      // Close modal
      setCancelModalBooking(null);
      if (selectedBooking?.bookingId === cancelModalBooking.bookingId) {
        setSelectedBooking(null);
      }
    } catch (err: any) {
      setCancelError(err?.message || "Failed to cancel booking. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-qc-lime" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-qc-charcoal border border-white/15">
          <CalendarCheck className="h-6 w-6 text-qc-lime" />
        </div>
        <h1 className="font-display text-3xl text-qc-white">Player Sign In Required</h1>
        <p className="mt-2 text-xs text-qc-muted max-w-sm mx-auto">
          Sign in with your player account to access and manage your active and past venue reservations.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button href="/player/login" size="md">
            Sign In
          </Button>
          <Button href="/player/signup" variant="secondary" size="md">
            Join QuickCourt
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-5xl text-qc-white">
            My Bookings
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-qc-muted">
            Track upcoming matches, review past bookings, or manage cancellations
          </p>
        </div>

        <Link
          href="/player/discover"
          className="inline-flex items-center gap-2 border border-qc-lime bg-qc-lime/10 px-4 py-2 text-xs font-semibold text-qc-lime hover:bg-qc-lime hover:text-qc-black transition self-start"
        >
          <Compass className="h-3.5 w-3.5" />
          Book New Court
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10 mb-8 flex items-center gap-6">
        <button
          onClick={() => setActiveTab("upcoming")}
          className={cn(
            "pb-3 text-xs font-bold uppercase tracking-[0.16em] transition border-b-2 flex items-center gap-2",
            activeTab === "upcoming"
              ? "border-qc-lime text-qc-lime"
              : "border-transparent text-white/60 hover:text-white"
          )}
        >
          Upcoming ({upcomingBookings.length})
        </button>
        <button
          onClick={() => setActiveTab("past")}
          className={cn(
            "pb-3 text-xs font-bold uppercase tracking-[0.16em] transition border-b-2 flex items-center gap-2",
            activeTab === "past"
              ? "border-qc-lime text-qc-lime"
              : "border-transparent text-white/60 hover:text-white"
          )}
        >
          Past ({pastBookings.length})
        </button>
        <button
          onClick={() => setActiveTab("cancelled")}
          className={cn(
            "pb-3 text-xs font-bold uppercase tracking-[0.16em] transition border-b-2 flex items-center gap-2",
            activeTab === "cancelled"
              ? "border-qc-lime text-qc-lime"
              : "border-transparent text-white/60 hover:text-white"
          )}
        >
          Cancelled ({cancelledBookings.length})
        </button>
      </div>

      {/* Bookings List / Grid */}
      {currentTabBookings.length === 0 ? (
        <div className="border border-white/10 bg-qc-panel p-12 text-center my-6">
          <CalendarCheck className="mx-auto h-12 w-12 text-white/20 mb-3" />
          <h2 className="font-display text-2xl text-qc-white">
            {activeTab === "upcoming"
              ? "No Upcoming Bookings"
              : activeTab === "past"
              ? "No Past Bookings"
              : "No Cancelled Bookings"}
          </h2>
          <p className="mt-1 text-xs text-qc-muted max-w-sm mx-auto">
            {activeTab === "upcoming"
              ? "You do not have any upcoming games scheduled. Explore nearby courts to reserve a slot!"
              : activeTab === "past"
              ? "You have not completed any bookings yet."
              : "No cancelled bookings on record."}
          </p>
          {activeTab === "upcoming" && (
            <div className="mt-6">
              <Link
                href="/player/discover"
                className="inline-flex items-center gap-2 border border-qc-lime bg-qc-lime px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-qc-black transition hover:bg-qc-lime/90"
              >
                Find & Book Courts →
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentTabBookings.map((booking) => {
            const venue = venues.find((v) => v.businessId === booking.businessId);
            const venueName = venue?.businessName || "Sports Facility";
            const cityName = venue?.location?.city || "";
            const isConfirmed = booking.bookingStatus === "confirmed";
            const isCancelled = booking.bookingStatus === "cancelled";

            return (
              <article
                key={booking.bookingId}
                className="border border-white/10 bg-qc-panel p-5 flex flex-col justify-between transition hover:border-white/20 shadow-lg"
              >
                <div>
                  {/* Top Bar: Status & Booking ID */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono text-[11px] font-bold text-qc-lime">
                      {booking.readableId || booking.bookingId}
                    </span>

                    {isConfirmed ? (
                      <span className="inline-flex items-center gap-1 border border-qc-lime/30 bg-qc-lime/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-qc-lime font-semibold">
                        <CheckCircle2 className="h-3 w-3" />
                        Confirmed
                      </span>
                    ) : isCancelled ? (
                      <span className="inline-flex items-center gap-1 border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-red-400 font-semibold">
                        <XCircle className="h-3 w-3" />
                        Cancelled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 border border-white/20 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/70">
                        {booking.bookingStatus}
                      </span>
                    )}
                  </div>

                  {/* Venue & Sport */}
                  <h3 className="font-display text-2xl text-qc-white line-clamp-1">
                    {venueName}
                  </h3>
                  <p className="text-xs text-qc-muted mt-0.5 line-clamp-1">
                    {booking.sport?.name || "Sport"} · {booking.court?.name || "Court"}
                    {cityName ? ` · ${cityName}` : ""}
                  </p>

                  {/* Date & Time pills */}
                  <div className="my-4 space-y-2 text-xs border-y border-white/5 py-3">
                    <div className="flex items-center gap-2 text-white/80">
                      <Calendar className="h-3.5 w-3.5 text-qc-lime shrink-0" />
                      <span>{booking.gameDate}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/80">
                      <Clock className="h-3.5 w-3.5 text-qc-lime shrink-0" />
                      <span>
                        {format12Hour(booking.startTime)} – {format12Hour(booking.endTime)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer: Amount & Actions */}
                <div className="pt-2 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-qc-muted block">
                      Price
                    </span>
                    <span className="text-base font-bold text-qc-lime">
                      {formatINR(booking.price || booking.pricing?.total || 0)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View Details modal trigger */}
                    <button
                      onClick={() => setSelectedBooking(booking)}
                      className="border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:text-white hover:border-white/30 transition"
                    >
                      Details
                    </button>

                    {/* Cancel trigger: only if allowed by cancellation rules */}
                    {isConfirmed && activeTab === "upcoming" && canPlayerCancelBooking(booking).allowed && (
                      <button
                        onClick={() => {
                          setCancelError(null);
                          setCancelModalBooking(booking);
                        }}
                        className="border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20 transition"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* BOOKING DETAILS MODAL */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg border border-white/20 bg-qc-charcoal p-6 sm:p-8 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4 mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-qc-lime">
                  Booking Receipt
                </span>
                <h3 className="font-display text-2xl sm:text-3xl text-qc-white mt-1">
                  Reservation Details
                </h3>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-white/60 hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Details Grid */}
            <div className="space-y-3 text-xs border border-white/8 bg-qc-panel p-4 mb-4">
              <div className="flex justify-between">
                <span className="text-qc-muted">Booking ID</span>
                <span className="font-mono font-bold text-qc-lime">
                  {selectedBooking.readableId || selectedBooking.bookingId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-qc-muted">Status</span>
                <span className="font-semibold uppercase tracking-wider text-qc-white">
                  {selectedBooking.bookingStatus}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-qc-muted">Venue</span>
                <span className="font-semibold text-qc-white">
                  {venues.find((v) => v.businessId === selectedBooking.businessId)?.businessName ||
                    "Sports Facility"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-qc-muted">Sport</span>
                <span className="font-semibold text-qc-white">
                  {selectedBooking.sport?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-qc-muted">Court</span>
                <span className="font-semibold text-qc-white">
                  {selectedBooking.court?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-qc-muted">Date</span>
                <span className="font-semibold text-qc-white">
                  {selectedBooking.gameDate}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-qc-muted">Time</span>
                <span className="font-semibold text-qc-lime">
                  {format12Hour(selectedBooking.startTime)} – {format12Hour(selectedBooking.endTime)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-white/5 font-bold text-sm">
                <span className="text-qc-white">Total Amount</span>
                <span className="text-qc-lime">
                  {formatINR(selectedBooking.price || selectedBooking.pricing?.total || 0)}
                </span>
              </div>

              {selectedBooking.cancellation && (
                <div className="mt-3 pt-3 border-t border-red-500/20 text-red-400">
                  <span className="font-semibold block">Cancellation Reason:</span>
                  <span>{selectedBooking.cancellation.reason}</span>
                </div>
              )}
            </div>

            {/* Google Maps Directions */}
            {(() => {
              const venue = venues.find((v) => v.businessId === selectedBooking.businessId);
              const dirUrl = getGoogleMapsDirectionsUrl(
                venue?.location,
                venue?.businessName
              );
              return (
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <a
                    href={dirUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 border border-qc-lime bg-qc-lime/15 py-2.5 text-xs font-bold uppercase tracking-wider text-qc-lime hover:bg-qc-lime hover:text-qc-black transition text-center"
                  >
                    <Navigation className="h-4 w-4" />
                    Get Directions
                  </a>
                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="border border-white/15 px-4 py-2.5 text-xs text-white/70 hover:text-white"
                  >
                    Close
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* CANCELLATION CONFIRMATION DIALOG */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-md border border-red-500/40 bg-qc-charcoal p-6 sm:p-8 shadow-2xl">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 border border-red-500/40 text-red-400">
              <XCircle className="h-6 w-6" />
            </div>

            <h3 className="font-display text-2xl sm:text-3xl text-qc-white text-center">
              Cancel Booking?
            </h3>
            <p className="mt-2 text-xs text-qc-muted text-center">
              Are you sure you want to cancel this booking? The slot will immediately be released and made available for other players.
            </p>

            {cancelError && (
              <div className="mt-3 flex items-center gap-2 border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{cancelError}</span>
              </div>
            )}

            <div className="my-4 border border-white/10 bg-qc-panel p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-qc-muted">Booking:</span>
                <span className="font-mono text-qc-white">{cancelModalBooking.readableId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-qc-muted">Date & Time:</span>
                <span className="text-qc-white">
                  {cancelModalBooking.gameDate} ({format12Hour(cancelModalBooking.startTime)})
                </span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-[11px] uppercase tracking-wider text-qc-muted mb-1">
                Reason for Cancellation
              </label>
              <input
                type="text"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Reason (optional)"
                className="w-full border border-white/15 bg-qc-panel px-3 py-2 text-xs text-qc-white focus:border-red-400 focus:outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCancelBooking}
                disabled={cancelling}
                className="flex-1 bg-red-500 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                {cancelling ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Cancelling...
                  </span>
                ) : (
                  "Confirm Cancellation"
                )}
              </button>
              <button
                onClick={() => setCancelModalBooking(null)}
                disabled={cancelling}
                className="flex-1 border border-white/15 py-2.5 text-xs text-white/70 hover:text-white"
              >
                Keep Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
