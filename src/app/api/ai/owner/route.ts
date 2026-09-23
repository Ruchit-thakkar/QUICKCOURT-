import { NextRequest, NextResponse } from "next/server";
import { verifyAuthHeader } from "@/lib/ai/authHelper";
import { OWNER_AI_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { callGemini } from "@/lib/ai/geminiClient";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import {
  getDateRangeForPeriod,
  calculateRevenue,
  calculateBookingsBreakdown,
  calculateAverageBookingValue,
  calculateOccupancyRate,
  calculatePeakAndLowDemandHours,
  calculatePopularSports,
  calculatePopularCourts,
} from "@/services/analyticsService";
import type { OwnerBooking, BusinessProfile, AnalyticsTimePeriod } from "@/types";

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
    const period: AnalyticsTimePeriod = body.period || "7days";
    const clientBusinessProfile = body.businessProfile as BusinessProfile | undefined;
    const clientBookings = body.bookings as OwnerBooking[] | undefined;

    if (!userQuery) {
      return NextResponse.json(
        { error: "Query is required." },
        { status: 400 }
      );
    }

    // 1. Fetch authorized owner business from Firestore or use client profile fallback
    let business: BusinessProfile | null = clientBusinessProfile || null;
    let businessId: string = clientBusinessProfile?.businessId || "";

    try {
      const bizQuery = query(
        collection(db, "businesses"),
        where("ownerId", "==", verifiedUser.uid)
      );
      const bizSnap = await getDocs(bizQuery);
      if (!bizSnap.empty) {
        const bizDoc = bizSnap.docs[0];
        business = bizDoc.data() as BusinessProfile;
        businessId = bizDoc.id;
      }
    } catch (bizErr) {
      console.warn("Server Firestore business query failed, checking client fallback:", bizErr);
    }

    if (!business) {
      return NextResponse.json({
        success: true,
        reply: `### Summary
No registered venue was found for your account.

### Data
- Active Venues: 0

### Insight
To receive AI analytics and recommendations, you must first register your sports venue in QuickCourt.

### Recommendation
Head to Business Profile to complete your venue onboarding.`,
        source: "data_engine",
      });
    }

    // 2. Fetch owner's bookings for date range
    const { startDate, endDate } = getDateRangeForPeriod(period);
    const allBookings: OwnerBooking[] = [];

    if (clientBookings && Array.isArray(clientBookings) && clientBookings.length > 0) {
      clientBookings.forEach((b) => {
        if (
          (!businessId || b.businessId === businessId) &&
          b.gameDate >= startDate &&
          b.gameDate <= endDate
        ) {
          allBookings.push(b);
        }
      });
    } else {
      try {
        const bookingsQuery = query(
          collection(db, "bookings"),
          where("ownerId", "==", verifiedUser.uid)
        );
        const bookingsSnap = await getDocs(bookingsQuery);
        bookingsSnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (
            (!businessId || data.businessId === businessId) &&
            data.gameDate >= startDate &&
            data.gameDate <= endDate
          ) {
            allBookings.push({
              bookingId: docSnap.id,
              businessId: data.businessId,
              ownerId: data.ownerId,
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
          }
        });
      } catch (bookingsErr) {
        console.warn("Server Firestore bookings query failed:", bookingsErr);
      }
    }

    // 3. Compute Metrics
    const totalRevenue = calculateRevenue(allBookings);
    const breakdown = calculateBookingsBreakdown(allBookings);
    const validCount = breakdown.total - breakdown.cancelled;
    const abv = calculateAverageBookingValue(totalRevenue, validCount);
    const occ = calculateOccupancyRate(business, allBookings, startDate, endDate);
    const { peakHours, lowDemandHours } = calculatePeakAndLowDemandHours(allBookings, business);
    const popularSports = calculatePopularSports(allBookings);
    const popularCourts = calculatePopularCourts(allBookings, business);

    // 4. Build concise AI Data Context string
    const contextStr = `
VENUE INFORMATION:
- Venue Name: ${business.businessName || "Sports Venue"}
- Location: ${business.location?.city || "India"}
- Configured Courts: ${(business.courts || []).map((c) => `${c.name} (${c.sportName}, ₹${c.pricePerHour}/hr)`).join(", ") || "Main Court"}
- Operating Hours: ${business.businessHours?.startTime || "08:00"} to ${business.businessHours?.endTime || "22:00"}

BOOKING ANALYTICS (${period.toUpperCase()} PERIOD: ${startDate} to ${endDate}):
- Total Bookings: ${breakdown.total}
- Confirmed Bookings: ${breakdown.confirmed}
- Cancelled Bookings: ${breakdown.cancelled} (Cancellation Rate: ${breakdown.cancellationRate}%)
- Total Revenue: ₹${totalRevenue.toLocaleString("en-IN")}
- Average Booking Value: ₹${abv}
- Slot Occupancy Rate: ${occ.occupancyRate}% (${occ.bookedSlots} booked / ${occ.totalAvailableSlots} total available slots)
- Peak Hours: ${peakHours.map((p) => `${p.slotLabel} (${p.bookingCount} bookings, ${p.percentage}%)`).join(", ") || "None"}
- Low Demand Slots: ${lowDemandHours.hasEnoughData ? lowDemandHours.slots.map((l) => `${l.slotLabel} (${l.bookingCount} bookings)`).join(", ") : "Insufficient data (minimum 3 bookings required)"}
- Popular Sports: ${popularSports.map((s) => `${s.sportName} (${s.bookingCount} bookings, ₹${s.revenue})`).join(", ") || "None"}
- Popular Courts: ${popularCourts.map((c) => `${c.courtName} (${c.bookingCount} bookings, ₹${c.revenue})`).join(", ") || "None"}
`.trim();

    const contextObj = {
      businessName: business.businessName,
      totalBookings: breakdown.total,
      totalRevenue,
      averageBookingValue: abv,
      occupancyRate: occ.occupancyRate,
      cancellationRate: breakdown.cancellationRate,
      peakHours,
      lowDemandHours: lowDemandHours.slots,
      popularSports,
      popularCourts,
    };

    // 5. Query Gemini or Fallback Engine
    const { reply, source } = await callGemini(
      OWNER_AI_SYSTEM_PROMPT,
      userQuery,
      contextStr,
      contextObj,
      true
    );

    return NextResponse.json({
      success: true,
      reply,
      source,
    });
  } catch (err) {
    console.error("Owner AI Route error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "AI is temporarily unavailable. Your QuickCourt data is still available.",
      },
      { status: 500 }
    );
  }
}
