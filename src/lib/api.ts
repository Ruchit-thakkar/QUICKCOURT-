/**
 * API integration points for future backend.
 * All functions currently return mock data — swap implementations when API is ready.
 */

import {
  bookings,
  demandOpportunities,
  facilities,
  games,
  ownerCharts,
  ownerKpis,
  players,
  quickFillOffers,
  subscription,
} from "@/data/mock";
import type {
  Booking,
  DemandOpportunity,
  Facility,
  Game,
  OwnerKpis,
  Player,
  QuickFillOffer,
  Sport,
  Subscription,
} from "@/types";

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

export async function fetchNearbyGames(sport?: Sport): Promise<Game[]> {
  await delay();
  if (!sport) return games;
  return games.filter((g) => g.sport === sport);
}

export async function fetchFacilities(): Promise<Facility[]> {
  await delay();
  return facilities;
}

export async function fetchFacility(id: string): Promise<Facility | null> {
  await delay(200);
  return facilities.find((f) => f.id === id) ?? null;
}

export async function fetchQuickFillOffers(): Promise<QuickFillOffer[]> {
  await delay();
  return quickFillOffers;
}

export async function fetchPlayerProfile(id = "p1"): Promise<Player | null> {
  await delay(200);
  return players.find((p) => p.id === id) ?? players[0];
}

export async function fetchBookings(): Promise<Booking[]> {
  await delay();
  return bookings;
}

export async function fetchOwnerKpis(): Promise<OwnerKpis> {
  await delay();
  return ownerKpis;
}

export async function fetchOwnerCharts() {
  await delay();
  return ownerCharts;
}

export async function fetchDemandOpportunities(): Promise<DemandOpportunity[]> {
  await delay();
  return demandOpportunities;
}

export async function fetchSubscription(): Promise<Subscription> {
  await delay();
  return subscription;
}



export async function submitDemandPool(payload: unknown) {
  await delay(600);
  // Future: POST /api/demand
  console.info("[api] demand pool submitted", payload);
  return { matchedPlayers: 14, success: true as const };
}

export async function joinGame(gameId: string) {
  await delay(500);
  // Future: POST /api/games/:id/join
  return { gameId, playersJoined: 9, success: true as const };
}

export async function createQuickFillOffer(payload: unknown) {
  await delay(500);
  // Future: POST /api/owner/offers
  console.info("[api] quickfill offer", payload);
  return { success: true as const };
}

export async function confirmBooking(payload: unknown) {
  await delay(700);
  // Future: POST /api/bookings
  console.info("[api] booking", payload);
  return {
    success: true as const,
    bookingId: "bk-demo-1",
    confirmation: "GAME LOCKED.",
  };
}
