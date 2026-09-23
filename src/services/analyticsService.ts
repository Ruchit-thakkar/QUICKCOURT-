import { db, auth as firebaseAuth } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import type {
  OwnerBooking,
  BusinessProfile,
  AnalyticsTimePeriod,
  OwnerAnalyticsSummary,
  TrendDataPoint,
  TimeSlotDemand,
  SportPopularity,
  CourtPerformance,
  BusinessInsight,
  PlayerActivitySummary,
} from "@/types";

/**
 * Format Date object to local YYYY-MM-DD string
 */
export function formatLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Compute start and end dates (and comparison previous period) for a selected period
 */
export function getDateRangeForPeriod(period: AnalyticsTimePeriod): {
  startDate: string;
  endDate: string;
  prevStartDate: string;
  prevEndDate: string;
  periodDays: number;
} {
  const now = new Date();
  const todayStr = formatLocalDateStr(now);

  if (period === "today") {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatLocalDateStr(yesterday);
    return {
      startDate: todayStr,
      endDate: todayStr,
      prevStartDate: yesterdayStr,
      prevEndDate: yesterdayStr,
      periodDays: 1,
    };
  }

  if (period === "7days") {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - 6);

    return {
      startDate: formatLocalDateStr(start),
      endDate: todayStr,
      prevStartDate: formatLocalDateStr(prevStart),
      prevEndDate: formatLocalDateStr(prevEnd),
      periodDays: 7,
    };
  }

  if (period === "30days") {
    const start = new Date(now);
    start.setDate(start.getDate() - 29);
    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - 29);

    return {
      startDate: formatLocalDateStr(start),
      endDate: todayStr,
      prevStartDate: formatLocalDateStr(prevStart),
      prevEndDate: formatLocalDateStr(prevEnd),
      periodDays: 30,
    };
  }

  // "thisMonth"
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const daysInCurrentMonth = now.getDate();

  return {
    startDate: formatLocalDateStr(startOfMonth),
    endDate: todayStr,
    prevStartDate: formatLocalDateStr(prevMonthStart),
    prevEndDate: formatLocalDateStr(prevMonthEnd),
    periodDays: Math.max(1, daysInCurrentMonth),
  };
}

/**
 * Fetch bookings for an owner's business within a specific date range from Firestore
 */
export async function getOwnerBookingsForDateRange(
  businessId: string,
  startDate: string,
  endDate: string,
  ownerId?: string
): Promise<OwnerBooking[]> {
  if (!businessId) return [];

  const currentUid = ownerId || firebaseAuth.currentUser?.uid;

  try {
    const q = currentUid
      ? query(
          collection(db, "bookings"),
          where("ownerId", "==", currentUid)
        )
      : query(
          collection(db, "bookings"),
          where("businessId", "==", businessId)
        );

    const snapshot = await getDocs(q);
    const bookings: OwnerBooking[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (
        data.businessId === businessId &&
        data.gameDate >= startDate &&
        data.gameDate <= endDate
      ) {
        bookings.push({
          bookingId: docSnap.id,
          readableId: data.readableId,
          businessId: data.businessId,
          ownerId: data.ownerId,
          playerId: data.playerId || data.customer?.userId,
          customer: data.customer || { name: "", phone: "" },
          sport: data.sport || { id: "", name: "" },
          court: data.court || { courtId: "", name: "" },
          gameDate: data.gameDate,
          startTime: data.startTime,
          endTime: data.endTime,
          durationMinutes: data.durationMinutes || 60,
          playerCount: data.playerCount || 1,
          pricing: data.pricing || { total: data.price || 0, subtotal: data.price || 0, currency: "INR" },
          price: data.price || data.pricing?.total || 0,
          bookingStatus: data.bookingStatus || "confirmed",
          payment: data.payment || { status: "pending" },
          cancellation: data.cancellation,
          createdAt: data.createdAt,
        });
      }
    });

    return bookings;
  } catch (err) {
    console.error("Error fetching bookings for date range:", err);
    return [];
  }
}

/**
 * Calculate total revenue from valid, non-cancelled bookings
 */
export function calculateRevenue(bookings: OwnerBooking[]): number {
  return bookings
    .filter((b) => b.bookingStatus !== "cancelled")
    .reduce((sum, b) => sum + (b.pricing?.total || b.price || 0), 0);
}

/**
 * Calculate bookings counts breakdown (total, confirmed, cancelled, completed)
 */
export function calculateBookingsBreakdown(
  bookings: OwnerBooking[],
  refDateStr?: string,
  refTimeStr?: string
): {
  total: number;
  confirmed: number;
  cancelled: number;
  completed: number;
  cancellationRate: number;
} {
  const total = bookings.length;
  const now = new Date();
  const currentDate = refDateStr || formatLocalDateStr(now);
  const currentTime =
    refTimeStr || `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  let confirmed = 0;
  let cancelled = 0;
  let completed = 0;

  bookings.forEach((b) => {
    if (b.bookingStatus === "cancelled") {
      cancelled++;
    } else {
      if (b.bookingStatus === "confirmed") {
        confirmed++;
      }
      // Completed: Date is in past, or today and slot has already ended
      if (
        b.gameDate < currentDate ||
        (b.gameDate === currentDate && b.endTime <= currentTime)
      ) {
        completed++;
      }
    }
  });

  const cancellationRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;

  return { total, confirmed, cancelled, completed, cancellationRate };
}

/**
 * Calculate Average Booking Value (ABV)
 */
export function calculateAverageBookingValue(
  revenue: number,
  validBookingsCount: number
): number {
  return validBookingsCount > 0 ? Math.round(revenue / validBookingsCount) : 0;
}

/**
 * Helper to get day name key from Date
 */
function getDayNameKey(date: Date): "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday" {
  const dayIndex = date.getDay(); // 0 = Sun, 1 = Mon, etc.
  const days: ("sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday")[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return days[dayIndex] as any;
}

/**
 * Calculate Occupancy Rate based on operating hours, courts, and real booking density
 * Occupancy Rate = (Booked Available Slots / Total Available Slots) * 100
 */
export function calculateOccupancyRate(
  businessProfile: BusinessProfile | null,
  bookings: OwnerBooking[],
  startDate: string,
  endDate: string
): {
  occupancyRate: number;
  totalAvailableSlots: number;
  bookedSlots: number;
} {
  const activeCourtsList = (businessProfile?.courts || []).filter(
    (c) => c.status !== "inactive" && c.active !== false
  );
  const activeCourtsCount = activeCourtsList.length || 1;
  const slotDurationMinutes = businessProfile?.slotDurationMinutes || 60;

  let totalAvailableSlots = 0;

  // Iterate each date in the range
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const current = new Date(start);

  while (current <= end) {
    const dayKey = getDayNameKey(current);
    const daySchedule = businessProfile?.businessHours?.weeklySchedule?.[dayKey];

    let isOpen = true;
    let openH = 8;
    let openM = 0;
    let closeH = 22;
    let closeM = 0;

    if (daySchedule) {
      isOpen = daySchedule.isOpen !== false;
      if (daySchedule.openTime) {
        const [h, m] = daySchedule.openTime.split(":").map(Number);
        openH = h || 8;
        openM = m || 0;
      }
      if (daySchedule.closeTime) {
        const [h, m] = daySchedule.closeTime.split(":").map(Number);
        closeH = h || 22;
        closeM = m || 0;
      }
    } else if (businessProfile?.businessHours) {
      if (businessProfile.businessHours.startTime) {
        openH = parseInt(businessProfile.businessHours.startTime.split(":")[0], 10) || 8;
      }
      if (businessProfile.businessHours.endTime) {
        closeH = parseInt(businessProfile.businessHours.endTime.split(":")[0], 10) || 22;
      }
    }

    if (isOpen) {
      let operatingMinutes = (closeH * 60 + closeM) - (openH * 60 + openM);
      if (operatingMinutes <= 0) operatingMinutes = 14 * 60; // fallback 14 hours
      const slotsPerCourt = Math.max(1, Math.floor(operatingMinutes / slotDurationMinutes));
      totalAvailableSlots += activeCourtsCount * slotsPerCourt;
    }

    current.setDate(current.getDate() + 1);
  }

  // Count valid bookings within the date range
  const validBookings = bookings.filter(
    (b) =>
      b.bookingStatus !== "cancelled" &&
      b.gameDate >= startDate &&
      b.gameDate <= endDate
  );
  const bookedSlots = validBookings.length;

  const occupancyRate =
    totalAvailableSlots > 0
      ? Math.min(100, Math.round((bookedSlots / totalAvailableSlots) * 100))
      : 0;

  return { occupancyRate, totalAvailableSlots, bookedSlots };
}

/**
 * Generate trend data points for revenue and bookings across the selected period
 */
export function calculateTrendData(
  bookings: OwnerBooking[],
  startDate: string,
  endDate: string,
  period: AnalyticsTimePeriod
): TrendDataPoint[] {
  const validBookings = bookings.filter((b) => b.bookingStatus !== "cancelled");

  if (period === "today") {
    // Hourly trend for Today (06:00 to 22:00 in 2-hour increments)
    const hours = ["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"];
    return hours.map((hourStr, idx) => {
      const nextHourStr = hours[idx + 1] || "24:00";
      const matching = validBookings.filter(
        (b) => b.startTime >= hourStr && b.startTime < nextHourStr
      );
      const rev = matching.reduce((sum, b) => sum + (b.pricing?.total || b.price || 0), 0);
      return {
        label: hourStr,
        date: startDate,
        revenue: rev,
        bookings: matching.length,
      };
    });
  }

  // Daily trend for 7days, 30days, thisMonth
  const points: TrendDataPoint[] = [];
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const current = new Date(start);

  while (current <= end) {
    const dateStr = formatLocalDateStr(current);
    const dayBookings = validBookings.filter((b) => b.gameDate === dateStr);
    const rev = dayBookings.reduce((sum, b) => sum + (b.pricing?.total || b.price || 0), 0);

    let label = dateStr;
    if (period === "7days") {
      label = current.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" });
    } else {
      label = current.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    }

    points.push({
      label,
      date: dateStr,
      revenue: rev,
      bookings: dayBookings.length,
    });

    current.setDate(current.getDate() + 1);
  }

  return points;
}

/**
 * Format 24h slot to human-friendly format (e.g. 19:00 - 20:00 -> 7:00 PM – 8:00 PM)
 */
export function formatSlotLabel(startTime: string, endTime: string): string {
  const formatTime = (t: string) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, "0")} ${period}`;
  };
  return `${formatTime(startTime)} – ${formatTime(endTime)}`;
}

/**
 * Calculate peak hours and low-demand hours with data thresholds
 */
export function calculatePeakAndLowDemandHours(
  bookings: OwnerBooking[],
  businessProfile: BusinessProfile | null
): {
  peakHours: TimeSlotDemand[];
  lowDemandHours: {
    slots: TimeSlotDemand[];
    hasEnoughData: boolean;
    message?: string;
  };
} {
  const validBookings = bookings.filter((b) => b.bookingStatus !== "cancelled");
  const totalCount = validBookings.length;

  // Aggregate counts per slot
  const slotMap: Record<string, { startTime: string; endTime: string; count: number }> = {};

  validBookings.forEach((b) => {
    const key = `${b.startTime}-${b.endTime}`;
    if (!slotMap[key]) {
      slotMap[key] = {
        startTime: b.startTime,
        endTime: b.endTime,
        count: 0,
      };
    }
    slotMap[key].count++;
  });

  const allSlots: TimeSlotDemand[] = Object.values(slotMap).map((slot) => ({
    slotLabel: formatSlotLabel(slot.startTime, slot.endTime),
    startTime: slot.startTime,
    endTime: slot.endTime,
    bookingCount: slot.count,
    percentage: totalCount > 0 ? Math.round((slot.count / totalCount) * 100) : 0,
  }));

  // Sort descending for peak hours
  allSlots.sort((a, b) => b.bookingCount - a.bookingCount);
  const peakHours = allSlots.slice(0, 3);

  // Low-demand calculation: requires at least 3 bookings to prevent misleading single-booking bias
  if (totalCount < 3) {
    return {
      peakHours,
      lowDemandHours: {
        slots: [],
        hasEnoughData: false,
        message: "Insufficient booking history (minimum 3 bookings required) to accurately identify low-demand hours.",
      },
    };
  }

  // Collect potential operating hour slots that have low bookings
  // If we have multiple booked slots, examine slots with lowest activity
  const reversed = [...allSlots].sort((a, b) => a.bookingCount - b.bookingCount);
  const lowSlots = reversed.slice(0, 3);

  return {
    peakHours,
    lowDemandHours: {
      slots: lowSlots,
      hasEnoughData: true,
    },
  };
}

/**
 * Calculate popular sports distribution
 */
export function calculatePopularSports(bookings: OwnerBooking[]): SportPopularity[] {
  const validBookings = bookings.filter((b) => b.bookingStatus !== "cancelled");
  const totalCount = validBookings.length;

  const map: Record<string, { name: string; count: number; revenue: number }> = {};

  validBookings.forEach((b) => {
    const id = b.sport?.id || "other";
    const name = b.sport?.name || id;
    if (!map[id]) {
      map[id] = { name, count: 0, revenue: 0 };
    }
    map[id].count++;
    map[id].revenue += b.pricing?.total || b.price || 0;
  });

  const list: SportPopularity[] = Object.entries(map).map(([sportId, data]) => ({
    sportId,
    sportName: data.name,
    bookingCount: data.count,
    revenue: data.revenue,
    percentage: totalCount > 0 ? Math.round((data.count / totalCount) * 100) : 0,
  }));

  list.sort((a, b) => b.bookingCount - a.bookingCount);
  return list;
}

/**
 * Calculate popular courts performance
 */
export function calculatePopularCourts(
  bookings: OwnerBooking[],
  businessProfile: BusinessProfile | null
): CourtPerformance[] {
  const validBookings = bookings.filter((b) => b.bookingStatus !== "cancelled");

  const map: Record<string, { courtName: string; sportName: string; count: number; revenue: number }> = {};

  // Initialize with all known courts from business profile
  if (businessProfile?.courts) {
    businessProfile.courts.forEach((c) => {
      map[c.courtId] = {
        courtName: c.name,
        sportName: c.sportName || c.sportId,
        count: 0,
        revenue: 0,
      };
    });
  }

  validBookings.forEach((b) => {
    const id = b.court?.courtId || "default_court";
    const name = b.court?.name || "Main Court";
    const sportName = b.sport?.name || "General";

    if (!map[id]) {
      map[id] = { courtName: name, sportName, count: 0, revenue: 0 };
    }
    map[id].count++;
    map[id].revenue += b.pricing?.total || b.price || 0;
  });

  const list: CourtPerformance[] = Object.entries(map).map(([courtId, data]) => ({
    courtId,
    courtName: data.courtName,
    sportName: data.sportName,
    bookingCount: data.count,
    revenue: data.revenue,
  }));

  list.sort((a, b) => b.bookingCount - a.bookingCount);
  return list;
}

/**
 * Generate rule-based business insights based on real data
 */
export function generateBusinessInsights(
  currentSummary: OwnerAnalyticsSummary,
  prevSummary: OwnerAnalyticsSummary | null,
  peakHours: TimeSlotDemand[],
  lowDemandHours: { slots: TimeSlotDemand[]; hasEnoughData: boolean },
  popularSports: SportPopularity[],
  popularCourts: CourtPerformance[]
): BusinessInsight[] {
  const insights: BusinessInsight[] = [];

  // Zero/low data state
  if (currentSummary.totalBookings === 0) {
    insights.push({
      id: "no_data",
      type: "opportunity",
      title: "Unlock Venue Insights",
      description:
        "As players discover your courts and book slots, QuickCourt will highlight your peak hours, revenue trends, and growth opportunities here.",
    });
    return insights;
  }

  // 1. Period over period performance growth
  if (prevSummary && prevSummary.totalBookings > 0) {
    const diff = currentSummary.totalBookings - prevSummary.totalBookings;
    const pct = Math.round((diff / prevSummary.totalBookings) * 100);

    if (pct > 0) {
      insights.push({
        id: "growth_positive",
        type: "performance",
        title: "Booking Growth Accelerating",
        description: `Bookings grew by ${pct}% compared to the prior period (${currentSummary.totalBookings} vs ${prevSummary.totalBookings} matches).`,
        metric: `+${pct}%`,
      });
    } else if (pct < -10) {
      insights.push({
        id: "growth_dip",
        type: "alert",
        title: "Booking Volume Softening",
        description: `Bookings dipped by ${Math.abs(pct)}% versus the previous period. Consider launching promotional rates or adjusting court availability.`,
        metric: `${pct}%`,
      });
    }
  }

  // 2. Peak demand hour pattern
  if (peakHours.length > 0) {
    const topSlot = peakHours[0];
    if (topSlot.percentage >= 25) {
      insights.push({
        id: "peak_hour_rush",
        type: "demand",
        title: "Peak Window Concentration",
        description: `${topSlot.slotLabel} is your prime slot, capturing ${topSlot.percentage}% of all reservations in this period.`,
        metric: `${topSlot.percentage}%`,
      });
    }
  }

  // 3. Top sport revenue driver
  if (popularSports.length > 0) {
    const topSport = popularSports[0];
    if (topSport.percentage >= 40) {
      insights.push({
        id: "top_sport",
        type: "performance",
        title: `${topSport.sportName} Dominance`,
        description: `${topSport.sportName} leads court activity, generating ${topSport.percentage}% of all bookings and ₹${topSport.revenue.toLocaleString("en-IN")} in revenue.`,
        metric: `${topSport.percentage}% share`,
      });
    }
  }

  // 4. Low demand opportunity
  if (lowDemandHours.hasEnoughData && lowDemandHours.slots.length > 0) {
    const lowestSlot = lowDemandHours.slots[0];
    insights.push({
      id: "low_demand_opportunity",
      type: "opportunity",
      title: "Off-Peak Capacity Opportunity",
      description: `Slots during ${lowestSlot.slotLabel} have low utilization (${lowestSlot.bookingCount} bookings). Creating off-peak pricing or special group discounts can fill these open hours.`,
      metric: `${lowestSlot.bookingCount} bookings`,
    });
  }

  // 5. Cancellation alert
  if (currentSummary.cancellationRate > 15) {
    insights.push({
      id: "high_cancellations",
      type: "alert",
      title: "Elevated Cancellation Rate",
      description: `${currentSummary.cancellationRate}% of total bookings were cancelled in this period (${currentSummary.cancelledBookings} cancelled). Review cancellation reasons or follow up with players.`,
      metric: `${currentSummary.cancellationRate}% cancelled`,
    });
  }

  return insights;
}

/**
 * Calculate Player Activity & Spending Analytics
 */
export function calculatePlayerActivity(
  bookings: OwnerBooking[],
  businessNamesMap: Record<string, string> = {}
): PlayerActivitySummary {
  const totalBookings = bookings.length;
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const validBookings = bookings.filter((b) => b.bookingStatus !== "cancelled");
  const cancelledBookings = bookings.filter((b) => b.bookingStatus === "cancelled").length;

  const totalSpent = validBookings.reduce((sum, b) => sum + (b.pricing?.total || b.price || 0), 0);

  const thisMonthValid = validBookings.filter((b) => b.gameDate.startsWith(currentMonthStr));
  const thisMonthBookings = thisMonthValid.length;
  const thisMonthSpent = thisMonthValid.reduce((sum, b) => sum + (b.pricing?.total || b.price || 0), 0);

  // Favorite Sport (highest count among valid bookings)
  const sportCounts: Record<string, { count: number; spent: number; id: string }> = {};
  validBookings.forEach((b) => {
    const sName = b.sport?.name || "Sport";
    const sId = b.sport?.id || "sport";
    if (!sportCounts[sName]) {
      sportCounts[sName] = { count: 0, spent: 0, id: sId };
    }
    sportCounts[sName].count++;
    sportCounts[sName].spent += b.pricing?.total || b.price || 0;
  });

  let favoriteSport: string | null = null;
  let maxSportCount = 0;
  Object.entries(sportCounts).forEach(([sName, data]) => {
    if (data.count > maxSportCount) {
      maxSportCount = data.count;
      favoriteSport = sName;
    }
  });

  // Favorite Venue (highest count among valid bookings)
  const venueCounts: Record<string, { count: number; name: string }> = {};
  validBookings.forEach((b) => {
    const bId = b.businessId;
    const bName = businessNamesMap[bId] || (b as any).businessName || "Sports Venue";
    if (!venueCounts[bId]) {
      venueCounts[bId] = { count: 0, name: bName };
    }
    venueCounts[bId].count++;
  });

  let favoriteVenue: { businessId: string; businessName: string; bookingCount: number } | null = null;
  let maxVenueCount = 0;
  Object.entries(venueCounts).forEach(([bId, data]) => {
    if (data.count > maxVenueCount) {
      maxVenueCount = data.count;
      favoriteVenue = {
        businessId: bId,
        businessName: data.name,
        bookingCount: data.count,
      };
    }
  });

  // Unique Venues Visited
  const uniqueVenuesVisited = new Set(validBookings.map((b) => b.businessId)).size;

  // Sport breakdown
  const sportBreakdown = Object.entries(sportCounts)
    .map(([sportName, data]) => ({
      sportName,
      sportId: data.id,
      count: data.count,
      spent: data.spent,
    }))
    .sort((a, b) => b.count - a.count);

  // Monthly trends (past 6 months)
  const monthlyTrends: { monthLabel: string; monthKey: string; bookings: number; spent: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const mLabel = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });

    const mBookings = validBookings.filter((b) => b.gameDate.startsWith(mKey));
    const mSpent = mBookings.reduce((sum, b) => sum + (b.pricing?.total || b.price || 0), 0);

    monthlyTrends.push({
      monthLabel: mLabel,
      monthKey: mKey,
      bookings: mBookings.length,
      spent: mSpent,
    });
  }

  return {
    totalBookings,
    totalSpent,
    thisMonthBookings,
    thisMonthSpent,
    cancelledBookings,
    favoriteSport,
    favoriteVenue,
    uniqueVenuesVisited,
    sportBreakdown,
    monthlyTrends,
  };
}
