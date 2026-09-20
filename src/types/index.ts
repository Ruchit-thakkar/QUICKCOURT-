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
