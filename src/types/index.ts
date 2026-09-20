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

export interface AdminMetrics {
  totalPlayers: number;
  totalFacilities: number;
  activeGames: number;
  bookings: number;
  platformRevenue: number;
  activeSubscriptions: number;
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

export type AsyncState = "idle" | "loading" | "error" | "empty" | "success";

export interface OwnerUser {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  role: "owner" | "player" | "admin";
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

export interface VenueCourt {
  courtId: string;
  name: string;
  sportId: string;       // matches category id, e.g. "box_cricket"
  sportName: string;     // e.g. "Box Cricket"
  pricePerHour: number;  // e.g. 800
  slotDurationMinutes?: 30 | 60; // 30 mins (1/2 h) or 60 mins (1 h)
  active?: boolean;
}

export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "partially_paid" | "refunded" | "failed";

export interface OwnerBooking {
  bookingId: string;
  businessId: string;
  ownerId: string;
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
  bookingStatus: BookingStatus;
  payment: {
    status: PaymentStatus;
    method?: "online" | "cash" | "upi" | "card" | "offline";
    paidAt?: any;
  };
  cancellation?: {
    reason: string;
    cancelledAt?: any;
    cancelledBy?: string;
  };
  createdAt?: any;
  updatedAt?: any;
}

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
  categories: string[];
  courts?: VenueCourt[];
  slotDurationMinutes?: 30 | 60; // default 30 (1/2 h) or 60 (1 h)
  location: {
    pinCode: string;
    address?: string;
    city?: string;
    state?: string;
    country: string;
  };
  contact?: {
    phone?: string;
    whatsapp?: string;
    email?: string;
  };
  social?: {
    instagram?: string;
    website?: string;
  };
  businessHours?: {
    startTime: string; // HH:mm format, e.g. "08:00"
    endTime: string;   // HH:mm format, e.g. "22:00"
  };
  businessStatus?: "open" | "closed";
  closedReason?: string;
  closedMessage?: string;
  onboardingCompleted: boolean;
  createdAt?: any;
  updatedAt?: any;
}

