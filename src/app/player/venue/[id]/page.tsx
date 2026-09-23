"use client";

import { useEffect, useState, use, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Heart,
  Navigation,
  Phone,
  Mail,
  Camera,
  Globe,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  AlertCircle,
  Maximize2,
} from "lucide-react";
import { getVenueById, getFavorites, toggleFavorite } from "@/services/playerService";
import {
  bookSlotAtomically,
  subscribeToBlockedSlots,
  subscribeToDateAvailability,
} from "@/services/bookingService";
import { formatDistance, calculateDistanceKm, getGoogleMapsDirectionsUrl } from "@/lib/geo";
import { getVenueOperationalInfo } from "@/lib/operationalStatus";
import { generateSlotsForCourt, getNowInTimezone } from "@/lib/slotGenerator";
import { formatINR } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import { PhotoGalleryViewer } from "@/components/player/PhotoGalleryViewer";
import { getImageKitUrl, IMAGE_PRESETS } from "@/lib/imagekit";
import type {
  BusinessProfile,
  VenueCourt,
  GeneratedSlot,
  BlockedSlot,
  SlotLockData,
  BusinessImageItem,
} from "@/types";
import { cn } from "@/lib/cn";

export default function BusinessDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const businessId = resolvedParams.id;
  const router = useRouter();
  const { user, playerProfile } = useAuth();

  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"book" | "courts" | "hours" | "about" | "photos">("book");
  const [galleryViewerOpen, setGalleryViewerOpen] = useState(false);
  const [galleryViewerIndex, setGalleryViewerIndex] = useState(0);

  // Consolidated Venue Photos (Cover + Gallery)
  const venuePhotos: BusinessImageItem[] = useMemo(() => {
    if (!business) return [];
    const list: BusinessImageItem[] = [];
    const seenUrls = new Set<string>();

    // 1. Cover image first
    const cover =
      business.media?.coverImage ||
      (business.coverImageUrl ? { url: business.coverImageUrl, fileId: "cover" } : null);
    if (cover?.url) {
      list.push(cover);
      seenUrls.add(cover.url);
    }

    // 2. Gallery photos
    if (Array.isArray(business.media?.gallery)) {
      business.media.gallery.forEach((p, idx) => {
        const item: BusinessImageItem =
          typeof p === "string" ? { url: p, fileId: `legacy_${idx}`, order: idx } : p;
        if (item?.url && !seenUrls.has(item.url)) {
          list.push(item);
          seenUrls.add(item.url);
        }
      });
    }

    // 3. Logo fallback if no other photos exist
    if (list.length === 0) {
      const logo =
        business.media?.logo ||
        (business.logoUrl ? { url: business.logoUrl, fileId: "logo" } : null);
      if (logo?.url) list.push(logo);
    }

    return list;
  }, [business]);

  const handleOpenGallery = (index = 0) => {
    if (venuePhotos.length === 0) return;
    setGalleryViewerIndex(index);
    setGalleryViewerOpen(true);
  };

  // Booking Flow State
  const [selectedSport, setSelectedSport] = useState<string>("");
  const [selectedCourtId, setSelectedCourtId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });
  const [selectedSlot, setSelectedSlot] = useState<GeneratedSlot | null>(null);
  const [slotLocks, setSlotLocks] = useState<SlotLockData[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loadingBookings, setLoadingBookings] = useState<boolean>(false);

  // Player Form Confirmation inputs
  const [playerName, setPlayerName] = useState<string>("");
  const [playerPhone, setPlayerPhone] = useState<string>("");
  const [playerEmail, setPlayerEmail] = useState<string>("");
  const [bookingLoading, setBookingLoading] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Completed Booking State (for Confirmation Screen)
  const [confirmedBooking, setConfirmedBooking] = useState<{
    bookingId: string;
    readableId: string;
    courtName: string;
    sportName: string;
    date: string;
    time: string;
    price: number;
  } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getVenueById(businessId);
        setBusiness(data);

        // Pre-select first sport & court
        if (data) {
          const firstSport = data.categories?.[0] || data.courts?.[0]?.sportId || "";
          setSelectedSport(firstSport);
          const firstCourt = data.courts?.find((c) => c.sportId === firstSport) || data.courts?.[0];
          if (firstCourt) {
            setSelectedCourtId(firstCourt.courtId);
          }
        }

        // Calculate distance if player has coordinates
        const savedLat = sessionStorage.getItem("player_lat");
        const savedLng = sessionStorage.getItem("player_lng");
        if (
          savedLat &&
          savedLng &&
          data?.location?.coordinates?.latitude &&
          data?.location?.coordinates?.longitude
        ) {
          const d = calculateDistanceKm(
            parseFloat(savedLat),
            parseFloat(savedLng),
            data.location.coordinates.latitude,
            data.location.coordinates.longitude
          );
          setDistanceKm(d);
        }

        // Check if favorite
        if (user) {
          const favs = await getFavorites(user.uid);
          setIsFavorite(favs.includes(businessId));
        }
      } catch (err) {
        console.error("Error loading venue:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [businessId, user]);

  // Pre-fill player contact information
  useEffect(() => {
    if (playerProfile) {
      setPlayerName(playerProfile.name || user?.displayName || "");
      setPlayerPhone(playerProfile.phone || "");
      setPlayerEmail(playerProfile.email || user?.email || "");
    } else if (user) {
      setPlayerName(user.displayName || "Player");
      setPlayerEmail(user.email || "");
    }
  }, [playerProfile, user]);

  // Fetch & listen to live availability (slot locks and blocked slots) in real-time
  useEffect(() => {
    if (!businessId || !selectedDate) return;
    setLoadingBookings(true);

    // 1. Live slot locks (authoritative confirmed bookings & locks)
    const unsubLocks = subscribeToDateAvailability(
      businessId,
      selectedDate,
      (liveLocks) => {
        setSlotLocks(liveLocks);
        setLoadingBookings(false);
      },
      (err) => {
        console.error("Error subscribing to live slot locks:", err);
        setLoadingBookings(false);
      }
    );

    // 2. Live blocked slots (maintenance / venue blocks)
    const unsubBlocks = subscribeToBlockedSlots(
      businessId,
      selectedDate,
      (liveBlocks) => {
        setBlockedSlots(liveBlocks);
      },
      (err) => console.error("Error subscribing to live blocked slots:", err)
    );

    return () => {
      unsubLocks();
      unsubBlocks();
    };
  }, [businessId, selectedDate]);

  // Available courts filtered for selected sport (and active status)
  const availableCourtsForSport = useMemo(() => {
    if (!business?.courts) return [];
    return business.courts.filter((c) => {
      // Exclude inactive courts
      if (c.status === "inactive" || c.active === false) return false;
      if (!selectedSport) return true;
      return (
        !c.sportId ||
        c.sportId.toLowerCase() === selectedSport.toLowerCase() ||
        c.sportName?.toLowerCase() === selectedSport.toLowerCase()
      );
    });
  }, [business?.courts, selectedSport]);

  // Selected court object
  const selectedCourt = useMemo(() => {
    if (!business?.courts || business.courts.length === 0) return null;
    const matched = availableCourtsForSport.find((c) => c.courtId === selectedCourtId);
    if (matched) return matched;
    return availableCourtsForSport[0] || business.courts[0] || null;
  }, [business?.courts, availableCourtsForSport, selectedCourtId]);

  // Sync selected court when sport changes
  useEffect(() => {
    if (availableCourtsForSport.length > 0) {
      const isCurrentInAvailable = availableCourtsForSport.some((c) => c.courtId === selectedCourtId);
      if (!isCurrentInAvailable) {
        setSelectedCourtId(availableCourtsForSport[0].courtId);
        setSelectedSlot(null);
      }
    }
  }, [availableCourtsForSport, selectedCourtId]);

  // Generate real-time slots (past slots for today automatically disappear)
  const slotGenResult = useMemo(() => {
    if (!business || !selectedCourt) {
      return { isClosed: false, slots: [] };
    }
    return generateSlotsForCourt(
      business,
      selectedCourt,
      selectedDate,
      [], // Zero private customer data exposed
      undefined,
      blockedSlots,
      slotLocks
    );
  }, [business, selectedCourt, selectedDate, blockedSlots, slotLocks]);

  // 14-day date generator
  const next14Days = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${day}`;
      const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
      const month = d.toLocaleDateString("en-US", { month: "short" });
      const dayNum = d.getDate();
      days.push({
        dateStr,
        weekday: i === 0 ? "Today" : i === 1 ? "Tmrw" : weekday,
        month,
        dayNum,
      });
    }
    return days;
  }, []);

  const handleToggleFavorite = async () => {
    if (!user) {
      router.push("/player/login");
      return;
    }
    const nextState = !isFavorite;
    setIsFavorite(nextState);
    await toggleFavorite(user.uid, businessId, nextState, business || undefined);
  };

  // Switch court
  const handleSelectCourt = (courtId: string) => {
    setSelectedCourtId(courtId);
    setSelectedSlot(null);
    setBookingError(null);
  };

  // Switch sport
  const handleSelectSport = (sport: string) => {
    setSelectedSport(sport);
    const matchingCourt = business?.courts?.find(
      (c) => c.sportId === sport || c.sportName.toLowerCase() === sport.toLowerCase()
    );
    if (matchingCourt) {
      setSelectedCourtId(matchingCourt.courtId);
    }
    setSelectedSlot(null);
    setBookingError(null);
  };

  // Confirm booking
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push("/player/login");
      return;
    }
    if (!selectedSlot || !selectedCourt || !business) return;

    if (!playerName.trim()) {
      setBookingError("Please enter your name.");
      return;
    }
    if (!playerPhone.trim()) {
      setBookingError("Please enter your mobile phone number.");
      return;
    }

    setBookingLoading(true);
    setBookingError(null);

    try {
      const result = await bookSlotAtomically({
        businessId: business.businessId,
        ownerId: business.ownerId,
        courtId: selectedCourt.courtId,
        courtName: selectedCourt.name,
        sportId: selectedCourt.sportId || selectedSport || "sports",
        sportName: selectedCourt.sportName || selectedSport || "Sports",
        gameDate: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        durationMinutes: selectedCourt.slotDurationMinutes || 60,
        playerCount: 2,
        price: selectedSlot.price,
        customerName: playerName.trim(),
        customerPhone: playerPhone.trim(),
        customerEmail: playerEmail.trim() || user.email || "",
        playerId: user.uid,
      });

      // Show Confirmation Screen
      setConfirmedBooking({
        bookingId: result.bookingId,
        readableId: result.readableId,
        courtName: selectedCourt.name,
        sportName: selectedCourt.sportName || selectedSport,
        date: selectedDate,
        time: selectedSlot.label,
        price: selectedSlot.price,
      });

      setSelectedSlot(null);
    } catch (err: any) {
      setBookingError(
        err?.message || "This slot was just booked. Please select another slot."
      );
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-qc-lime" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h2 className="font-display text-3xl text-qc-white">Venue Not Found</h2>
        <p className="mt-2 text-xs text-qc-muted">
          The sports facility you are looking for does not exist or has been removed.
        </p>
        <Link
          href="/player/discover"
          className="mt-6 inline-flex items-center gap-2 border border-qc-lime bg-qc-lime px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-qc-black"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Discover
        </Link>
      </div>
    );
  }

  const opInfo = getVenueOperationalInfo(business);
  const directionsUrl = getGoogleMapsDirectionsUrl(
    business.location,
    business.businessName
  );

  const courts = business.courts || [];
  const sports = business.categories || [];
  const weekly = business.businessHours?.weeklySchedule;

  const daysOrder = [
    { key: "monday", label: "Monday" },
    { key: "tuesday", label: "Tuesday" },
    { key: "wednesday", label: "Wednesday" },
    { key: "thursday", label: "Thursday" },
    { key: "friday", label: "Friday" },
    { key: "saturday", label: "Saturday" },
    { key: "sunday", label: "Sunday" },
  ];

  // Group slots into periods
  const slotsByPeriod = {
    morning: slotGenResult.slots.filter((s) => s.period === "morning"),
    afternoon: slotGenResult.slots.filter((s) => s.period === "afternoon"),
    evening: slotGenResult.slots.filter((s) => s.period === "evening"),
    night: slotGenResult.slots.filter((s) => s.period === "night"),
  };

  // Formatted date string for summary (e.g. 21 September 2026)
  const formattedSelectedDate = new Date(`${selectedDate}T12:00:00`).toLocaleDateString(
    "en-IN",
    { day: "numeric", month: "long", year: "numeric" }
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      {/* Navigation Breadcrumb */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/player/discover"
          className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-white/60 hover:text-qc-lime transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Discovery
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleFavorite}
            className={cn(
              "flex items-center gap-1.5 border px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition",
              isFavorite
                ? "border-red-500/40 bg-red-500/10 text-red-400"
                : "border-white/10 bg-qc-panel text-white/70 hover:border-white/20 hover:text-white"
            )}
          >
            <Heart className={cn("h-4 w-4", isFavorite && "fill-red-400")} />
            {isFavorite ? "Favorited" : "Add to Favorites"}
          </button>
        </div>
      </div>

      {/* Hero Media & Venue Info */}
      <div className="relative border border-white/10 bg-qc-charcoal overflow-hidden mb-8">
        {(() => {
          const heroImageUrl = business.media?.coverImage?.url || business.coverImageUrl || venuePhotos[0]?.url;
          const logoUrl = business.media?.logo?.url || business.logoUrl;

          return (
            <>
              <div className="relative h-64 sm:h-80 md:h-96 w-full bg-qc-charcoal">
                {heroImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getImageKitUrl(heroImageUrl, IMAGE_PRESETS.HERO)}
                    alt={business.businessName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-qc-charcoal to-qc-panel">
                    <span className="font-display text-5xl tracking-widest text-white/20 uppercase">
                      {business.businessName}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-qc-black via-qc-black/50 to-transparent" />
              </div>

              {/* Profile Header overlay */}
              <div className="absolute bottom-0 inset-x-0 p-6 sm:p-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <div
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase tracking-wider border backdrop-blur-md",
                        opInfo.colorClass.badge
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", opInfo.colorClass.dot)} />
                      {opInfo.label}
                    </div>

                    {distanceKm !== null && (
                      <span className="inline-flex items-center gap-1 border border-white/20 bg-black/60 px-2.5 py-1 text-xs text-qc-lime backdrop-blur-md font-medium">
                        <MapPin className="h-3 w-3" />
                        {formatDistance(distanceKm)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3.5 mt-2">
                    {logoUrl && (
                      <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-sm border border-white/20 bg-qc-panel overflow-hidden shrink-0 shadow-lg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getImageKitUrl(logoUrl, IMAGE_PRESETS.LOGO)}
                          alt={`${business.businessName} logo`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <div>
                      <h1 className="font-display text-3xl sm:text-5xl md:text-6xl text-qc-white tracking-tight">
                        {business.businessName}
                      </h1>
                      <p className="mt-1 flex items-center gap-1.5 text-xs sm:text-sm text-white/80">
                        <MapPin className="h-4 w-4 shrink-0 text-qc-lime" />
                        {[
                          business.location?.address,
                          business.location?.city,
                          business.location?.state,
                          business.location?.pinCode,
                        ]
                          .filter(Boolean)
                          .join(", ") || "Address on request"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 flex-wrap">
                  {venuePhotos.length > 0 && (
                    <button
                      onClick={() => handleOpenGallery(0)}
                      className="flex items-center gap-2 border border-white/20 bg-black/60 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:text-qc-lime hover:border-qc-lime/50 transition backdrop-blur-md"
                    >
                      <Camera className="h-4 w-4 text-qc-lime" />
                      Photos ({venuePhotos.length})
                    </button>
                  )}
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 border border-white/20 bg-black/60 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:text-qc-lime hover:border-qc-lime/50 transition backdrop-blur-md"
                  >
                    <Navigation className="h-4 w-4 text-qc-lime" />
                    Directions
                  </a>
                  <button
                    onClick={() => setActiveTab("book")}
                    className="flex items-center gap-2 bg-qc-lime px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-qc-black transition hover:bg-qc-lime/90"
                  >
                    <Calendar className="h-4 w-4" />
                    Book Slot
                  </button>
                </div>
              </div>
            </>
          );
        })()}
      </div>

      {/* Tabs Bar */}
      <div className="border-b border-white/10 mb-8 flex items-center gap-6 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab("book")}
          className={cn(
            "pb-3 text-xs font-bold uppercase tracking-[0.16em] transition border-b-2 flex items-center gap-1.5 whitespace-nowrap",
            activeTab === "book"
              ? "border-qc-lime text-qc-lime"
              : "border-transparent text-white/60 hover:text-white"
          )}
        >
          <Calendar className="h-3.5 w-3.5" />
          Book a Slot
        </button>
        <button
          onClick={() => setActiveTab("courts")}
          className={cn(
            "pb-3 text-xs font-bold uppercase tracking-[0.16em] transition border-b-2 whitespace-nowrap",
            activeTab === "courts"
              ? "border-qc-lime text-qc-lime"
              : "border-transparent text-white/60 hover:text-white"
          )}
        >
          Courts & Pricing ({courts.length})
        </button>
        <button
          onClick={() => setActiveTab("photos")}
          className={cn(
            "pb-3 text-xs font-bold uppercase tracking-[0.16em] transition border-b-2 flex items-center gap-1.5 whitespace-nowrap",
            activeTab === "photos"
              ? "border-qc-lime text-qc-lime"
              : "border-transparent text-white/60 hover:text-white"
          )}
        >
          <Camera className="h-3.5 w-3.5" />
          Photos ({venuePhotos.length})
        </button>
        <button
          onClick={() => setActiveTab("hours")}
          className={cn(
            "pb-3 text-xs font-bold uppercase tracking-[0.16em] transition border-b-2 whitespace-nowrap",
            activeTab === "hours"
              ? "border-qc-lime text-qc-lime"
              : "border-transparent text-white/60 hover:text-white"
          )}
        >
          Hours & Schedule
        </button>
        <button
          onClick={() => setActiveTab("about")}
          className={cn(
            "pb-3 text-xs font-bold uppercase tracking-[0.16em] transition border-b-2 whitespace-nowrap",
            activeTab === "about"
              ? "border-qc-lime text-qc-lime"
              : "border-transparent text-white/60 hover:text-white"
          )}
        >
          About & Contact
        </button>
      </div>

      {/* TAB 1: INTERACTIVE BOOKING FLOW */}
      {activeTab === "book" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Columns: Sport, Court, Date, Slots */}
          <div className="lg:col-span-2 space-y-8">
            {/* Step 1: Sport Selection */}
            {sports.length > 0 && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-qc-lime block mb-2">
                  Step 1 · Choose Sport
                </span>
                <div className="flex flex-wrap gap-2">
                  {sports.map((sport) => {
                    const isSelected = selectedSport.toLowerCase() === sport.toLowerCase();
                    return (
                      <button
                        key={sport}
                        onClick={() => handleSelectSport(sport)}
                        className={cn(
                          "px-4 py-2 text-xs font-semibold uppercase tracking-wider transition border",
                          isSelected
                            ? "border-qc-lime bg-qc-lime text-qc-black font-bold"
                            : "border-white/10 bg-qc-panel text-white/70 hover:border-white/20 hover:text-white"
                        )}
                      >
                        {sport}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Court Selection */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-qc-lime block mb-2">
                Step 2 · Select Court / Ground
              </span>
              {availableCourtsForSport.length === 0 ? (
                <div className="border border-white/10 bg-qc-panel p-4 text-xs text-qc-muted">
                  No active grounds available for the selected sport at this facility.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableCourtsForSport.map((court) => {
                    const isSelected = selectedCourt?.courtId === court.courtId;
                    const isMaintenance = court.status === "maintenance";
                    const isActive =
                      !isMaintenance &&
                      (court.status === "active" || (court.status === undefined && court.active !== false));

                    return (
                      <button
                        key={court.courtId}
                        onClick={() => isActive && handleSelectCourt(court.courtId)}
                        disabled={!isActive}
                        className={cn(
                          "flex flex-col justify-between border p-4 text-left transition",
                          isMaintenance
                            ? "border-amber-500/20 bg-amber-500/5 opacity-50 cursor-not-allowed"
                            : isSelected
                            ? "border-qc-lime bg-qc-charcoal shadow-lg shadow-qc-lime/5"
                            : "border-white/10 bg-qc-panel hover:border-white/20"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-display text-xl text-qc-white">
                                {court.name}
                              </h3>
                              {isMaintenance && (
                                <span className="border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-300">
                                  Maintenance
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] uppercase tracking-wider text-qc-muted block mt-0.5">
                              {court.sportName || court.sportId}
                            </span>
                          </div>
                          {isSelected && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-qc-lime text-qc-black">
                              <Check className="h-3 w-3 stroke-[3]" />
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2">
                          <span className="text-xs font-bold text-qc-lime">
                            {formatINR(court.pricePerHour || 0)}/hr
                          </span>
                          <span className="text-[10px] text-white/50">
                            {court.slotDurationMinutes || 60}m slots
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 3: Date Selection (14-Day Strip) */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-qc-lime block mb-2">
                Step 3 · Select Date
              </span>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {next14Days.map((d) => {
                  const isSelected = selectedDate === d.dateStr;
                  return (
                    <button
                      key={d.dateStr}
                      onClick={() => {
                        setSelectedDate(d.dateStr);
                        setSelectedSlot(null);
                        setBookingError(null);
                      }}
                      className={cn(
                        "flex min-w-[72px] flex-col items-center justify-center border py-2.5 px-2 transition shrink-0",
                        isSelected
                          ? "border-qc-lime bg-qc-lime text-qc-black font-bold shadow-md shadow-qc-lime/10"
                          : "border-white/10 bg-qc-panel text-white/70 hover:border-white/20 hover:text-white"
                      )}
                    >
                      <span className="text-[10px] uppercase tracking-wider">
                        {d.weekday}
                      </span>
                      <span className="text-lg font-bold leading-tight my-0.5">
                        {d.dayNum}
                      </span>
                      <span className="text-[9px] uppercase tracking-widest text-white/60">
                        {d.month}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 4: Time Slot Grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-qc-lime block">
                  Step 4 · Select Available Slot
                </span>
                {loadingBookings && (
                  <span className="flex items-center gap-1.5 text-xs text-qc-muted">
                    <Loader2 className="h-3 w-3 animate-spin text-qc-lime" />
                    Checking availability...
                  </span>
                )}
              </div>

              {slotGenResult.isClosed ? (
                <div className="border border-red-500/30 bg-red-500/10 p-6 text-center text-xs text-red-400">
                  <AlertCircle className="mx-auto h-8 w-8 text-red-400 mb-2" />
                  <p className="font-semibold">{slotGenResult.closureReason || "Venue is closed on this date."}</p>
                  <p className="mt-1 text-[11px] text-white/60">Please pick another date from the calendar above.</p>
                </div>
              ) : slotGenResult.slots.length === 0 ? (
                <div className="border border-white/10 bg-qc-panel p-6 text-center text-xs text-qc-muted">
                  No time slots are configured for this court on this date.
                </div>
              ) : (
                <div className="space-y-6">
                  {(["morning", "afternoon", "evening", "night"] as const).map((period) => {
                    const periodSlots = slotsByPeriod[period];
                    if (periodSlots.length === 0) return null;

                    const periodTitles = {
                      morning: "Morning (Before 12 PM)",
                      afternoon: "Afternoon (12 PM – 5 PM)",
                      evening: "Evening (5 PM – 9 PM)",
                      night: "Night (9 PM Onwards)",
                    };

                    return (
                      <div key={period}>
                        <h4 className="text-xs uppercase tracking-wider text-white/50 mb-2.5 font-semibold">
                          {periodTitles[period]}
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {periodSlots.map((slot) => {
                            const isSelected = selectedSlot?.slotId === slot.slotId;
                            const isBooked = slot.isBooked;
                            const isBlocked = slot.isBlocked;
                            const isAvailable = slot.isAvailable;

                            return (
                              <button
                                key={slot.slotId}
                                onClick={() => {
                                  if (isAvailable) {
                                    setSelectedSlot(slot);
                                    setBookingError(null);
                                  }
                                }}
                                disabled={!isAvailable}
                                title={
                                  isBooked
                                    ? "This slot is already booked"
                                    : isBlocked
                                    ? `Unavailable: ${slot.blockReason || "Blocked"}`
                                    : undefined
                                }
                                className={cn(
                                  "flex flex-col items-center justify-center p-2.5 border text-center transition",
                                  isSelected
                                    ? "border-qc-lime bg-qc-lime text-qc-black font-bold shadow-lg shadow-qc-lime/20"
                                    : isAvailable
                                    ? "border-white/15 bg-qc-panel hover:border-qc-lime hover:bg-qc-lime/5 text-qc-white cursor-pointer"
                                    : isBlocked
                                    ? "border-amber-500/40 bg-amber-950/20 text-amber-200/70 cursor-not-allowed"
                                    : isBooked
                                    ? "border-red-500/40 bg-red-950/20 text-white/90 cursor-not-allowed shadow-inner"
                                    : "border-white/5 bg-qc-charcoal/20 text-white/20 cursor-not-allowed"
                                )}
                              >
                                <span
                                  className={cn(
                                    "text-xs font-semibold",
                                    isBooked ? "text-red-200" : isBlocked ? "text-amber-200" : ""
                                  )}
                                >
                                  {slot.startTime} – {slot.endTime}
                                </span>
                                <span className="text-[10px] mt-1 uppercase tracking-wider font-bold">
                                  {isBooked ? (
                                    <span className="inline-flex items-center gap-1 text-red-400 font-bold">
                                      <CheckCircle2 className="h-2.5 w-2.5" />
                                      <span>BOOKED</span>
                                    </span>
                                  ) : isBlocked ? (
                                    <span className="text-amber-400">BLOCKED</span>
                                  ) : (
                                    <span className={isSelected ? "text-qc-black font-bold" : "text-qc-lime font-bold"}>
                                      {formatINR(slot.price)} · AVAILABLE
                                    </span>
                                  )}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Booking Summary & Confirm Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 border border-white/10 bg-qc-panel p-6 shadow-2xl">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-qc-lime block mb-1">
                Booking Summary
              </span>
              <h3 className="font-display text-2xl text-qc-white mb-4">
                Reservation Details
              </h3>

              {bookingError && (
                <div className="mb-4 flex items-start gap-2 border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{bookingError}</span>
                </div>
              )}

              {/* Summary Items */}
              <div className="space-y-3 text-xs border-y border-white/8 py-4 mb-4">
                <div className="flex justify-between">
                  <span className="text-qc-muted">Venue</span>
                  <span className="font-semibold text-qc-white text-right">
                    {business.businessName}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-qc-muted">Sport</span>
                  <span className="font-semibold text-qc-white capitalize">
                    {selectedCourt?.sportName || selectedSport}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-qc-muted">Court</span>
                  <span className="font-semibold text-qc-white">
                    {selectedCourt?.name || "Select a court"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-qc-muted">Date</span>
                  <span className="font-semibold text-qc-white">
                    {formattedSelectedDate}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-qc-muted">Time Slot</span>
                  <span className={selectedSlot ? "font-semibold text-qc-lime" : "text-qc-muted"}>
                    {selectedSlot ? selectedSlot.label : "Select a time slot"}
                  </span>
                </div>

                <div className="flex justify-between pt-2 border-t border-white/5 text-sm">
                  <span className="font-semibold text-qc-white">Total Amount</span>
                  <span className="font-bold text-qc-lime text-base">
                    {selectedSlot ? formatINR(selectedSlot.price) : "₹0"}
                  </span>
                </div>
              </div>

              {/* Contact Confirmation Form */}
              {selectedSlot ? (
                <form onSubmit={handleConfirmBooking} className="space-y-3">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-qc-muted mb-1">
                      Player Name *
                    </label>
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      required
                      placeholder="Your name"
                      className="w-full border border-white/15 bg-qc-charcoal px-3 py-2 text-xs text-qc-white focus:border-qc-lime focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-qc-muted mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={playerPhone}
                      onChange={(e) => setPlayerPhone(e.target.value)}
                      required
                      placeholder="+91 98765 43210"
                      className="w-full border border-white/15 bg-qc-charcoal px-3 py-2 text-xs text-qc-white focus:border-qc-lime focus:outline-none"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={bookingLoading}
                      className="flex w-full items-center justify-center gap-2 bg-qc-lime py-3 text-xs font-bold uppercase tracking-[0.16em] text-qc-black transition hover:bg-qc-lime/90 disabled:opacity-50"
                    >
                      {bookingLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Securing Slot...
                        </>
                      ) : (
                        `Confirm Booking · ${formatINR(selectedSlot.price)}`
                      )}
                    </button>
                    <p className="mt-2 text-center text-[10px] text-qc-muted">
                      Pay at venue • Double-booking protected
                    </p>
                  </div>
                </form>
              ) : (
                <div className="text-center py-4 text-xs text-qc-muted">
                  Please pick a date and an available time slot to complete your reservation.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Courts List */}
      {activeTab === "courts" && (
        <div>
          <div className="mb-4">
            <h2 className="font-display text-2xl text-qc-white">
              Available Courts & Pricing
            </h2>
            <p className="text-xs text-qc-muted">
              Live court pricing and status set by the facility owner
            </p>
          </div>

          {courts.length === 0 ? (
            <div className="border border-white/10 bg-qc-panel p-8 text-center text-xs text-qc-muted">
              No individual courts have been listed by this venue yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courts.map((court, idx) => {
                const isActive =
                  court.status === "active" || (court.status === undefined && court.active !== false);
                const isMaintenance = court.status === "maintenance";

                return (
                  <div
                    key={court.courtId || idx}
                    className="border border-white/10 bg-qc-panel p-5 transition hover:border-qc-lime/30 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-qc-muted block mb-1">
                            {court.sportName || court.sportId || "Sport Court"}
                          </span>
                          <h3 className="font-display text-2xl text-qc-white">
                            {court.name}
                          </h3>
                        </div>

                        {isActive ? (
                          <span className="inline-flex items-center gap-1 border border-qc-lime/30 bg-qc-lime/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-qc-lime">
                            <CheckCircle2 className="h-3 w-3" />
                            Available
                          </span>
                        ) : isMaintenance ? (
                          <span className="inline-flex items-center gap-1 border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-400">
                            <AlertTriangle className="h-3 w-3" />
                            Maintenance
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-red-400">
                            <XCircle className="h-3 w-3" />
                            Unavailable
                          </span>
                        )}
                      </div>

                      {court.description && (
                        <p className="text-xs text-qc-muted mb-4 line-clamp-2">
                          {court.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/8 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase tracking-widest text-qc-muted block">
                          Hourly Rate
                        </span>
                        <div className="text-xl font-bold text-qc-lime">
                          {formatINR(court.pricePerHour || 0)}
                          <span className="text-xs font-normal text-qc-muted">/hr</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedCourtId(court.courtId);
                          setActiveTab("book");
                        }}
                        disabled={!isActive}
                        className="border border-qc-lime bg-qc-lime/10 px-3 py-1.5 text-xs font-semibold text-qc-lime hover:bg-qc-lime hover:text-qc-black transition disabled:opacity-40"
                      >
                        Book This Court
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Hours & Schedule */}
      {activeTab === "hours" && (
        <div className="max-w-2xl">
          <div className="mb-4">
            <h2 className="font-display text-2xl text-qc-white">
              7-Day Operating Hours
            </h2>
            <p className="text-xs text-qc-muted">
              Current operational schedule verified by the venue
            </p>
          </div>

          <div className="border border-white/10 bg-qc-panel divide-y divide-white/5">
            {daysOrder.map(({ key, label }) => {
              const day = weekly ? (weekly as any)[key] : null;
              const isOpen = day ? day.isOpen : true;
              const hoursText = day
                ? isOpen
                  ? `${day.openTime || "06:00"} – ${day.closeTime || "23:00"}`
                  : "Closed"
                : `${business.businessHours?.startTime || "06:00"} – ${business.businessHours?.endTime || "23:00"}`;

              return (
                <div key={key} className="flex items-center justify-between p-4 text-xs">
                  <span className="font-semibold uppercase tracking-wider text-qc-white">
                    {label}
                  </span>
                  <span
                    className={cn(
                      "font-mono font-medium",
                      isOpen ? "text-qc-lime" : "text-red-400"
                    )}
                  >
                    {hoursText}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: About & Contact */}
      {activeTab === "about" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="font-display text-2xl text-qc-white mb-2">About the Venue</h2>
            <p className="text-sm text-qc-muted leading-relaxed whitespace-pre-line">
              {business.description || "No description provided by the venue yet."}
            </p>

            <div className="mt-6">
              <h3 className="font-display text-xl text-qc-white mb-3">Sports Supported</h3>
              <div className="flex flex-wrap gap-2">
                {sports.map((sport) => (
                  <span
                    key={sport}
                    className="border border-qc-lime/30 bg-qc-lime/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-qc-lime"
                  >
                    {sport}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h2 className="font-display text-2xl text-qc-white mb-4">Contact & Location</h2>
            <div className="border border-white/10 bg-qc-panel p-6 space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-qc-lime shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-qc-muted">Address</h4>
                  <p className="text-sm text-qc-white mt-0.5">
                    {[
                      business.location?.address,
                      business.location?.city,
                      business.location?.state,
                      business.location?.pinCode,
                    ]
                      .filter(Boolean)
                      .join(", ") || "Address available on request"}
                  </p>
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-qc-lime hover:underline"
                  >
                    Open in Google Maps →
                  </a>
                </div>
              </div>

              {(business.contact?.phone || business.owner?.phone) && (
                <div className="flex items-start gap-3 pt-3 border-t border-white/5">
                  <Phone className="h-4 w-4 text-qc-lime shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-qc-muted">Phone</h4>
                    <p className="text-sm text-qc-white mt-0.5">
                      {business.contact?.phone || business.owner?.phone}
                    </p>
                  </div>
                </div>
              )}

              {(business.contact?.email || business.owner?.email) && (
                <div className="flex items-start gap-3 pt-3 border-t border-white/5">
                  <Mail className="h-4 w-4 text-qc-lime shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-qc-muted">Email</h4>
                    <p className="text-sm text-qc-white mt-0.5">
                      {business.contact?.email || business.owner?.email}
                    </p>
                  </div>
                </div>
              )}

              {business.social?.instagram && (
                <div className="flex items-start gap-3 pt-3 border-t border-white/5">
                  <Camera className="h-4 w-4 text-qc-lime shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-qc-muted">Instagram</h4>
                    <a
                      href={`https://instagram.com/${business.social.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-qc-white hover:text-qc-lime transition"
                    >
                      @{business.social.instagram}
                    </a>
                  </div>
                </div>
              )}

              {business.social?.website && (
                <div className="flex items-start gap-3 pt-3 border-t border-white/5">
                  <Globe className="h-4 w-4 text-qc-lime shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-qc-muted">Website</h4>
                    <a
                      href={business.social.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-qc-white hover:text-qc-lime transition truncate block max-w-xs"
                    >
                      {business.social.website}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: PHOTOS & GALLERY */}
      {activeTab === "photos" && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl text-qc-white">
                Venue Photos & Gallery
              </h2>
              <p className="text-xs text-qc-muted mt-1">
                Explore courts, amenities, and facilities at {business.businessName} ({venuePhotos.length} {venuePhotos.length === 1 ? "photo" : "photos"})
              </p>
            </div>
            {venuePhotos.length > 0 && (
              <button
                onClick={() => handleOpenGallery(0)}
                className="inline-flex items-center gap-2 bg-qc-lime px-4 py-2 text-xs font-bold uppercase tracking-wider text-qc-black hover:bg-qc-lime/90 transition self-start sm:self-auto"
              >
                <Camera className="h-4 w-4" />
                View Fullscreen Gallery
              </button>
            )}
          </div>

          {venuePhotos.length === 0 ? (
            <div className="border border-white/10 bg-qc-charcoal/50 p-12 text-center">
              <Camera className="h-12 w-12 text-qc-muted mx-auto mb-3 opacity-40" />
              <h3 className="font-display text-lg text-qc-white">No Photos Uploaded</h3>
              <p className="text-xs text-qc-muted mt-1 max-w-sm mx-auto">
                The venue owner has not uploaded any photos to their gallery yet.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Google Maps / Zomato style Mosaic Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* Main Large Photo */}
                <div
                  onClick={() => handleOpenGallery(0)}
                  className="md:col-span-2 relative h-64 sm:h-80 md:h-96 cursor-pointer overflow-hidden border border-white/10 group bg-qc-charcoal"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getImageKitUrl(venuePhotos[0].url, IMAGE_PRESETS.HERO)}
                    alt={`${business.businessName} photo 1`}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <span className="text-xs font-semibold text-qc-white flex items-center gap-1.5">
                      <Maximize2 className="h-3.5 w-3.5 text-qc-lime" /> View Fullscreen
                    </span>
                  </div>
                  {venuePhotos[0].order === 0 && (
                    <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2 py-0.5 border border-white/10 text-[10px] uppercase tracking-wider font-bold text-qc-lime">
                      Cover Photo
                    </div>
                  )}
                </div>

                {/* 4 Thumbnails / Grid Tiles */}
                <div className="md:col-span-2 grid grid-cols-2 gap-3 h-64 sm:h-80 md:h-96">
                  {venuePhotos.slice(1, 5).map((photo, idx) => {
                    const photoIndex = idx + 1;
                    const isLastTile = idx === 3 && venuePhotos.length > 5;
                    const remainingCount = venuePhotos.length - 5;

                    return (
                      <div
                        key={photo.fileId || photo.url || photoIndex}
                        onClick={() => handleOpenGallery(photoIndex)}
                        className="relative h-full w-full cursor-pointer overflow-hidden border border-white/10 group bg-qc-charcoal"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getImageKitUrl(photo.url, IMAGE_PRESETS.CARD)}
                          alt={`${business.businessName} photo ${photoIndex + 1}`}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {isLastTile ? (
                          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-2 text-center transition group-hover:bg-black/85">
                            <span className="font-display text-2xl sm:text-3xl text-qc-lime">
                              +{remainingCount}
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-white mt-1">
                              More Photos
                            </span>
                          </div>
                        ) : (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Maximize2 className="h-5 w-5 text-qc-lime" />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Empty slot fillers if fewer than 5 photos */}
                  {venuePhotos.length < 5 &&
                    Array.from({ length: Math.max(0, 4 - (venuePhotos.length - 1)) }).map((_, i) => (
                      <div
                        key={`empty-${i}`}
                        className="hidden sm:flex h-full w-full items-center justify-center border border-white/5 bg-qc-panel/30 text-white/20"
                      >
                        <Camera className="h-6 w-6 opacity-30" />
                      </div>
                    ))}
                </div>
              </div>

              {/* Complete Photo Grid */}
              {venuePhotos.length > 1 && (
                <div className="pt-6 border-t border-white/10">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-qc-muted mb-4">
                    All Photos ({venuePhotos.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {venuePhotos.map((photo, index) => (
                      <div
                        key={photo.fileId || photo.url || index}
                        onClick={() => handleOpenGallery(index)}
                        className="relative aspect-square cursor-pointer overflow-hidden border border-white/10 group bg-qc-charcoal"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getImageKitUrl(photo.url, IMAGE_PRESETS.CARD)}
                          alt={`${business.businessName} photo ${index + 1}`}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Maximize2 className="h-4 w-4 text-qc-lime" />
                        </div>
                        <span className="absolute bottom-1 right-1 bg-black/70 px-1.5 py-0.5 text-[9px] font-mono text-white/80">
                          {index + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CONFIRMATION MODAL (Step 6) */}
      {confirmedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-md border border-qc-lime/40 bg-qc-charcoal p-6 sm:p-8 shadow-2xl text-center">
            {/* Success Icon Badge */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-qc-lime/20 border border-qc-lime/40">
              <CheckCircle2 className="h-8 w-8 text-qc-lime" />
            </div>

            <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-qc-lime">
              Slot Reserved Successfully
            </span>
            <h2 className="font-display text-3xl sm:text-4xl text-qc-white mt-1">
              Booking Confirmed
            </h2>

            {/* Booking ID Pill */}
            <div className="my-4 inline-flex items-center gap-2 border border-white/15 bg-qc-panel px-3 py-1.5 font-mono text-xs font-bold text-qc-lime">
              <span>Booking ID:</span>
              <span>{confirmedBooking.readableId}</span>
            </div>

            {/* Receipt Summary Card */}
            <div className="border border-white/10 bg-qc-panel p-4 text-xs space-y-2.5 my-4 text-left">
              <div className="flex justify-between">
                <span className="text-qc-muted">Venue</span>
                <span className="font-semibold text-qc-white">{business.businessName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-qc-muted">Sport & Court</span>
                <span className="font-semibold text-qc-white">
                  {confirmedBooking.sportName} · {confirmedBooking.courtName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-qc-muted">Date</span>
                <span className="font-semibold text-qc-white">{confirmedBooking.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-qc-muted">Time Slot</span>
                <span className="font-semibold text-qc-lime">{confirmedBooking.time}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-white/5 font-bold text-sm">
                <span className="text-qc-white">Amount</span>
                <span className="text-qc-lime">{formatINR(confirmedBooking.price)}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mt-6">
              <Link
                href="/player/bookings"
                className="flex-1 bg-qc-lime py-3 text-xs font-bold uppercase tracking-wider text-qc-black transition hover:bg-qc-lime/90 text-center"
              >
                View My Bookings
              </Link>
              <button
                onClick={() => setConfirmedBooking(null)}
                className="flex-1 border border-white/20 bg-qc-panel py-3 text-xs font-semibold uppercase tracking-wider text-white hover:bg-white/5 transition"
              >
                Book Another Slot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox Photo Gallery Viewer */}
      <PhotoGalleryViewer
        photos={venuePhotos}
        initialIndex={galleryViewerIndex}
        isOpen={galleryViewerOpen}
        onClose={() => setGalleryViewerOpen(false)}
        businessName={business.businessName}
        coverUrl={business.media?.coverImage?.url || business.coverImageUrl}
      />
    </div>
  );
}
