import { NextRequest, NextResponse } from "next/server";
import { verifyAuthHeader } from "@/lib/ai/authHelper";
import { PLAYER_AI_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { callGemini } from "@/lib/ai/geminiClient";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { calculatePlayerActivity } from "@/services/analyticsService";
import type { OwnerBooking, BusinessProfile } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const verifiedUser = await verifyAuthHeader(req);
    if (!verifiedUser) {
      return NextResponse.json(
        { error: "Unauthorized. Valid authentication token required." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const userQuery = body.query?.trim();

    if (!userQuery) {
      return NextResponse.json(
        { error: "Query is required." },
        { status: 400 }
      );
    }

    // 1. Fetch authorized player's bookings
    const bookingsQuery = query(
      collection(db, "bookings"),
      where("playerId", "==", verifiedUser.uid)
    );
    const bookingsSnap = await getDocs(bookingsQuery);
    const playerBookings: OwnerBooking[] = [];

    bookingsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      playerBookings.push({
        bookingId: docSnap.id,
        businessId: data.businessId,
        ownerId: data.ownerId,
        playerId: data.playerId,
        customer: data.customer || { name: "Player", phone: "" },
        sport: data.sport || { id: "cricket", name: "Cricket" },
        court: data.court || { courtId: "default", name: "Main Court" },
        gameDate: data.gameDate,
        startTime: data.startTime,
        endTime: data.endTime,
        durationMinutes: data.durationMinutes || 60,
        playerCount: data.playerCount || 1,
        pricing: data.pricing || { total: data.price || 0, subtotal: data.price || 0, currency: "INR" },
        price: data.price || data.pricing?.total || 0,
        bookingStatus: data.bookingStatus || "confirmed",
        payment: data.payment || { status: "pending" },
        createdAt: data.createdAt,
      });
    });

    // 2. Compute Player Activity
    const activity = calculatePlayerActivity(playerBookings);

    // 3. Fetch public discoverable venues for recommendations
    const venuesQuery = query(collection(db, "businesses"), limit(6));
    const venuesSnap = await getDocs(venuesQuery);
    const discoverableVenues: any[] = [];

    venuesSnap.forEach((docSnap) => {
      const data = docSnap.data() as BusinessProfile;
      const minPrice = (data.courts || []).reduce(
        (min, c) => (c.pricePerHour < min ? c.pricePerHour : min),
        800
      );
      discoverableVenues.push({
        businessId: docSnap.id,
        businessName: data.businessName || "Sports Venue",
        city: data.location?.city || "Local City",
        categories: data.categories || ["Cricket", "Football"],
        priceFrom: minPrice,
      });
    });

    // 4. Build Player Data Context
    const contextStr = `
PLAYER ACTIVITY:
- Player Name: ${verifiedUser.displayName || "Player"}
- Total Matches Played: ${activity.totalBookings - activity.cancelledBookings}
- Total Investment: ₹${activity.totalSpent.toLocaleString("en-IN")}
- Current Month Spending: ₹${activity.thisMonthSpent.toLocaleString("en-IN")}
- Favorite Sport: ${activity.favoriteSport || "Not enough activity yet"}
- Favorite Venue: ${activity.favoriteVenue?.businessName || "None established yet"}
- Unique Facilities Visited: ${activity.uniqueVenuesVisited}
- Sports Disciplines Played: ${activity.sportBreakdown.map((s) => `${s.sportName} (${s.count} matches, ₹${s.spent})`).join(", ") || "None"}

AVAILABLE QUICKCOURT VENUES FOR RECOMMENDATION:
${discoverableVenues
  .map(
    (v) =>
      `- ${v.businessName} in ${v.city} (Sports: ${v.categories.join(", ")}, from ₹${v.priceFrom}/hr)`
  )
  .join("\n")}
`.trim();

    const contextObj = {
      totalBookings: activity.totalBookings,
      totalSpent: activity.totalSpent,
      thisMonthSpent: activity.thisMonthSpent,
      favoriteSport: activity.favoriteSport,
      favoriteVenue: activity.favoriteVenue,
      uniqueVenuesVisited: activity.uniqueVenuesVisited,
      nearbyVenues: discoverableVenues,
    };

    // 5. Query Gemini or Fallback Engine
    const { reply, source } = await callGemini(
      PLAYER_AI_SYSTEM_PROMPT,
      userQuery,
      contextStr,
      contextObj,
      false
    );

    return NextResponse.json({
      success: true,
      reply,
      source,
    });
  } catch (err) {
    console.error("Player AI Route error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "AI is temporarily unavailable. Your QuickCourt data is still available.",
      },
      { status: 500 }
    );
  }
}
