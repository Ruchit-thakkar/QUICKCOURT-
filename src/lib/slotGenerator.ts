import type {
  BusinessProfile,
  VenueCourt,
  OwnerBooking,
  GeneratedSlot,
  DaySchedule,
  BlockedSlot,
  SlotLockData,
} from "@/types";

const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

/**
 * Converts "HH:mm" to total minutes from midnight
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Converts total minutes from midnight back to "HH:mm" (24-hour, zero-padded)
 */
export function minutesToTime(mins: number): string {
  const normalized = Math.max(0, mins) % (24 * 60);
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Normalizes time string to standard "HH:mm" (24-hour zero-padded)
 */
export function normalizeTimeStr(t: string): string {
  if (!t) return "00:00";
  const [h, m] = t.split(":");
  const hh = String(parseInt(h, 10) || 0).padStart(2, "0");
  const mm = String(parseInt(m, 10) || 0).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Formats "HH:mm" into a 12-hour AM/PM string (e.g. "07:00 PM")
 */
export function format12Hour(timeStr: string): string {
  if (!timeStr) return "";
  const [hStr, mStr] = timeStr.split(":");
  let h = parseInt(hStr, 10) || 0;
  const m = mStr || "00";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  h = h ? h : 12; // 0 becomes 12
  return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
}

/**
 * Determines period of day for grouping slots
 */
export function getSlotPeriod(
  startTime: string
): "morning" | "afternoon" | "evening" | "night" {
  const mins = timeToMinutes(startTime);
  if (mins >= 5 * 60 && mins < 12 * 60) return "morning";
  if (mins >= 12 * 60 && mins < 17 * 60) return "afternoon";
  if (mins >= 17 * 60 && mins < 21 * 60) return "evening";
  return "night";
}

/**
 * Calculates current date and time in minutes reliably according to business timezone
 */
export function getNowInTimezone(timezone?: string): {
  year: number;
  month: number;
  day: number;
  dateStr: string; // "YYYY-MM-DD"
  currentMins: number; // minutes from midnight
} {
  const tz = timezone || "Asia/Kolkata";
  const now = new Date();

  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const map: Record<string, string> = {};
    for (const p of parts) map[p.type] = p.value;

    const year = parseInt(map.year, 10);
    const month = parseInt(map.month, 10);
    const day = parseInt(map.day, 10);
    let hour = parseInt(map.hour, 10);
    if (hour === 24) hour = 0;
    const minute = parseInt(map.minute, 10);

    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const currentMins = hour * 60 + minute;

    return { year, month, day, dateStr, currentMins };
  } catch (err) {
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const currentMins = hour * 60 + minute;
    return { year, month, day, dateStr, currentMins };
  }
}

export interface CourtSlotGenerationResult {
  isClosed: boolean;
  closureReason?: string;
  slots: GeneratedSlot[];
}

/**
 * Generates slots for a court dynamically based on operating hours,
 * slot duration, existing active bookings, slot locks, blocked slots,
 * and current business timezone time.
 *
 * Rules:
 * - Past dates: do not allow booking (empty slots).
 * - Today: slots that have already started/ended disappear completely.
 * - Future dates: all valid slots within operating hours are generated.
 * - One authoritative status: AVAILABLE, BOOKED, BLOCKED.
 */
export function generateSlotsForCourt(
  business: BusinessProfile,
  court: VenueCourt,
  dateStr: string, // YYYY-MM-DD
  existingBookings: OwnerBooking[] = [],
  referenceDate?: Date,
  blockedSlots: BlockedSlot[] = [],
  slotLocks: SlotLockData[] = []
): CourtSlotGenerationResult {
  // 1. If court is inactive or under maintenance
  const isCourtActive =
    court.status === "active" || (court.status === undefined && court.active !== false);
  if (!isCourtActive) {
    return {
      isClosed: true,
      closureReason:
        court.status === "maintenance"
          ? "Court is currently under maintenance"
          : "Court is temporarily inactive",
      slots: [],
    };
  }

  // 2. Check business overall operational status override
  if (
    business.status?.operationalStatus === "CLOSED" ||
    business.businessStatus === "closed"
  ) {
    return {
      isClosed: true,
      closureReason: business.closedReason || "Venue is closed today",
      slots: [],
    };
  }
  if (business.status?.operationalStatus === "TEMPORARILY_UNAVAILABLE") {
    return {
      isClosed: true,
      closureReason: business.closedReason || "Venue is temporarily unavailable",
      slots: [],
    };
  }

  // 3. Timezone-aware date & time resolution
  const now = getNowInTimezone(business.businessHours?.timezone);

  // 4. Past Date Check
  if (dateStr < now.dateStr) {
    return {
      isClosed: true,
      closureReason: "Cannot book slots for past dates",
      slots: [],
    };
  }

  // 5. Resolve Day Schedule from 7-day schedule or general hours
  const selectedDate = new Date(`${dateStr}T12:00:00`);
  const dayIndex = selectedDate.getDay();
  const dayKey = DAY_KEYS[dayIndex];
  const weekly = business.businessHours?.weeklySchedule;

  let daySchedule: DaySchedule | undefined;
  if (weekly && weekly[dayKey]) {
    daySchedule = weekly[dayKey];
  }

  // If specific day is marked closed (e.g. Sunday CLOSED)
  if (daySchedule && !daySchedule.isOpen) {
    return {
      isClosed: true,
      closureReason: "Closed on schedule for this day",
      slots: [],
    };
  }

  const openTime = daySchedule?.openTime || business.businessHours?.startTime || "06:00";
  const closeTime = daySchedule?.closeTime || business.businessHours?.endTime || "23:00";

  let startMins = timeToMinutes(openTime);
  const endMins = timeToMinutes(closeTime);

  // If closing time is earlier than opening time (e.g. overnight 18:00 to 02:00)
  const actualEndMins = endMins <= startMins ? endMins + 24 * 60 : endMins;

  // Duration in minutes (court-level override or business-level or 60)
  const durationMinutes =
    court.slotDurationMinutes === 30
      ? 30
      : court.slotDurationMinutes === 60
      ? 60
      : business.slotDurationMinutes === 30
      ? 30
      : 60;

  // Court pricing: base hourly price pro-rated for duration
  const baseHourlyPrice = Number(court.pricePerHour) || 0;
  const slotPrice =
    durationMinutes === 30
      ? Math.round(baseHourlyPrice / 2)
      : baseHourlyPrice;

  const isToday = dateStr === now.dateStr;

  // Filter existing active bookings for this specific court and date
  const activeCourtBookings = existingBookings.filter((b) => {
    if (b.court?.courtId && b.court.courtId !== court.courtId) return false;
    if (b.gameDate !== dateStr) return false;
    return b.bookingStatus !== "cancelled";
  });

  // Filter blocked slots for this court and date
  const activeCourtBlocks = blockedSlots.filter((blk) => {
    if (blk.courtId && blk.courtId !== court.courtId) return false;
    return blk.gameDate === dateStr;
  });

  // Filter live slot locks for this court and date
  const activeCourtLocks = slotLocks.filter((l) => {
    if (l.courtId && l.courtId !== court.courtId) return false;
    return l.gameDate === dateStr;
  });

  const slots: GeneratedSlot[] = [];

  while (startMins + durationMinutes <= actualEndMins) {
    const slotStartStr = minutesToTime(startMins % (24 * 60));
    const slotEndStr = minutesToTime((startMins + durationMinutes) % (24 * 60));

    // Check if slot has already passed/ended today
    // If today and current time is past slot start (or ended), the slot must DISAPPEAR
    if (isToday && startMins <= now.currentMins) {
      startMins += durationMinutes;
      continue;
    }

    const currentSlotStart = startMins;
    const currentSlotEnd = startMins + durationMinutes;

    // Check if slot overlaps with any active booking on this court
    const matchingBooking = activeCourtBookings.find((b) => {
      const bStart = timeToMinutes(b.startTime);
      const bEnd = timeToMinutes(b.endTime);
      return currentSlotStart < bEnd && currentSlotEnd > bStart;
    });

    // Check if slot overlaps with any live slot lock
    const matchingLock = activeCourtLocks.find((l) => {
      const lStart = timeToMinutes(l.startTime);
      const lEnd = timeToMinutes(l.endTime);
      return currentSlotStart < lEnd && currentSlotEnd > lStart;
    });

    // Check if slot overlaps with any blocked slot
    const matchingBlock = activeCourtBlocks.find((blk) => {
      const blkStart = timeToMinutes(blk.startTime);
      const blkEnd = timeToMinutes(blk.endTime);
      return currentSlotStart < blkEnd && currentSlotEnd > blkStart;
    });

    // Determine status from authoritative sources
    const isBooked = Boolean(matchingBooking) || matchingLock?.status === "confirmed";
    const isBlocked =
      Boolean(matchingBlock) || matchingLock?.status === "blocked";
    const blockReason =
      matchingBlock?.reason || matchingLock?.reason || "Maintenance";

    const isAvailable = !isBooked && !isBlocked;

    slots.push({
      slotId: `${slotStartStr}-${slotEndStr}`,
      startTime: slotStartStr,
      endTime: slotEndStr,
      label: `${format12Hour(slotStartStr)} – ${format12Hour(slotEndStr)}`,
      isAvailable,
      isBooked,
      bookingId: matchingBooking?.bookingId,
      readableId: matchingBooking?.readableId,
      bookedBy: matchingBooking?.customer?.name,
      customerPhone: matchingBooking?.customer?.phone,
      courtId: court.courtId,
      courtName: court.name,
      isBlocked,
      blockReason,
      isPast: false,
      price: slotPrice,
      period: getSlotPeriod(slotStartStr),
    });

    startMins += durationMinutes;
  }

  return {
    isClosed: false,
    slots,
  };
}
