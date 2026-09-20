"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  subscribeToIncomingBookings,
  getExistingBookingsForDate,
  createManualBooking,
  confirmBooking,
  cancelBooking,
} from "@/services/bookingService";
import { ALL_SPORTS_CATEGORIES } from "@/components/owner/BusinessProfileForm";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";
import { formatINR } from "@/lib/format";
import type { OwnerBooking, VenueCourt } from "@/types";
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
  CalendarCheck,
  ChevronRight,
  Filter,
  X,
  Sparkles,
  ArrowRight,
  Check,
} from "lucide-react";

interface TimeSlot {
  startTime: string; // "18:00"
  endTime: string;   // "19:00"
  label: string;     // "18:00 - 19:00"
  available: boolean;
  bookedBy?: string;
}

export default function OwnerBookingsPage() {
  const { user, businessProfile } = useAuth();

  const [bookings, setBookings] = useState<OwnerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSportFilter, setSelectedSportFilter] = useState<string>("all");

  // Selected booking for detailed drawer view
  const [selectedBooking, setSelectedBooking] = useState<OwnerBooking | null>(null);

  // Modal states
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [cancelModalBooking, setCancelModalBooking] = useState<OwnerBooking | null>(null);
  const [cancellationReason, setCancellationReason] = useState("Player requested cancellation");
  const [actionLoading, setActionLoading] = useState(false);

  // New Booking Wizard state
  const [bookingDate, setBookingDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [bookingSportId, setBookingSportId] = useState("");
  const [selectedCourtId, setSelectedCourtId] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [existingBookingsForDate, setExistingBookingsForDate] = useState<OwnerBooking[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Customer Details Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [playerCount, setPlayerCount] = useState("2");
  const [bookingAmount, setBookingAmount] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "pending">("paid");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card" | "offline">("cash");
  const [formError, setFormError] = useState<string | null>(null);
  const [submittingBooking, setSubmittingBooking] = useState(false);

  // Business profile details
  const businessCategories = useMemo(() => {
    return businessProfile?.categories || [];
  }, [businessProfile]);

  const courts: VenueCourt[] = useMemo(() => {
    if (businessProfile?.courts && businessProfile.courts.length > 0) {
      return businessProfile.courts;
    }
    // Fallback court if none explicitly created
    return [
      {
        courtId: "default_court_1",
        name: "Main Ground",
        sportId: businessCategories[0] || "cricket",
        sportName: "Main Sport",
        pricePerHour: 800,
        slotDurationMinutes: businessProfile?.slotDurationMinutes || 60,
      },
    ];
  }, [businessProfile, businessCategories]);

  // Real-time listener for incoming bookings
  useEffect(() => {
    if (!businessProfile?.businessId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToIncomingBookings(
      businessProfile.businessId,
      (data) => {
        setBookings(data);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load bookings:", err);
        setLoading(false);
      },
      user?.uid
    );

    return () => unsubscribe();
  }, [businessProfile?.businessId, user?.uid]);

  // Set default sport and court when opening new booking modal
  useEffect(() => {
    if (showNewBookingModal) {
      const initialSport = businessCategories[0] || "cricket";
      setBookingSportId(initialSport);
      const matchingCourt = courts.find((c) => c.sportId === initialSport) || courts[0];
      setSelectedCourtId(matchingCourt?.courtId || "");
      setSelectedSlot(null);
      setFormError(null);
    }
  }, [showNewBookingModal, businessCategories, courts]);

  // When date or business changes, fetch date-specific bookings to compute slot availability
  useEffect(() => {
    if (!businessProfile?.businessId || !bookingDate || !showNewBookingModal) return;

    let active = true;
    setLoadingSlots(true);
    getExistingBookingsForDate(businessProfile.businessId, bookingDate, user?.uid)
      .then((items) => {
        if (active) {
          setExistingBookingsForDate(items);
          setLoadingSlots(false);
        }
      })
      .catch((err) => {
        console.error("Error fetching existing bookings for date:", err);
        if (active) setLoadingSlots(false);
      });

    return () => {
      active = false;
    };
  }, [businessProfile?.businessId, bookingDate, showNewBookingModal, user?.uid]);

  // Update selected court when sport changes
  const handleSportChange = (sportId: string) => {
    setBookingSportId(sportId);
    const matchingCourts = courts.filter((c) => c.sportId === sportId);
    if (matchingCourts.length > 0) {
      setSelectedCourtId(matchingCourts[0].courtId);
    } else if (courts.length > 0) {
      setSelectedCourtId(courts[0].courtId);
    }
    setSelectedSlot(null);
  };

  // Helper: Convert "HH:mm" to minutes from midnight
  const timeToMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // Helper: Convert minutes from midnight to "HH:mm"
  const minutesToTime = (totalMinutes: number): string => {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  // Helper: Format 24h "18:00" to 12h "06:00 PM"
  const format12h = (time24: string): string => {
    if (!time24) return "";
    const [h, m] = time24.split(":").map(Number);
    if (isNaN(h)) return time24;
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, "0")}:${String(m || 0).padStart(2, "0")} ${period}`;
  };

  // Generate Slots dynamically based on venue hours and court/duration settings
  const generatedSlots: TimeSlot[] = useMemo(() => {
    const startStr = businessProfile?.businessHours?.startTime || "08:00";
    const endStr = businessProfile?.businessHours?.endTime || "22:00";

    const currentCourt = courts.find((c) => c.courtId === selectedCourtId) || courts[0];
    const durationMinutes =
      currentCourt?.slotDurationMinutes || businessProfile?.slotDurationMinutes || 60;

    let startMins = timeToMinutes(startStr);
    const endMins = timeToMinutes(endStr);

    // If closing time is earlier than opening time (e.g. overnight 08:00 to 02:00), clamp or extend
    const actualEndMins = endMins <= startMins ? endMins + 24 * 60 : endMins;

    const slots: TimeSlot[] = [];

    while (startMins + durationMinutes <= actualEndMins) {
      const slotStart = minutesToTime(startMins % (24 * 60));
      const slotEnd = minutesToTime((startMins + durationMinutes) % (24 * 60));

      // Check if slot overlaps with any existing non-cancelled booking on this court
      const overlappingBooking = existingBookingsForDate.find((b) => {
        if (b.court?.courtId && selectedCourtId && b.court.courtId !== selectedCourtId) {
          return false;
        }
        const bStart = timeToMinutes(b.startTime);
        const bEnd = timeToMinutes(b.endTime);
        const currentSlotStart = startMins;
        const currentSlotEnd = startMins + durationMinutes;

        return currentSlotStart < bEnd && currentSlotEnd > bStart;
      });

      slots.push({
        startTime: slotStart,
        endTime: slotEnd,
        label: `${slotStart} - ${slotEnd}`,
        available: !overlappingBooking,
        bookedBy: overlappingBooking?.customer?.name,
      });

      startMins += durationMinutes;
    }

    return slots;
  }, [
    businessProfile?.businessHours,
    businessProfile?.slotDurationMinutes,
    courts,
    selectedCourtId,
    existingBookingsForDate,
  ]);

  // Update default price when slot or court changes
  useEffect(() => {
    if (selectedCourtId) {
      const selectedCourt = courts.find((c) => c.courtId === selectedCourtId);
      const price = selectedCourt?.pricePerHour || 800;
      const duration = selectedCourt?.slotDurationMinutes || businessProfile?.slotDurationMinutes || 60;
      const calculatedAmount = Math.round((price * duration) / 60);
      setBookingAmount(String(calculatedAmount));
    }
  }, [selectedCourtId, courts, businessProfile?.slotDurationMinutes]);

  // Handle slot click
  const handleSelectSlot = (slot: TimeSlot) => {
    if (!slot.available) return;
    setSelectedSlot(slot);
    setFormError(null);
  };

  // Submit manual booking
  const handleSaveBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedSlot) {
      setFormError("Please select an available time slot.");
      return;
    }
    if (!customerName.trim()) {
      setFormError("Customer / Player Name is required.");
      return;
    }
    if (!customerPhone.trim() || customerPhone.replace(/\D/g, "").length < 7) {
      setFormError("Please provide a valid contact phone number.");
      return;
    }
    if (!businessProfile?.businessId || !user?.uid) {
      setFormError("Business profile or session missing. Please refresh.");
      return;
    }

    const currentCourt = courts.find((c) => c.courtId === selectedCourtId) || courts[0];
    const sportObj = ALL_SPORTS_CATEGORIES.find((s) => s.id === bookingSportId);
    const duration =
      currentCourt?.slotDurationMinutes || businessProfile?.slotDurationMinutes || 60;

    setSubmittingBooking(true);
    try {
      await createManualBooking({
        businessId: businessProfile.businessId,
        ownerId: user.uid,
        customer: {
          userId: "",
          name: customerName.trim(),
          phone: customerPhone.trim(),
          email: customerEmail.trim() || undefined,
        },
        sport: {
          id: bookingSportId,
          name: sportObj ? sportObj.name : bookingSportId,
        },
        court: {
          courtId: currentCourt?.courtId || "default_court",
          name: currentCourt?.name || "Main Court",
        },
        gameDate: bookingDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        durationMinutes: duration,
        playerCount: Number(playerCount) || 2,
        pricing: {
          subtotal: Number(bookingAmount) || 800,
          discount: 0,
          total: Number(bookingAmount) || 800,
          currency: "INR",
        },
        bookingStatus: "confirmed",
        payment: {
          status: paymentStatus,
          method: paymentMethod,
        },
      });

      setShowNewBookingModal(false);
      // Reset form
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setSelectedSlot(null);
    } catch (err: unknown) {
      console.error("Booking creation failed:", err);
      setFormError(err instanceof Error ? err.message : "Failed to create booking.");
    } finally {
      setSubmittingBooking(false);
    }
  };

  // Confirm booking action
  const handleConfirmAction = async (bookingId: string) => {
    setActionLoading(true);
    try {
      await confirmBooking(bookingId);
      if (selectedBooking && selectedBooking.bookingId === bookingId) {
        setSelectedBooking((prev) => (prev ? { ...prev, bookingStatus: "confirmed" } : null));
      }
    } catch (err) {
      console.error("Confirm failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel booking action
  const handleCancelAction = async () => {
    if (!cancelModalBooking) return;
    setActionLoading(true);
    try {
      await cancelBooking(cancelModalBooking.bookingId, cancellationReason, "owner");
      if (selectedBooking && selectedBooking.bookingId === cancelModalBooking.bookingId) {
        setSelectedBooking((prev) =>
          prev
            ? {
                ...prev,
                bookingStatus: "cancelled",
                cancellation: { reason: cancellationReason },
              }
            : null
        );
      }
      setCancelModalBooking(null);
    } catch (err) {
      console.error("Cancel failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter & Search bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = b.customer?.name?.toLowerCase().includes(q);
        const matchPhone = b.customer?.phone?.includes(q);
        const matchSport = b.sport?.name?.toLowerCase().includes(q);
        const matchCourt = b.court?.name?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchSport && !matchCourt) {
          return false;
        }
      }

      // Status
      if (statusFilter !== "all" && b.bookingStatus !== statusFilter) {
        return false;
      }

      // Sport
      if (selectedSportFilter !== "all" && b.sport?.id !== selectedSportFilter) {
        return false;
      }

      return true;
    });
  }, [bookings, searchQuery, statusFilter, selectedSportFilter]);

  // Group bookings by TODAY, TOMORROW, and UPCOMING
  const groupedBookings = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = tomorrowDate.toISOString().split("T")[0];

    const todayItems: OwnerBooking[] = [];
    const tomorrowItems: OwnerBooking[] = [];
    const upcomingItems: OwnerBooking[] = [];
    const pastItems: OwnerBooking[] = [];

    filteredBookings.forEach((b) => {
      if (b.gameDate === today) {
        todayItems.push(b);
      } else if (b.gameDate === tomorrow) {
        tomorrowItems.push(b);
      } else if (b.gameDate > tomorrow) {
        upcomingItems.push(b);
      } else {
        pastItems.push(b);
      }
    });

    return { todayItems, tomorrowItems, upcomingItems, pastItems };
  }, [filteredBookings]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-white/8 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SectionLabel>Incoming Games</SectionLabel>
          <h1 className="mt-2 font-display text-4xl text-qc-white md:text-5xl">
            Bookings & Schedule
          </h1>
          <p className="mt-1 text-sm text-qc-muted">
            Manage upcoming games, inspect slot occupancy, and schedule reservations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="primary"
            onClick={() => setShowNewBookingModal(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Booking</span>
          </Button>
        </div>
      </header>

      {/* Control Bar: Search & Filters */}
      <div className="flex flex-col gap-3 rounded-none border border-white/10 bg-qc-charcoal p-4 md:flex-row md:items-center md:justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by player name, phone, sport, or court..."
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

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sport filter */}
          <div className="flex items-center gap-1.5 border border-white/10 bg-qc-panel px-3 py-1.5 text-xs text-white/70">
            <Filter className="h-3 w-3 text-qc-lime" />
            <select
              value={selectedSportFilter}
              onChange={(e) => setSelectedSportFilter(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none"
            >
              <option value="all" className="bg-qc-panel">
                All Sports
              </option>
              {businessCategories.map((catId) => {
                const s = ALL_SPORTS_CATEGORIES.find((item) => item.id === catId);
                return (
                  <option key={catId} value={catId} className="bg-qc-panel">
                    {s ? `${s.emoji} ${s.name}` : catId}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5 border border-white/10 bg-qc-panel px-3 py-1.5 text-xs text-white/70">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none"
            >
              <option value="all" className="bg-qc-panel">All Statuses</option>
              <option value="confirmed" className="bg-qc-panel">Confirmed</option>
              <option value="pending" className="bg-qc-panel">Pending</option>
              <option value="completed" className="bg-qc-panel">Completed</option>
              <option value="cancelled" className="bg-qc-panel">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center border border-white/10 bg-qc-charcoal py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-qc-lime" />
          <p className="mt-3 text-sm text-qc-muted">Syncing venue bookings...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        /* Empty State */
        <div className="flex min-h-[320px] flex-col items-center justify-center border border-white/10 bg-qc-charcoal p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center border border-white/10 bg-qc-panel text-white/40">
            <CalendarCheck className="h-7 w-7" />
          </div>
          <h3 className="mt-4 font-display text-2xl text-qc-white">
            {searchQuery || statusFilter !== "all" || selectedSportFilter !== "all"
              ? "No matching bookings found"
              : "No upcoming games scheduled"}
          </h3>
          <p className="mt-1.5 max-w-md text-xs text-qc-muted leading-relaxed">
            {searchQuery || statusFilter !== "all"
              ? "Try resetting your search filter to see all active venue bookings."
              : "When players book slots via QuickCourt or you manually schedule bookings, they will appear here with live game schedules and payment details."}
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowNewBookingModal(true)}
            size="sm"
            className="mt-6 gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create First Booking</span>
          </Button>
        </div>
      ) : (
        /* Grouped Bookings Display */
        <div className="space-y-8">
          {/* TODAY */}
          {groupedBookings.todayItems.length > 0 && (
            <BookingSection
              title="Today's Games"
              count={groupedBookings.todayItems.length}
              items={groupedBookings.todayItems}
              format12h={format12h}
              onSelect={setSelectedBooking}
            />
          )}

          {/* TOMORROW */}
          {groupedBookings.tomorrowItems.length > 0 && (
            <BookingSection
              title="Tomorrow"
              count={groupedBookings.tomorrowItems.length}
              items={groupedBookings.tomorrowItems}
              format12h={format12h}
              onSelect={setSelectedBooking}
            />
          )}

          {/* UPCOMING */}
          {groupedBookings.upcomingItems.length > 0 && (
            <BookingSection
              title="Upcoming Days"
              count={groupedBookings.upcomingItems.length}
              items={groupedBookings.upcomingItems}
              format12h={format12h}
              onSelect={setSelectedBooking}
            />
          )}

          {/* PAST */}
          {groupedBookings.pastItems.length > 0 && (
            <BookingSection
              title="Past Games"
              count={groupedBookings.pastItems.length}
              items={groupedBookings.pastItems}
              format12h={format12h}
              onSelect={setSelectedBooking}
              isPast
            />
          )}
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL 1: NEW INTERACTIVE SLOT BOOKING MODAL */}
      {/* ========================================================== */}
      {showNewBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-3xl border border-white/15 bg-qc-charcoal p-6 sm:p-8 space-y-6 my-8">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-qc-lime font-medium">
                  Direct Slot Reservation
                </span>
                <h3 className="font-display text-2xl text-qc-white sm:text-3xl">
                  Schedule New Booking
                </h3>
                <p className="mt-0.5 text-xs text-qc-muted">
                  Select sport, court, and available time slot based on your business profile.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewBookingModal(false)}
                className="text-white/40 hover:text-white transition p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="flex items-center gap-2 border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveBooking} className="space-y-6">
              {/* STEP 1: Date & Sport (Restricted to Business Profile categories) */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Date Picker */}
                <div>
                  <label className="block text-xs uppercase tracking-[0.14em] text-qc-muted">
                    Game Date *
                  </label>
                  <div className="mt-1.5 flex items-center border border-white/15 bg-qc-panel px-3 py-2.5 focus-within:border-qc-lime">
                    <Calendar className="mr-2 h-4 w-4 text-white/40" />
                    <input
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full bg-transparent font-mono text-xs text-qc-white focus:outline-none [color-scheme:dark]"
                      required
                    />
                  </div>
                </div>

                {/* Sport Dropdown (Owner's categories ONLY) */}
                <div>
                  <label className="block text-xs uppercase tracking-[0.14em] text-qc-muted">
                    Sport Option *
                  </label>
                  <div className="mt-1.5 border border-white/15 bg-qc-panel px-3 py-2.5 focus-within:border-qc-lime">
                    <select
                      value={bookingSportId}
                      onChange={(e) => handleSportChange(e.target.value)}
                      className="w-full bg-transparent text-xs text-qc-white focus:outline-none"
                    >
                      {businessCategories.length === 0 ? (
                        <option value="cricket" className="bg-qc-panel text-white">
                          Cricket (Add in Business Profile)
                        </option>
                      ) : (
                        businessCategories.map((catId) => {
                          const s = ALL_SPORTS_CATEGORIES.find((item) => item.id === catId);
                          return (
                            <option key={catId} value={catId} className="bg-qc-panel text-white">
                              {s ? `${s.emoji} ${s.name}` : catId}
                            </option>
                          );
                        })
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* STEP 2: Court / Ground Selection */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs uppercase tracking-[0.14em] text-qc-muted">
                    Select Court / Ground *
                  </label>
                  <Link
                    href="/owner/business-profile"
                    className="text-[11px] text-qc-lime hover:underline"
                  >
                    + Manage Courts in Profile
                  </Link>
                </div>

                <div className="mt-2 grid gap-2.5 sm:grid-cols-3">
                  {courts.map((court) => {
                    const isSelected = selectedCourtId === court.courtId;
                    return (
                      <button
                        type="button"
                        key={court.courtId}
                        onClick={() => {
                          setSelectedCourtId(court.courtId);
                          setSelectedSlot(null);
                        }}
                        className={`flex flex-col items-start border p-3 text-left transition ${
                          isSelected
                            ? "border-qc-lime bg-qc-lime/15 text-qc-white"
                            : "border-white/10 bg-qc-panel text-white/70 hover:border-white/20"
                        }`}
                      >
                        <span className="font-medium text-xs text-qc-white">
                          {court.name}
                        </span>
                        <span className="mt-1 font-mono text-[10px] text-qc-muted">
                          ₹{court.pricePerHour}/hr · {court.slotDurationMinutes || 60} min
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STEP 3: Time Slot Grid (Interactive Available vs Booked) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-qc-lime" />
                    <label className="text-xs uppercase tracking-[0.14em] text-qc-muted">
                      Time Slots · Operating Hours ({businessProfile?.businessHours?.startTime || "08:00"} - {businessProfile?.businessHours?.endTime || "22:00"})
                    </label>
                  </div>
                  <span className="text-[11px] font-mono text-qc-muted">
                    {selectedSlot ? `Selected: ${selectedSlot.label}` : "Click any slot"}
                  </span>
                </div>

                {loadingSlots ? (
                  <div className="flex items-center justify-center border border-white/10 bg-qc-panel p-6">
                    <Loader2 className="h-5 w-5 animate-spin text-qc-lime" />
                    <span className="ml-2 text-xs text-qc-muted">Checking slot availability...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 max-h-56 overflow-y-auto pr-1">
                    {generatedSlots.map((slot) => {
                      const isSelected =
                        selectedSlot?.startTime === slot.startTime &&
                        selectedSlot?.endTime === slot.endTime;

                      return (
                        <button
                          type="button"
                          key={slot.label}
                          disabled={!slot.available}
                          onClick={() => handleSelectSlot(slot)}
                          className={`flex flex-col items-center justify-center border p-2.5 text-center transition ${
                            !slot.available
                              ? "border-white/5 bg-white/5 text-white/25 cursor-not-allowed"
                              : isSelected
                              ? "border-qc-lime bg-qc-lime text-qc-black shadow-[0_0_12px_rgba(200,245,66,0.3)] font-semibold"
                              : "border-white/10 bg-qc-panel text-white hover:border-qc-lime/60 hover:text-qc-lime"
                          }`}
                        >
                          <span className="font-mono text-xs tracking-tight">
                            {slot.label}
                          </span>
                          <span
                            className={`mt-1 text-[9px] uppercase tracking-wider ${
                              !slot.available
                                ? "text-red-400/80"
                                : isSelected
                                ? "text-qc-black font-bold"
                                : "text-emerald-400"
                            }`}
                          >
                            {!slot.available ? "Booked" : "Available"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* STEP 4: Customer Details & Payment */}
              <div className="border-t border-white/10 pt-5 space-y-4">
                <span className="text-[10px] uppercase tracking-[0.16em] text-qc-lime font-medium">
                  Player & Payment Information
                </span>

                <div className="grid gap-4 sm:grid-cols-3">
                  {/* Customer Name */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-qc-muted">
                      Customer Name *
                    </label>
                    <div className="mt-1 flex items-center border border-white/15 bg-qc-panel px-2.5 py-2">
                      <User className="mr-2 h-3.5 w-3.5 text-white/40" />
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-transparent text-xs text-qc-white focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  {/* Customer Phone */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-qc-muted">
                      Phone Number *
                    </label>
                    <div className="mt-1 flex items-center border border-white/15 bg-qc-panel px-2.5 py-2">
                      <Phone className="mr-2 h-3.5 w-3.5 text-white/40" />
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full bg-transparent text-xs text-qc-white focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  {/* Players Count */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-qc-muted">
                      Player Count
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={playerCount}
                      onChange={(e) => setPlayerCount(e.target.value)}
                      className="mt-1 w-full border border-white/15 bg-qc-panel px-3 py-2 font-mono text-xs text-qc-white focus:border-qc-lime focus:outline-none"
                    />
                  </div>

                  {/* Booking Total */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-qc-muted">
                      Booking Amount (₹)
                    </label>
                    <input
                      type="number"
                      value={bookingAmount}
                      onChange={(e) => setBookingAmount(e.target.value)}
                      className="mt-1 w-full border border-white/15 bg-qc-panel px-3 py-2 font-mono text-xs text-qc-white focus:border-qc-lime focus:outline-none"
                    />
                  </div>

                  {/* Payment Status */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-qc-muted">
                      Payment Status
                    </label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as "paid" | "pending")}
                      className="mt-1 w-full border border-white/15 bg-qc-panel px-2.5 py-2 text-xs text-qc-white focus:outline-none"
                    >
                      <option value="paid" className="bg-qc-panel">Paid</option>
                      <option value="pending" className="bg-qc-panel">Pending</option>
                    </select>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-qc-muted">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) =>
                        setPaymentMethod(e.target.value as "cash" | "upi" | "card" | "offline")
                      }
                      className="mt-1 w-full border border-white/15 bg-qc-panel px-2.5 py-2 text-xs text-qc-white focus:outline-none"
                    >
                      <option value="cash" className="bg-qc-panel">Cash</option>
                      <option value="upi" className="bg-qc-panel">UPI</option>
                      <option value="card" className="bg-qc-panel">Card</option>
                      <option value="offline" className="bg-qc-panel">Offline / Pay at Venue</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowNewBookingModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={submittingBooking || !selectedSlot}
                  className="gap-2"
                >
                  {submittingBooking ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Confirming...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-qc-black" />
                      <span>Confirm & Reserve Slot</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* DRAWER / DETAILS MODAL: VIEW BOOKING */}
      {/* ========================================================== */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg border border-white/15 bg-qc-charcoal p-6 sm:p-7 space-y-6">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-qc-lime font-medium">
                  Booking Reference
                </span>
                <h3 className="font-display text-2xl text-qc-white">
                  {selectedBooking.customer?.name || "Player"}
                </h3>
                <p className="text-xs text-qc-muted font-mono">{selectedBooking.bookingId}</p>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-white/40 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Game Schedule */}
              <div className="border border-white/10 bg-qc-panel p-3.5 space-y-2">
                <div className="flex justify-between">
                  <span className="text-qc-muted">Sport & Court:</span>
                  <span className="text-qc-white font-medium">
                    {selectedBooking.sport?.name} · {selectedBooking.court?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-qc-muted">Date:</span>
                  <span className="text-qc-white font-mono">{selectedBooking.gameDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-qc-muted">Time Slot:</span>
                  <span className="text-qc-lime font-mono">
                    {format12h(selectedBooking.startTime)} - {format12h(selectedBooking.endTime)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-qc-muted">Players:</span>
                  <span className="text-qc-white">{selectedBooking.playerCount}</span>
                </div>
              </div>

              {/* Customer Contact */}
              <div className="border border-white/10 bg-qc-panel p-3.5 space-y-2">
                <div className="flex justify-between">
                  <span className="text-qc-muted">Phone:</span>
                  <span className="text-qc-white font-mono">
                    {selectedBooking.customer?.phone || "N/A"}
                  </span>
                </div>
                {selectedBooking.customer?.email && (
                  <div className="flex justify-between">
                    <span className="text-qc-muted">Email:</span>
                    <span className="text-qc-white">{selectedBooking.customer.email}</span>
                  </div>
                )}
              </div>

              {/* Pricing & Status */}
              <div className="border border-white/10 bg-qc-panel p-3.5 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-qc-muted">Booking Status:</span>
                  <span
                    className={`px-2 py-0.5 text-[9px] uppercase tracking-wider font-semibold ${
                      selectedBooking.bookingStatus === "confirmed"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : selectedBooking.bookingStatus === "cancelled"
                        ? "bg-red-500/10 text-red-400 border border-red-500/30"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {selectedBooking.bookingStatus}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-qc-muted">Payment:</span>
                  <span className="font-mono text-qc-white">
                    {selectedBooking.payment?.status?.toUpperCase()} ({selectedBooking.payment?.method || "cash"})
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-white/5">
                  <span className="text-qc-white font-medium">Total Amount:</span>
                  <span className="font-display text-xl text-qc-lime">
                    {formatINR(selectedBooking.pricing?.total || 0)}
                  </span>
                </div>
              </div>

              {/* Cancellation detail */}
              {selectedBooking.cancellation && (
                <div className="border border-red-500/20 bg-red-500/5 p-3 text-red-300">
                  <span className="font-semibold block">Cancelled:</span>
                  <span className="italic">{selectedBooking.cancellation.reason}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-white/10 pt-4">
              {selectedBooking.bookingStatus !== "cancelled" ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setCancelModalBooking(selectedBooking);
                  }}
                  className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                >
                  Cancel Booking
                </Button>
              ) : (
                <span className="text-xs text-red-400">Booking has been cancelled</span>
              )}

              {selectedBooking.bookingStatus === "pending" && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={actionLoading}
                  onClick={() => handleConfirmAction(selectedBooking.bookingId)}
                >
                  Confirm Game
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL 3: CANCELLATION CONFIRMATION */}
      {/* ========================================================== */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md border border-white/15 bg-qc-charcoal p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center bg-red-500/10 text-red-400 border border-red-500/30">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-xl text-qc-white">Cancel Booking</h3>
                <p className="text-xs text-qc-muted">
                  Release slot for {cancelModalBooking.customer?.name}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-qc-muted">
                Reason for Cancellation
              </label>
              <select
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="mt-1.5 w-full border border-white/15 bg-qc-panel px-3 py-2 text-xs text-qc-white focus:outline-none"
              >
                <option value="Player requested cancellation">Player requested cancellation</option>
                <option value="Weather / Rain disruption">Weather / Rain disruption</option>
                <option value="Maintenance / Turf repair">Maintenance / Turf repair</option>
                <option value="Double booked">Double booked</option>
                <option value="No-show">Player no-show</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCancelModalBooking(null)}
                disabled={actionLoading}
              >
                Keep Booking
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCancelAction}
                disabled={actionLoading}
                className="bg-red-500 text-white hover:bg-red-600 border-red-500"
              >
                {actionLoading ? "Cancelling..." : "Confirm Cancellation"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Section card component for grouped bookings
function BookingSection({
  title,
  count,
  items,
  format12h,
  onSelect,
  isPast,
}: {
  title: string;
  count: number;
  items: OwnerBooking[];
  format12h: (t: string) => string;
  onSelect: (b: OwnerBooking) => void;
  isPast?: boolean;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between border-b border-white/8 pb-2">
        <div className="flex items-center gap-2">
          <span className="font-display text-xl text-qc-white">{title}</span>
          <span className="border border-white/10 bg-qc-panel px-2 py-0.5 text-[10px] font-mono text-qc-muted">
            {count}
          </span>
        </div>
      </div>

      <div className="space-y-2.5">
        {items.map((b) => (
          <div
            key={b.bookingId}
            onClick={() => onSelect(b)}
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border p-4 transition cursor-pointer ${
              b.bookingStatus === "cancelled"
                ? "border-red-500/20 bg-qc-panel/40 opacity-70"
                : isPast
                ? "border-white/5 bg-qc-panel/50"
                : "border-white/10 bg-qc-panel hover:border-qc-lime/50 hover:bg-qc-panel/80"
            }`}
          >
            {/* Left: Sport, Court, Time */}
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/10 bg-qc-charcoal text-qc-lime font-display text-lg">
                {b.sport?.name?.charAt(0) || "S"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-display text-xl text-qc-white capitalize">
                    {b.sport?.name}
                  </p>
                  <span className="border border-white/10 bg-qc-charcoal px-2 py-0.5 text-[10px] text-white/70">
                    {b.court?.name}
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs text-qc-lime">
                  {format12h(b.startTime)} - {format12h(b.endTime)}
                  <span className="text-qc-muted"> · {b.gameDate}</span>
                </p>
              </div>
            </div>

            {/* Middle: Customer Details */}
            <div className="text-left sm:text-right">
              <p className="text-sm font-medium text-qc-white">
                {b.customer?.name}
              </p>
              <p className="font-mono text-xs text-qc-muted">
                {b.customer?.phone} · {b.playerCount} players
              </p>
            </div>

            {/* Right: Pricing & Status */}
            <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-white/8 pt-2 sm:pt-0">
              <div className="text-right">
                <p className="font-display text-xl text-qc-white">
                  {formatINR(b.pricing?.total || 0)}
                </p>
                <span
                  className={`text-[10px] uppercase tracking-wider font-semibold ${
                    b.bookingStatus === "confirmed"
                      ? "text-qc-lime"
                      : b.bookingStatus === "cancelled"
                      ? "text-red-400"
                      : "text-amber-400"
                  }`}
                >
                  {b.bookingStatus}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-white/30" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
