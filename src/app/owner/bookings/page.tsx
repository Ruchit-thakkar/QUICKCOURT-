"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  subscribeToIncomingBookings,
  subscribeToDateBookings,
  subscribeToBlockedSlots,
  subscribeToDateAvailability,
  bookSlotAtomically,
  createManualBooking,
  confirmBooking,
  cancelBooking,
  cancelBookingWithLock,
  markBookingCompleted,
  markBookingNoShow,
  blockSlotAtomically,
  unblockSlot,
  generateReadableBookingId,
} from "@/services/bookingService";
import {
  generateSlotsForCourt,
  getNowInTimezone,
  format12Hour,
  timeToMinutes,
  minutesToTime,
} from "@/lib/slotGenerator";
import { ALL_SPORTS_CATEGORIES } from "@/components/owner/BusinessProfileForm";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/cn";
import type {
  OwnerBooking,
  VenueCourt,
  BlockedSlot,
  BookingSource,
  GeneratedSlot,
  SlotLockData,
  BookingStatus,
  PaymentStatus,
} from "@/types";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  Check,
  Lock,
  Unlock,
  Ban,
  Ticket,
  Grid3X3,
  Layers,
  ArrowRight,
} from "lucide-react";

export default function OwnerBookingsPage() {
  const { user, businessProfile } = useAuth();

  // Active view: "grounds" (Grounds & Real-time Slots) or "table" (All Bookings Table)
  const [viewMode, setViewMode] = useState<"grounds" | "table">("grounds");

  // Selected date for Ground Slots view (default today in venue timezone)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const tz = businessProfile?.businessHours?.timezone || "Asia/Kolkata";
    return getNowInTimezone(tz).dateStr;
  });

  // Real-time data states
  const [bookings, setBookings] = useState<OwnerBooking[]>([]); // all incoming bookings
  const [dateBookings, setDateBookings] = useState<OwnerBooking[]>([]); // date-specific bookings
  const [dateBlockedSlots, setDateBlockedSlots] = useState<BlockedSlot[]>([]); // date-specific blocks
  const [dateSlotLocks, setDateSlotLocks] = useState<SlotLockData[]>([]); // live slot locks
  const [loadingAll, setLoadingAll] = useState(true);
  const [loadingDate, setLoadingDate] = useState(true);

  // Selected booking for detailed drawer view
  const [inspectBooking, setInspectBooking] = useState<OwnerBooking | null>(null);

  // Table view filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewTab, setViewTab] = useState<"all" | "today" | "upcoming" | "past" | "cancelled">("all");

  // Manual New Booking Modal state
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [modalCourtId, setModalCourtId] = useState<string>("");
  const [modalSportId, setModalSportId] = useState<string>("");
  const [modalDate, setModalDate] = useState<string>(selectedDate);
  const [modalSlot, setModalSlot] = useState<GeneratedSlot | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [playerCount, setPlayerCount] = useState("2");
  const [bookingAmount, setBookingAmount] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("paid");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card" | "offline">("cash");
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Slot blocking modal
  const [blockingSlot, setBlockingSlot] = useState<{
    court: VenueCourt;
    slot: GeneratedSlot;
  } | null>(null);
  const [blockReason, setBlockReason] = useState<string>("Maintenance");
  const [customReason, setCustomReason] = useState<string>("");

  // Actions loading
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Cancellation modal
  const [cancelModalBooking, setCancelModalBooking] = useState<OwnerBooking | null>(null);
  const [cancellationReason, setCancellationReason] = useState("Customer requested cancellation");

  // Business profile categories & courts
  const businessCategories = useMemo(() => {
    return businessProfile?.categories || [];
  }, [businessProfile]);

  const courts: VenueCourt[] = useMemo(() => {
    if (businessProfile?.courts && businessProfile.courts.length > 0) {
      return businessProfile.courts;
    }
    const fallbackSport = businessCategories[0] || "cricket";
    return [
      {
        courtId: "default_court_1",
        name: "Ground 1",
        sportId: fallbackSport,
        sportName: "Cricket",
        pricePerHour: 800,
        slotDurationMinutes: businessProfile?.slotDurationMinutes || 60,
        status: "active",
      },
    ];
  }, [businessProfile, businessCategories]);

  // Active (bookable) courts
  const activeCourts = useMemo(() => {
    return courts.filter((c) => c.status !== "inactive" && c.active !== false);
  }, [courts]);

  // Real-time listener for ALL incoming bookings (for table & tab counters)
  useEffect(() => {
    if (!businessProfile?.businessId) {
      setLoadingAll(false);
      return;
    }

    setLoadingAll(true);
    const unsubscribe = subscribeToIncomingBookings(
      businessProfile.businessId,
      (data) => {
        setBookings(data);
        setLoadingAll(false);
      },
      (err) => {
        console.error("Failed to stream all bookings:", err);
        setLoadingAll(false);
      },
      user?.uid
    );

    return () => unsubscribe();
  }, [businessProfile?.businessId, user?.uid]);

  // Real-time listeners for SELECTED DATE (Authoritative Live Availability)
  useEffect(() => {
    if (!businessProfile?.businessId || !selectedDate) {
      setLoadingDate(false);
      return;
    }

    setLoadingDate(true);

    // 1. Live bookings for selected date (with customer info)
    const unsubBookings = subscribeToDateBookings(
      businessProfile.businessId,
      selectedDate,
      (bks) => {
        setDateBookings(bks);
        setLoadingDate(false);
      },
      (err) => {
        console.error("Date bookings stream error:", err);
        setLoadingDate(false);
      }
    );

    // 2. Live blocked slots for selected date
    const unsubBlocks = subscribeToBlockedSlots(
      businessProfile.businessId,
      selectedDate,
      (blks) => {
        setDateBlockedSlots(blks);
      },
      (err) => console.error("Date blocks stream error:", err)
    );

    // 3. Live slot locks for selected date (prevent race condition)
    const unsubLocks = subscribeToDateAvailability(
      businessProfile.businessId,
      selectedDate,
      (lcks) => {
        setDateSlotLocks(lcks);
      },
      (err) => console.error("Date slot locks stream error:", err)
    );

    return () => {
      unsubBookings();
      unsubBlocks();
      unsubLocks();
    };
  }, [businessProfile?.businessId, selectedDate]);

  // Today reference in business timezone
  const todayStr = useMemo(() => {
    const tz = businessProfile?.businessHours?.timezone || "Asia/Kolkata";
    return getNowInTimezone(tz).dateStr;
  }, [businessProfile?.businessHours?.timezone]);

  // Quick Date Navigation
  const handleStepDate = (days: number) => {
    const current = new Date(`${selectedDate}T12:00:00`);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split("T")[0]);
  };

  // Open New Booking Modal for a specific slot
  const handleOpenSlotBooking = (court: VenueCourt, slot: GeneratedSlot) => {
    if (slot.isBooked) {
      // Find matching booking to inspect
      const match =
        dateBookings.find(
          (b) =>
            b.court.courtId === court.courtId &&
            b.startTime === slot.startTime &&
            b.bookingStatus !== "cancelled"
        ) ||
        bookings.find(
          (b) =>
            b.court.courtId === court.courtId &&
            b.gameDate === selectedDate &&
            b.startTime === slot.startTime &&
            b.bookingStatus !== "cancelled"
        );

      if (match) {
        setInspectBooking(match);
      }
      return;
    }

    if (slot.isBlocked) {
      // Prompt unblock
      handleUnblockSlot(court.courtId, slot);
      return;
    }

    // Available slot -> open manual booking pre-filled
    setModalCourtId(court.courtId);
    setModalSportId(court.sportId || businessCategories[0] || "cricket");
    setModalDate(selectedDate);
    setModalSlot(slot);
    setBookingAmount(String(slot.price));
    setModalError(null);
    setShowNewBookingModal(true);
  };

  // Open generic "+ New Booking" modal
  const handleOpenGenericNewBooking = () => {
    const firstCourt = activeCourts[0] || courts[0];
    setModalCourtId(firstCourt.courtId);
    setModalSportId(firstCourt.sportId || businessCategories[0] || "cricket");
    setModalDate(selectedDate);
    setModalSlot(null);
    const duration = firstCourt.slotDurationMinutes || 60;
    const price = firstCourt.pricePerHour || 800;
    setBookingAmount(String(duration === 30 ? Math.round(price / 2) : price));
    setModalError(null);
    setShowNewBookingModal(true);
  };

  // Submit Manual Booking
  const handleConfirmManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!modalSlot) {
      setModalError("Please select an available time slot.");
      return;
    }
    if (!customerName.trim()) {
      setModalError("Customer name is required.");
      return;
    }
    if (!customerPhone.trim() || customerPhone.replace(/\D/g, "").length < 7) {
      setModalError("Please enter a valid phone number.");
      return;
    }
    if (!businessProfile?.businessId || !user?.uid) {
      setModalError("Session missing. Please refresh.");
      return;
    }

    const targetCourt = courts.find((c) => c.courtId === modalCourtId) || courts[0];
    const sportObj = ALL_SPORTS_CATEGORIES.find((s) => s.id === modalSportId);

    setSubmittingBooking(true);

    try {
      await bookSlotAtomically({
        businessId: businessProfile.businessId,
        ownerId: user.uid,
        courtId: targetCourt.courtId,
        courtName: targetCourt.name,
        sportId: targetCourt.sportId || modalSportId,
        sportName: targetCourt.sportName || sportObj?.name || "Sport",
        gameDate: modalDate,
        startTime: modalSlot.startTime,
        endTime: modalSlot.endTime,
        durationMinutes: targetCourt.slotDurationMinutes || 60,
        playerCount: Number(playerCount) || 2,
        price: Number(bookingAmount) || targetCourt.pricePerHour || 800,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        playerId: "",
        source: "owner",
        paymentStatus,
        paymentMethod,
      });

      // Close modal and reset form
      setShowNewBookingModal(false);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setModalSlot(null);
    } catch (err: unknown) {
      console.error("Booking error:", err);
      setModalError(
        err instanceof Error
          ? err.message
          : "This slot was just booked. Please select another slot."
      );
    } finally {
      setSubmittingBooking(false);
    }
  };

  // Block Slot Action
  const handleConfirmBlock = async () => {
    if (!blockingSlot || !businessProfile?.businessId || !user?.uid) return;
    setActionLoading(true);
    setActionError(null);

    const reason = blockReason === "Other" ? customReason.trim() || "Maintenance" : blockReason;

    try {
      await blockSlotAtomically({
        businessId: businessProfile.businessId,
        ownerId: user.uid,
        courtId: blockingSlot.court.courtId,
        courtName: blockingSlot.court.name,
        gameDate: selectedDate,
        startTime: blockingSlot.slot.startTime,
        endTime: blockingSlot.slot.endTime,
        reason,
      });

      setBlockingSlot(null);
      setBlockReason("Maintenance");
      setCustomReason("");
    } catch (err: unknown) {
      console.error("Block slot error:", err);
      setActionError(err instanceof Error ? err.message : "Failed to block slot.");
    } finally {
      setActionLoading(false);
    }
  };

  // Unblock Slot Action
  const handleUnblockSlot = async (courtId: string, slot: GeneratedSlot) => {
    const blockRec = dateBlockedSlots.find(
      (b) =>
        b.courtId === courtId &&
        b.startTime === slot.startTime &&
        b.gameDate === selectedDate
    );
    if (!blockRec) return;

    setActionLoading(true);
    setActionError(null);
    try {
      await unblockSlot(blockRec.blockId);
    } catch (err: unknown) {
      console.error("Unblock error:", err);
      setActionError(err instanceof Error ? err.message : "Failed to unblock slot.");
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel Booking Action
  const handleConfirmCancellation = async () => {
    if (!cancelModalBooking) return;
    setActionLoading(true);
    try {
      await cancelBookingWithLock(cancelModalBooking.bookingId, cancellationReason, "owner");
      setCancelModalBooking(null);
      if (inspectBooking?.bookingId === cancelModalBooking.bookingId) {
        setInspectBooking(null);
      }
    } catch (err) {
      console.error("Cancellation error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // Complete Booking Action
  const handleCompleteAction = async (bookingId: string) => {
    setActionLoading(true);
    try {
      await markBookingCompleted(bookingId);
      if (inspectBooking?.bookingId === bookingId) {
        setInspectBooking((prev) => (prev ? { ...prev, bookingStatus: "completed", status: "completed" } : null));
      }
    } catch (err) {
      console.error("Complete error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // No-show Action
  const handleNoShowAction = async (bookingId: string) => {
    setActionLoading(true);
    try {
      await markBookingNoShow(bookingId);
      if (inspectBooking?.bookingId === bookingId) {
        setInspectBooking((prev) => (prev ? { ...prev, bookingStatus: "no_show", status: "no_show" } : null));
      }
    } catch (err) {
      console.error("No-show error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // Tab counts for Table view
  const tabCounts = useMemo(() => {
    let todayCount = 0;
    let upcomingCount = 0;
    let pastCount = 0;
    let cancelledCount = 0;

    bookings.forEach((b) => {
      if (b.bookingStatus === "cancelled") {
        cancelledCount++;
      } else if (b.gameDate === todayStr) {
        todayCount++;
      } else if (b.gameDate > todayStr) {
        upcomingCount++;
      } else {
        pastCount++;
      }
    });

    return {
      all: bookings.length,
      today: todayCount,
      upcoming: upcomingCount,
      past: pastCount,
      cancelled: cancelledCount,
    };
  }, [bookings, todayStr]);

  // Filtered bookings for Table view
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = b.customer?.name?.toLowerCase().includes(q);
        const matchPhone = b.customer?.phone?.includes(q);
        const matchSport = b.sport?.name?.toLowerCase().includes(q);
        const matchCourt = b.court?.name?.toLowerCase().includes(q);
        const matchId = b.readableId?.toLowerCase().includes(q) || b.bookingId.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchSport && !matchCourt && !matchId) {
          return false;
        }
      }

      if (statusFilter !== "all" && b.bookingStatus !== statusFilter) {
        return false;
      }

      if (viewTab === "today" && (b.gameDate !== todayStr || b.bookingStatus === "cancelled")) {
        return false;
      }
      if (viewTab === "upcoming" && (b.gameDate <= todayStr || b.bookingStatus === "cancelled")) {
        return false;
      }
      if (viewTab === "past" && (b.gameDate >= todayStr || b.bookingStatus === "cancelled")) {
        return false;
      }
      if (viewTab === "cancelled" && b.bookingStatus !== "cancelled") {
        return false;
      }

      return true;
    });
  }, [bookings, searchQuery, statusFilter, viewTab, todayStr]);

  // Slots for the Modal (when selecting a slot within the modal)
  const modalGeneratedSlots = useMemo(() => {
    if (!businessProfile) return [];
    const court = courts.find((c) => c.courtId === modalCourtId) || courts[0];
    const res = generateSlotsForCourt(
      businessProfile,
      court,
      modalDate,
      modalDate === selectedDate ? dateBookings : [],
      undefined,
      modalDate === selectedDate ? dateBlockedSlots : [],
      modalDate === selectedDate ? dateSlotLocks : []
    );
    return res.slots;
  }, [businessProfile, courts, modalCourtId, modalDate, selectedDate, dateBookings, dateBlockedSlots, dateSlotLocks]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      {/* HEADER */}
      <header className="flex flex-col gap-4 border-b border-white/8 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SectionLabel>Booking Operations</SectionLabel>
          <h1 className="mt-2 font-display text-4xl text-qc-white md:text-5xl">
            Bookings & Availability
          </h1>
          <p className="mt-1 text-sm text-qc-muted">
            Inspect real-time court occupancy, schedule new reservations, and manage customer bookings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Toggle View: Grounds vs Table */}
          <div className="flex items-center border border-white/10 bg-qc-panel p-1">
            <button
              onClick={() => setViewMode("grounds")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition",
                viewMode === "grounds"
                  ? "bg-qc-lime text-qc-black font-bold"
                  : "text-white/60 hover:text-white"
              )}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
              <span>Grounds & Slots</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition",
                viewMode === "table"
                  ? "bg-qc-lime text-qc-black font-bold"
                  : "text-white/60 hover:text-white"
              )}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>All Bookings ({bookings.length})</span>
            </button>
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={handleOpenGenericNewBooking}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Booking</span>
          </Button>
        </div>
      </header>

      {/* VIEW 1: GROUNDS & SLOTS SCHEDULE (PRIMARY CENTERPIECE) */}
      {viewMode === "grounds" && (
        <div className="space-y-8">
          {/* Date Selector & Operating Info Bar */}
          <div className="flex flex-col gap-4 border border-white/10 bg-qc-charcoal p-4 md:flex-row md:items-center md:justify-between">
            {/* Date Navigator */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleStepDate(-1)}
                className="flex h-9 w-9 items-center justify-center border border-white/10 bg-qc-panel text-white/70 hover:border-qc-lime hover:text-qc-white transition"
                aria-label="Previous day"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border border-white/10 bg-qc-panel px-3 py-1.5 font-mono text-xs font-semibold text-qc-white focus:border-qc-lime focus:outline-none [color-scheme:dark]"
                />
              </div>

              <button
                onClick={() => handleStepDate(1)}
                className="flex h-9 w-9 items-center justify-center border border-white/10 bg-qc-panel text-white/70 hover:border-qc-lime hover:text-qc-white transition"
                aria-label="Next day"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => setSelectedDate(todayStr)}
                className={cn(
                  "ml-2 border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition",
                  selectedDate === todayStr
                    ? "border-qc-lime bg-qc-lime/15 text-qc-lime"
                    : "border-white/10 bg-qc-panel text-white/70 hover:border-qc-lime hover:text-qc-lime"
                )}
              >
                Today
              </button>

              <button
                onClick={() => {
                  const tmrw = new Date(`${todayStr}T12:00:00`);
                  tmrw.setDate(tmrw.getDate() + 1);
                  setSelectedDate(tmrw.toISOString().split("T")[0]);
                }}
                className="border border-white/10 bg-qc-panel px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/70 hover:border-qc-lime hover:text-qc-lime transition"
              >
                Tomorrow
              </button>
            </div>

            {/* Live Indicator & Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 text-qc-muted">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-qc-lime opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-qc-lime"></span>
                </span>
                <span className="font-mono text-[11px] uppercase tracking-wider text-qc-lime">
                  Real-time Sync
                </span>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-white/60">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 border border-white/20 bg-qc-panel" />
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 border border-red-500/50 bg-red-500/20" />
                  <span className="text-red-300">Booked</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 border border-amber-500/50 bg-amber-500/20" />
                  <span className="text-amber-300">Blocked</span>
                </div>
              </div>
            </div>
          </div>

          {/* GROUNDS LIST: Each ground with its dynamic slots */}
          {loadingDate ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center border border-white/10 bg-qc-charcoal text-qc-muted">
              <Loader2 className="h-6 w-6 animate-spin text-qc-lime" />
              <p className="mt-2 text-xs uppercase tracking-wider">Syncing court availability...</p>
            </div>
          ) : activeCourts.length === 0 ? (
            <div className="border border-white/10 bg-qc-charcoal p-12 text-center">
              <Ban className="mx-auto h-8 w-8 text-white/30" />
              <h3 className="mt-3 font-display text-xl text-qc-white">No Active Grounds</h3>
              <p className="mt-1 text-xs text-qc-muted">
                Add courts and configure operating hours in your Business Profile.
              </p>
              <Link
                href="/owner/courts"
                className="mt-4 inline-flex items-center gap-2 border border-qc-lime bg-qc-lime px-4 py-2 text-xs font-bold uppercase tracking-wider text-qc-black"
              >
                Configure Courts
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {activeCourts.map((court) => {
                const res = generateSlotsForCourt(
                  businessProfile || {
                    businessId: "demo",
                    ownerId: "demo",
                    businessName: "Demo",
                    owner: { name: "Demo Owner", phone: "", email: "" },
                    categories: ["cricket"],
                    location: { pinCode: "000000", country: "India" },
                    onboardingCompleted: true,
                  },
                  court,
                  selectedDate,
                  dateBookings,
                  undefined,
                  dateBlockedSlots,
                  dateSlotLocks
                );

                const courtSlots = res.slots;
                const availableCount = courtSlots.filter((s) => s.isAvailable).length;
                const bookedCount = courtSlots.filter((s) => s.isBooked).length;
                const blockedCount = courtSlots.filter((s) => s.isBlocked).length;

                return (
                  <div
                    key={court.courtId}
                    className="border border-white/10 bg-qc-charcoal overflow-hidden shadow-lg"
                  >
                    {/* Ground Header Card */}
                    <div className="border-b border-white/10 bg-qc-panel/60 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="font-display text-2xl text-qc-white">
                            {court.name}
                          </h2>
                          <span className="border border-qc-lime/30 bg-qc-lime/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-qc-lime">
                            {court.sportName || court.sportId || "Sport"}
                          </span>
                          {court.status === "maintenance" && (
                            <span className="border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                              Under Maintenance
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-qc-muted">
                          {court.slotDurationMinutes || 60}-minute dynamic slots · {formatINR(court.pricePerHour || 800)}/hr
                        </p>
                      </div>

                      {/* Ground Slot Stats */}
                      <div className="flex items-center gap-4 text-xs font-mono">
                        <span className="text-white/60">
                          Total: <strong className="text-qc-white">{courtSlots.length}</strong>
                        </span>
                        <span className="text-emerald-400">
                          Available: <strong>{availableCount}</strong>
                        </span>
                        <span className="text-red-400">
                          Booked: <strong>{bookedCount}</strong>
                        </span>
                        {blockedCount > 0 && (
                          <span className="text-amber-400">
                            Blocked: <strong>{blockedCount}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Ground Slots Body */}
                    <div className="p-5">
                      {res.isClosed ? (
                        <div className="border border-white/5 bg-qc-panel p-8 text-center text-xs text-qc-muted">
                          <Ban className="mx-auto h-6 w-6 text-white/30 mb-2" />
                          <p className="font-semibold text-white/80">{res.closureReason}</p>
                        </div>
                      ) : courtSlots.length === 0 ? (
                        <div className="border border-white/5 bg-qc-panel p-8 text-center text-xs text-qc-muted">
                          <Clock className="mx-auto h-6 w-6 text-white/30 mb-2" />
                          <p className="font-semibold text-white/80">No remaining slots for today.</p>
                          <p className="mt-1 text-[11px] text-white/50">Past time slots have expired.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                          {courtSlots.map((slot) => {
                            const isBooked = slot.isBooked;
                            const isBlocked = slot.isBlocked;
                            const isAvailable = slot.isAvailable;

                            return (
                              <button
                                key={slot.slotId}
                                onClick={() => handleOpenSlotBooking(court, slot)}
                                className={cn(
                                  "group relative flex flex-col justify-between border p-3 text-left transition rounded-none",
                                  isBooked
                                    ? "border-red-500/40 bg-red-950/20 hover:border-red-400 hover:bg-red-950/35 cursor-pointer shadow-sm shadow-red-950/20"
                                    : isBlocked
                                    ? "border-amber-500/40 bg-amber-950/20 hover:border-amber-400 hover:bg-amber-950/35 cursor-pointer shadow-sm shadow-amber-950/20"
                                    : "border-white/10 bg-qc-panel hover:border-qc-lime hover:bg-qc-lime/5 cursor-pointer"
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <span
                                    className={cn(
                                      "font-mono text-xs font-bold",
                                      isBooked
                                        ? "text-red-300"
                                        : isBlocked
                                        ? "text-amber-300"
                                        : "text-qc-white group-hover:text-qc-lime"
                                    )}
                                  >
                                    {slot.startTime} – {slot.endTime}
                                  </span>
                                </div>

                                <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2">
                                  <div>
                                    {isBooked ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-400">
                                        <CheckCircle2 className="h-3 w-3 text-red-400" />
                                        <span>BOOKED</span>
                                      </span>
                                    ) : isBlocked ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                                        <Lock className="h-3 w-3" />
                                        <span>BLOCKED</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-qc-lime">
                                        <span>AVAILABLE</span>
                                      </span>
                                    )}
                                  </div>

                                  <span className="text-[10px] font-mono text-white/50">
                                    {formatINR(slot.price)}
                                  </span>
                                </div>

                                {/* Customer name or block reason */}
                                {isBooked && (
                                  <div className="mt-1.5 truncate text-[11px] font-semibold text-white/90">
                                    {slot.bookedBy || "Booked"}
                                  </div>
                                )}
                                {isBlocked && (
                                  <div className="mt-1.5 truncate text-[10px] text-amber-300/80">
                                    {slot.blockReason || "Maintenance"}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: ALL BOOKINGS LIST TABLE */}
      {viewMode === "table" && (
        <div className="space-y-6">
          {/* Tabs */}
          <div className="border-b border-white/10 flex items-center gap-6 overflow-x-auto pb-px">
            <button
              onClick={() => setViewTab("all")}
              className={cn(
                "pb-3 text-xs font-bold uppercase tracking-[0.16em] transition border-b-2 flex items-center gap-2 whitespace-nowrap",
                viewTab === "all"
                  ? "border-qc-lime text-qc-lime"
                  : "border-transparent text-white/60 hover:text-white"
              )}
            >
              All ({tabCounts.all})
            </button>
            <button
              onClick={() => setViewTab("today")}
              className={cn(
                "pb-3 text-xs font-bold uppercase tracking-[0.16em] transition border-b-2 flex items-center gap-2 whitespace-nowrap",
                viewTab === "today"
                  ? "border-qc-lime text-qc-lime"
                  : "border-transparent text-white/60 hover:text-white"
              )}
            >
              Today ({tabCounts.today})
            </button>
            <button
              onClick={() => setViewTab("upcoming")}
              className={cn(
                "pb-3 text-xs font-bold uppercase tracking-[0.16em] transition border-b-2 flex items-center gap-2 whitespace-nowrap",
                viewTab === "upcoming"
                  ? "border-qc-lime text-qc-lime"
                  : "border-transparent text-white/60 hover:text-white"
              )}
            >
              Upcoming ({tabCounts.upcoming})
            </button>
            <button
              onClick={() => setViewTab("past")}
              className={cn(
                "pb-3 text-xs font-bold uppercase tracking-[0.16em] transition border-b-2 flex items-center gap-2 whitespace-nowrap",
                viewTab === "past"
                  ? "border-qc-lime text-qc-lime"
                  : "border-transparent text-white/60 hover:text-white"
              )}
            >
              Past ({tabCounts.past})
            </button>
            <button
              onClick={() => setViewTab("cancelled")}
              className={cn(
                "pb-3 text-xs font-bold uppercase tracking-[0.16em] transition border-b-2 flex items-center gap-2 whitespace-nowrap",
                viewTab === "cancelled"
                  ? "border-qc-lime text-qc-lime"
                  : "border-transparent text-white/60 hover:text-white"
              )}
            >
              Cancelled ({tabCounts.cancelled})
            </button>
          </div>

          {/* Search Bar */}
          <div className="flex flex-col gap-3 border border-white/10 bg-qc-charcoal p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by player name, phone, sport, court, or booking ID..."
                className="w-full border border-white/10 bg-qc-panel py-2 pl-9 pr-4 text-xs text-qc-white placeholder:text-white/30 focus:border-qc-lime focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-white/10 bg-qc-panel px-3 py-2 text-xs text-qc-white focus:border-qc-lime focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
          </div>

          {/* Bookings Table */}
          {loadingAll ? (
            <div className="flex min-h-[300px] items-center justify-center border border-white/10 bg-qc-charcoal">
              <Loader2 className="h-5 w-5 animate-spin text-qc-lime" />
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="border border-white/10 bg-qc-charcoal p-12 text-center text-xs text-qc-muted">
              <Ticket className="mx-auto h-8 w-8 text-white/30 mb-2" />
              <p className="font-semibold text-white/80">No bookings match your search or filter.</p>
            </div>
          ) : (
            <div className="border border-white/10 bg-qc-charcoal overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 bg-qc-panel text-[10px] uppercase tracking-wider text-qc-muted">
                  <tr>
                    <th className="p-3.5">Booking ID</th>
                    <th className="p-3.5">Player / Customer</th>
                    <th className="p-3.5">Ground & Sport</th>
                    <th className="p-3.5">Date & Time</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredBookings.map((b) => (
                    <tr
                      key={b.bookingId}
                      className="hover:bg-white/5 transition cursor-pointer"
                      onClick={() => setInspectBooking(b)}
                    >
                      <td className="p-3.5 font-mono text-qc-lime font-bold">
                        {b.readableId || b.bookingId}
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-qc-white">{b.customer.name}</div>
                        <div className="font-mono text-[11px] text-white/50">{b.customer.phone}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="text-qc-white font-medium">{b.court.name}</div>
                        <div className="text-[10px] uppercase tracking-wider text-white/40">{b.sport.name}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-mono text-qc-white">{b.gameDate}</div>
                        <div className="font-mono text-[11px] text-white/50">{b.startTime} – {b.endTime}</div>
                      </td>
                      <td className="p-3.5 font-bold text-qc-white">
                        {formatINR(b.pricing?.total || b.price || 0)}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={cn(
                            "px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border",
                            b.bookingStatus === "confirmed"
                              ? "border-qc-lime/40 bg-qc-lime/10 text-qc-lime"
                              : b.bookingStatus === "cancelled"
                              ? "border-red-500/40 bg-red-500/10 text-red-400"
                              : b.bookingStatus === "completed"
                              ? "border-blue-500/40 bg-blue-500/10 text-blue-300"
                              : "border-amber-500/40 bg-amber-500/10 text-amber-300"
                          )}
                        >
                          {b.bookingStatus}
                        </span>
                      </td>
                      <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setInspectBooking(b)}
                          className="px-2.5 py-1 text-[11px] text-qc-lime hover:underline"
                        >
                          Details →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* INSPECT BOOKING DETAILS DRAWER (PROMPT REQUIREMENT #5 & #22) */}
      {inspectBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setInspectBooking(null)}
        >
          <div
            className="w-full max-w-lg border border-white/15 bg-qc-charcoal p-6 space-y-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border",
                      inspectBooking.bookingStatus === "confirmed"
                        ? "border-red-500/40 bg-red-500/15 text-red-300"
                        : inspectBooking.bookingStatus === "cancelled"
                        ? "border-white/20 bg-white/5 text-white/40"
                        : "border-qc-lime/40 bg-qc-lime/15 text-qc-lime"
                    )}
                  >
                    {inspectBooking.bookingStatus === "confirmed" ? "BOOKED" : inspectBooking.bookingStatus.toUpperCase()}
                  </span>
                  <span className="font-mono text-xs text-qc-muted">
                    {inspectBooking.source === "owner" ? "Owner Manual Booking" : "Player Online Booking"}
                  </span>
                </div>
                <h3 className="mt-1 font-display text-2xl text-qc-white">
                  {inspectBooking.readableId || inspectBooking.bookingId}
                </h3>
              </div>

              <button
                onClick={() => setInspectBooking(null)}
                className="text-white/40 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Information Grid */}
            <div className="space-y-4 text-xs">
              {/* Customer Info Card */}
              <div className="border border-white/10 bg-qc-panel p-4 space-y-2.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-qc-lime block">
                  Customer Information
                </span>
                <div className="flex justify-between">
                  <span className="text-qc-muted">Player Name:</span>
                  <span className="font-semibold text-qc-white">{inspectBooking.customer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-qc-muted">Phone Number:</span>
                  <span className="font-mono text-qc-white">{inspectBooking.customer.phone}</span>
                </div>
                {inspectBooking.customer.email && (
                  <div className="flex justify-between">
                    <span className="text-qc-muted">Email:</span>
                    <span className="text-white/80">{inspectBooking.customer.email}</span>
                  </div>
                )}
              </div>

              {/* Reservation Info Card */}
              <div className="border border-white/10 bg-qc-panel p-4 space-y-2.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-qc-lime block">
                  Ground & Slot Details
                </span>
                <div className="flex justify-between">
                  <span className="text-qc-muted">Ground:</span>
                  <span className="font-semibold text-qc-white">{inspectBooking.court.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-qc-muted">Sport:</span>
                  <span className="text-qc-white">{inspectBooking.sport.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-qc-muted">Date:</span>
                  <span className="font-mono font-semibold text-qc-white">{inspectBooking.gameDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-qc-muted">Time Slot:</span>
                  <span className="font-mono font-bold text-qc-lime">
                    {format12Hour(inspectBooking.startTime)} – {format12Hour(inspectBooking.endTime)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-qc-muted">Amount:</span>
                  <span className="font-bold text-qc-white">
                    {formatINR(inspectBooking.pricing?.total || inspectBooking.price || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-qc-muted">Payment:</span>
                  <span className="uppercase tracking-wider font-semibold text-qc-lime">
                    {inspectBooking.payment.status} ({inspectBooking.payment.method || "cash"})
                  </span>
                </div>
              </div>

              {/* Cancellation Reason if cancelled */}
              {inspectBooking.bookingStatus === "cancelled" && inspectBooking.cancellation && (
                <div className="border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                  <span className="font-bold">Cancellation Reason: </span>
                  <span>{inspectBooking.cancellation.reason}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            {inspectBooking.bookingStatus === "confirmed" && (
              <div className="border-t border-white/10 pt-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => {
                      setCancelModalBooking(inspectBooking);
                    }}
                    disabled={actionLoading}
                    className="flex-1 border border-red-500/30 bg-red-500/10 py-2 text-xs font-semibold uppercase tracking-wider text-red-400 hover:bg-red-500/20 transition"
                  >
                    Cancel Booking
                  </button>

                  <button
                    onClick={() => handleCompleteAction(inspectBooking.bookingId)}
                    disabled={actionLoading}
                    className="flex-1 border border-white/10 bg-qc-panel py-2 text-xs font-semibold uppercase tracking-wider text-qc-white hover:border-qc-lime transition"
                  >
                    Mark Completed
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MANUAL NEW BOOKING MODAL (OWNER CREATES BOOKING) */}
      {showNewBookingModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setShowNewBookingModal(false)}
        >
          <div
            className="w-full max-w-xl border border-white/15 bg-qc-charcoal p-6 space-y-6 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-qc-lime">
                  Owner Reservation
                </span>
                <h3 className="mt-1 font-display text-2xl text-qc-white">
                  Create Booking
                </h3>
              </div>
              <button
                onClick={() => setShowNewBookingModal(false)}
                className="text-white/40 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalError && (
              <div className="flex items-center gap-2 border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmManualBooking} className="space-y-6">
              {/* Step 1: Select Ground & Date */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-qc-muted mb-1.5">
                    Select Ground *
                  </label>
                  <select
                    value={modalCourtId}
                    onChange={(e) => {
                      setModalCourtId(e.target.value);
                      setModalSlot(null);
                    }}
                    className="w-full border border-white/15 bg-qc-panel px-3 py-2 text-xs text-qc-white focus:border-qc-lime focus:outline-none"
                  >
                    {activeCourts.map((c) => (
                      <option key={c.courtId} value={c.courtId} className="bg-qc-panel text-white">
                        {c.name} ({c.sportName || c.sportId})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-qc-muted mb-1.5">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={modalDate}
                    onChange={(e) => {
                      setModalDate(e.target.value);
                      setModalSlot(null);
                    }}
                    className="w-full border border-white/15 bg-qc-panel px-3 py-2 font-mono text-xs text-qc-white focus:border-qc-lime focus:outline-none [color-scheme:dark]"
                    required
                  />
                </div>
              </div>

              {/* Step 2: Time Slots */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-qc-muted mb-2">
                  Select Available Slot *
                </label>
                {modalGeneratedSlots.length === 0 ? (
                  <div className="border border-white/10 bg-qc-panel p-4 text-center text-xs text-qc-muted">
                    No slots available on this date or past slots have expired.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                    {modalGeneratedSlots.map((slot) => {
                      const isSelected = modalSlot?.slotId === slot.slotId;
                      const isAvailable = slot.isAvailable;

                      return (
                        <button
                          key={slot.slotId}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => {
                            if (isAvailable) setModalSlot(slot);
                          }}
                          className={cn(
                            "p-2 text-center text-xs font-mono border transition",
                            isSelected
                              ? "border-qc-lime bg-qc-lime text-qc-black font-bold shadow-md"
                              : isAvailable
                              ? "border-white/10 bg-qc-panel text-white hover:border-qc-lime/50"
                              : "border-white/5 bg-white/5 text-white/30 cursor-not-allowed"
                          )}
                        >
                          <div>{slot.startTime} – {slot.endTime}</div>
                          <div className="text-[9px] uppercase mt-0.5">
                            {slot.isBooked ? "Booked" : slot.isBlocked ? "Blocked" : formatINR(slot.price)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step 3: Customer Information */}
              <div className="space-y-4 border-t border-white/10 pt-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-qc-lime block">
                  Customer Details
                </span>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs text-white/70 mb-1">Customer / Player Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Patel"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full border border-white/15 bg-qc-panel px-3 py-2 text-xs text-qc-white focus:border-qc-lime focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-white/70 mb-1">Mobile Phone Number *</label>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full border border-white/15 bg-qc-panel px-3 py-2 font-mono text-xs text-qc-white focus:border-qc-lime focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs text-white/70 mb-1">Amount (₹)</label>
                    <input
                      type="number"
                      value={bookingAmount}
                      onChange={(e) => setBookingAmount(e.target.value)}
                      className="w-full border border-white/15 bg-qc-panel px-3 py-2 font-mono text-xs text-qc-white focus:border-qc-lime focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-white/70 mb-1">Payment Status</label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                      className="w-full border border-white/15 bg-qc-panel px-3 py-2 text-xs text-qc-white focus:border-qc-lime focus:outline-none"
                    >
                      <option value="paid" className="bg-qc-panel">Paid</option>
                      <option value="pending" className="bg-qc-panel">Pending</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-white/70 mb-1">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full border border-white/15 bg-qc-panel px-3 py-2 text-xs text-qc-white focus:border-qc-lime focus:outline-none"
                    >
                      <option value="cash" className="bg-qc-panel">Cash</option>
                      <option value="upi" className="bg-qc-panel">UPI</option>
                      <option value="card" className="bg-qc-panel">Card</option>
                      <option value="offline" className="bg-qc-panel">Offline</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewBookingModal(false)}
                  className="px-4 py-2 text-xs uppercase tracking-wider text-white/60 hover:text-white"
                >
                  Cancel
                </button>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={submittingBooking || !modalSlot}
                  className="gap-2"
                >
                  {submittingBooking && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Confirm Booking</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL BOOKING MODAL */}
      {cancelModalBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setCancelModalBooking(null)}
        >
          <div
            className="w-full max-w-md border border-white/15 bg-qc-charcoal p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-display text-xl text-qc-white">Confirm Cancellation</h3>
              <button
                onClick={() => setCancelModalBooking(null)}
                className="text-white/40 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-qc-muted">
              Are you sure you want to cancel reservation{" "}
              <strong className="text-qc-white">
                {cancelModalBooking.readableId || cancelModalBooking.bookingId}
              </strong>
              ? The slot will immediately become AVAILABLE for other players.
            </p>

            <div>
              <label className="block text-xs text-white/70 mb-1">Reason for cancellation:</label>
              <input
                type="text"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="w-full border border-white/15 bg-qc-panel p-2 text-xs text-qc-white focus:border-qc-lime focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                onClick={() => setCancelModalBooking(null)}
                className="px-3 py-1.5 text-xs text-white/60 hover:text-white"
              >
                Keep Booking
              </button>
              <button
                onClick={handleConfirmCancellation}
                disabled={actionLoading}
                className="border border-red-500/40 bg-red-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-red-300 hover:bg-red-500/30"
              >
                {actionLoading ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
