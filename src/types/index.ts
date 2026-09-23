export type Sport =
  | "football"
  | "basketball"
  | "cricket"
  | "badminton"
  | "tennis";

export type SkillLevel = "beginner" | "intermediate" | "advanced" | "pro";

export type SlotStatus = "AVAILABLE" | "BOOKED" | "BLOCKED" | "QUICKFILL";

export type SubscriptionPlan = "STARTER" | "GROWTH" | "PRO";

export type SubscriptionStatus = "TRIAL" | "ACTIVE" | "EXPIRED" | "CANCELLED";

export type TextSide = "left" | "right";

export interface VideoAsset {
  id: Sport;
  label: string;
  src: string;
  webm?: string;
  poster: string;
  textSide: TextSide;
  demandLabel: string;
  cta: string;
  ctaHref: string;
  hud: {
    radius: string;
    time: string;
    signal: string;
  };
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  sports: Sport[];
  skillLevels: Partial<Record<Sport, SkillLevel>>;
  gamesPlayed: number;
  gamesJoined: number;
  playScore: number;
  location: string;
}

export interface Facility {
  id: string;
  name: string;
  address: string;
  sports: Sport[];
  rating: number;
  distanceKm: number;
  image: string;
  priceFrom: number;
  lat: number;
  lng: number;
  operatingHours: string;
}

export interface Court {
  id: string;
  facilityId: string;
  name: string;
  sport: Sport;
  capacity: number;
  pricePerHour: number;
  available: boolean;
}

export interface Slot {
  id: string;
  courtId: string;
  facilityId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: SlotStatus;
  price: number;
  occupancyPct: number;
}

export interface Game {
  id: string;
  sport: Sport;
  facilityId?: string;
  facilityName?: string;
  date: string;
  time: string;
  playersNeeded: number;
  playersJoined: number;
  matchPct: number;
  skill: SkillLevel;
  pricePerPlayer: number;
  playerIds: string[];
  status: "forming" | "locked" | "completed" | "cancelled";
}

export interface QuickFillOffer {
  id: string;
  facilityId: string;
  facilityName: string;
  sport: Sport;
  slot: string;
  originalPrice: number;
  offerPrice: number;
  nearbyPlayers: number;
  expectedOccupancy: number;
  currentOccupancy: number;
}

export interface DemandSignal {
  sport: Sport;
  players: number;
  radiusKm: number;
  time: string;
  location: string;
}

export interface Booking {
  id: string;
  gameId: string;
  facilityName: string;
  sport: Sport;
  date: string;
  time: string;
  players: number;
  total: number;
  status: "confirmed" | "pending" | "cancelled";
}

export interface OwnerKpis {
  todayRevenue: number;
  occupancy: number;
  bookings: number;
  emptySlots: number;
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface DemandOpportunity {
  id: string;
  sport: Sport;
  when: string;
  demand: "HIGH" | "MEDIUM" | "LOW";
  nearbyPlayers: number;
  capacity: number;
  opportunity: number;
  recommendation: string;
}

export interface Subscription {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  priceMonthly: number;
  expiresInDays: number;
  trialDaysLeft?: number;
}

export interface DemandPoolInput {
  sport: Sport;
  date: string;
  time: string;
  location: string;
  radiusKm: number;
  budget: number;
  skill: SkillLevel;
}

export interface OwnerUser {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  role: "owner" | "admin";
  authProvider: "password" | "google";
  createdAt?: any;
  updatedAt?: any;
}

export type SportCategory =
  | "cricket"
  | "football"
  | "futsal"
  | "basketball"
  | "tennis"
  | "badminton"
  | "volleyball"
  | "table_tennis"
  | "box_cricket"
  | "pickleball"
  | "hockey"
  | "swimming"
  | "kabaddi"
  | "gym_fitness"
  | "other";

export type CourtStatus = "active" | "maintenance" | "inactive";

export interface VenueCourt {
  courtId: string;
  name: string;
  sportId: string;       // matches category id, e.g. "box_cricket"
  sportName: string;     // e.g. "Box Cricket"
  pricePerHour: number;  // e.g. 800
  status?: CourtStatus;  // "active" | "maintenance" | "inactive"
  slotDurationMinutes?: 30 | 60; // 30 mins (1/2 h) or 60 mins (1 h)
  active?: boolean;
  description?: string;
}

export type BookingStatus = "confirmed" | "cancelled" | "completed" | "pending" | "no_show";
export type BookingSource = "player" | "owner" | "guest";
export type PaymentStatus = "pending" | "paid" | "partially_paid" | "refunded" | "failed";

export interface BlockedSlot {
  blockId: string;
  businessId: string;
  ownerId: string;
  courtId: string;
  courtName?: string;
  gameDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  reason: string;
  blockedAt?: any;
}

export interface OwnerBooking {
  bookingId: string;
  readableId?: string; // e.g. "QC-20260921-A8B9"
  businessId: string;
  ownerId: string;
  playerId?: string; // alias for customer.userId
  source?: BookingSource;
  customer: {
    userId?: string;
    name: string;
    phone: string;
    email?: string;
  };
  sport: {
    id: string;
    name: string;
  };
  court: {
    courtId: string;
    name: string;
  };
  gameDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm (24-hour)
  endTime: string;   // HH:mm (24-hour)
  startAt?: any;     // Firestore Timestamp or ISO string
  endAt?: any;
  durationMinutes?: number;
  playerCount: number;
  pricing: {
    subtotal: number;
    discount?: number;
    total: number;
    currency: string;
  };
  price?: number; // direct total price alias
  bookingStatus: BookingStatus;
  status?: BookingStatus; // alias for bookingStatus
  payment: {
    status: PaymentStatus;
    method?: "online" | "cash" | "upi" | "card" | "offline" | "pay_at_venue";
    paidAt?: any;
  };
  cancellation?: {
    reason: string;
    cancelledAt?: any;
    cancelledBy?: "player" | "owner" | "admin" | string;
  };
  confirmedAt?: any;
  completedAt?: any;
  noShowAt?: any;
  createdAt?: any;
  updatedAt?: any;
}

export interface SlotLockData {
  lockId: string;
  businessId: string;
  courtId: string;
  gameDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: "confirmed" | "blocked";
  reason?: string;
}

export interface GeneratedSlot {
  slotId: string; // e.g. "18:00-19:00"
  startTime: string; // "18:00"
  endTime: string; // "19:00"
  label: string; // "06:00 PM – 07:00 PM"
  isAvailable: boolean;
  isBooked: boolean;
  bookingId?: string;
  readableId?: string;
  bookedBy?: string;
  customerPhone?: string;
  courtId?: string;
  courtName?: string;
  isBlocked?: boolean;
  blockReason?: string;
  isPast: boolean;
  price: number;
  period: "morning" | "afternoon" | "evening" | "night";
}

export interface CreateBookingInput {
  businessId: string;
  ownerId: string;
  courtId: string;
  courtName: string;
  sportId: string;
  sportName: string;
  gameDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  playerCount: number;
  price: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  playerId: string;
  source?: BookingSource;
  paymentMethod?: "online" | "cash" | "upi" | "card" | "offline" | "pay_at_venue";
  paymentStatus?: PaymentStatus;
}

export interface BusinessCoordinates {
  latitude: number;
  longitude: number;
}

export interface GoogleMapsData {
  placeId?: string;
  mapsUrl?: string;
  directionsUrl?: string;
}

export interface BusinessLocation {
  pinCode: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  coordinates?: BusinessCoordinates;
  googleMaps?: GoogleMapsData;
  hasCoordinates?: boolean;
  isVerified?: boolean;
}

export interface DaySchedule {
  isOpen: boolean;
  openTime: string;  // HH:mm
  closeTime: string; // HH:mm
}

export interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface BusinessHours {
  startTime: string; // HH:mm format, e.g. "08:00"
  endTime: string;   // HH:mm format, e.g. "22:00"
  timezone?: string;
  weeklySchedule?: WeeklySchedule;
}

export interface BusinessImageItem {
  url: string;
  fileId: string;
  thumbnailUrl?: string;
  name?: string;
  order?: number;
  createdAt?: any;
}

export interface BusinessMedia {
  logo?: BusinessImageItem;
  coverImage?: BusinessImageItem;
  gallery?: BusinessImageItem[];
  logoUrl?: string;
  coverImageUrl?: string;
}

export type PlatformBusinessStatus = "ACTIVE" | "INACTIVE" | "PENDING_VERIFICATION";
export type OperationalStatus = "OPEN" | "CLOSED" | "TEMPORARILY_UNAVAILABLE";

export interface BusinessProfile {
  businessId: string;
  ownerId: string;
  businessName: string;
  owner: {
    name: string;
    phone: string;
    email: string;
  };
  description?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  media?: BusinessMedia;
  categories: string[];
  courts?: VenueCourt[];
  slotDurationMinutes?: 30 | 60; // default 30 (1/2 h) or 60 (1 h)
  location: BusinessLocation;
  contact?: {
    phone?: string;
    whatsapp?: string;
    email?: string;
  };
  social?: {
    instagram?: string;
    website?: string;
  };
  businessHours?: BusinessHours;
  businessStatus?: "open" | "closed";
  closedReason?: string;
  closedMessage?: string;
  status?: {
    operationalStatus: OperationalStatus;
    businessStatus?: PlatformBusinessStatus;
    platformStatus?: "ACTIVE" | "PENDING_REVIEW" | "SUSPENDED" | PlatformBusinessStatus;
    verificationStatus: "UNVERIFIED" | "VERIFIED";
  };
  profileCompletion?: {
    percentage: number;
    missingFields: string[];
  };
  isDiscoverable?: boolean;
  onboardingCompleted: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface CRMCustomer {
  customerId: string;
  businessId: string;
  ownerId: string;
  name: string;
  phone: string; // normalized, e.g. +919876543210
  email?: string;
  totalBookings: number;
  totalSpent: number;
  firstBookingAt?: any;
  lastBookingAt?: any;
  status: "active" | "inactive";
  notes?: string;
  favoriteSport?: string;
  createdAt?: any;
  updatedAt?: any;
}

export type UserRole = "owner" | "admin" | "player";

export interface PlayerProfile {
  playerId: string;
  name: string;
  email: string;
  phone?: string;
  profileImage?: string;
  favoriteSports: string[];
  createdAt?: any;
  updatedAt?: any;
}

export interface FavoriteVenueItem {
  businessId: string;
  businessName: string;
  city?: string;
  coverImageUrl?: string;
  logoUrl?: string;
  categories: string[];
  favoritedAt: any;
}

// Phase 5: Analytics & Insights Types
export type AnalyticsTimePeriod = "today" | "7days" | "30days" | "thisMonth";

export interface OwnerAnalyticsSummary {
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  completedBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  occupancyRate: number;
  totalAvailableSlots: number;
  bookedSlots: number;
  cancellationRate: number;
}

export interface TrendDataPoint {
  label: string;
  date: string;
  revenue: number;
  bookings: number;
}

export interface TimeSlotDemand {
  slotLabel: string;
  startTime: string;
  endTime: string;
  bookingCount: number;
  percentage: number;
}

export interface SportPopularity {
  sportId: string;
  sportName: string;
  bookingCount: number;
  revenue: number;
  percentage: number;
}

export interface CourtPerformance {
  courtId: string;
  courtName: string;
  sportName: string;
  bookingCount: number;
  revenue: number;
  occupancyRate?: number;
}

export interface BusinessInsight {
  id: string;
  type: "opportunity" | "performance" | "demand" | "alert";
  title: string;
  description: string;
  metric?: string;
  priority?: number;
}

export interface PlayerActivitySummary {
  totalBookings: number;
  totalSpent: number;
  thisMonthBookings: number;
  thisMonthSpent: number;
  cancelledBookings: number;
  favoriteSport: string | null;
  favoriteVenue: {
    businessId: string;
    businessName: string;
    bookingCount: number;
  } | null;
  uniqueVenuesVisited: number;
  sportBreakdown: {
    sportName: string;
    sportId: string;
    count: number;
    spent: number;
  }[];
  monthlyTrends: {
    monthLabel: string;
    monthKey: string;
    bookings: number;
    spent: number;
  }[];
}

