import type { BusinessProfile, DaySchedule } from "@/types";

export interface VenueOperationalInfo {
  state: "Open" | "Closed" | "Temporarily Unavailable";
  label: string;
  details?: string;
  isOpenNow: boolean;
  colorClass: {
    badge: string;
    dot: string;
    text: string;
  };
}

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
 * Calculates current operational state of a business combining owner manual override + 7-day schedule
 */
export function getVenueOperationalInfo(
  business?: BusinessProfile | null,
  referenceDate: Date = new Date()
): VenueOperationalInfo {
  if (!business) {
    return {
      state: "Closed",
      label: "Closed",
      isOpenNow: false,
      colorClass: {
        badge: "border-red-500/30 bg-red-500/10 text-red-400",
        dot: "bg-red-400",
        text: "text-red-400",
      },
    };
  }

  const manualOpStatus = business.status?.operationalStatus;

  // 1. Explicit owner manual override: Temporarily Unavailable
  if (manualOpStatus === "TEMPORARILY_UNAVAILABLE") {
    const reason = business.closedReason || business.closedMessage || "Under maintenance / weather delay";
    return {
      state: "Temporarily Unavailable",
      label: "Temporarily Unavailable",
      details: reason,
      isOpenNow: false,
      colorClass: {
        badge: "border-amber-500/30 bg-amber-500/10 text-amber-400",
        dot: "bg-amber-400",
        text: "text-amber-400",
      },
    };
  }

  // 2. Explicit owner manual override: Closed
  if (manualOpStatus === "CLOSED") {
    const reason = business.closedReason || business.closedMessage || "Closed today";
    return {
      state: "Closed",
      label: "Closed",
      details: reason,
      isOpenNow: false,
      colorClass: {
        badge: "border-red-500/30 bg-red-500/10 text-red-400",
        dot: "bg-red-400",
        text: "text-red-400",
      },
    };
  }

  // 3. Operational schedule check
  const dayIndex = referenceDate.getDay();
  const dayKey = DAY_KEYS[dayIndex];
  const weekly = business.businessHours?.weeklySchedule;

  const currentHours = String(referenceDate.getHours()).padStart(2, "0");
  const currentMinutes = String(referenceDate.getMinutes()).padStart(2, "0");
  const currentTimeStr = `${currentHours}:${currentMinutes}`;

  let daySchedule: DaySchedule | undefined;
  if (weekly && weekly[dayKey]) {
    daySchedule = weekly[dayKey];
  }

  if (daySchedule) {
    if (!daySchedule.isOpen) {
      return {
        state: "Closed",
        label: "Closed Today",
        details: "Closed on schedule",
        isOpenNow: false,
        colorClass: {
          badge: "border-red-500/30 bg-red-500/10 text-red-400",
          dot: "bg-red-400",
          text: "text-red-400",
        },
      };
    }

    const openTime = daySchedule.openTime || "06:00";
    const closeTime = daySchedule.closeTime || "23:00";

    // Handle normal same-day open to close
    if (closeTime > openTime) {
      if (currentTimeStr < openTime) {
        return {
          state: "Closed",
          label: `Opens at ${openTime}`,
          details: `Today: ${openTime} – ${closeTime}`,
          isOpenNow: false,
          colorClass: {
            badge: "border-amber-500/30 bg-amber-500/10 text-amber-400",
            dot: "bg-amber-400",
            text: "text-amber-400",
          },
        };
      }
      if (currentTimeStr >= closeTime) {
        return {
          state: "Closed",
          label: "Closed for Today",
          details: `Closed at ${closeTime}`,
          isOpenNow: false,
          colorClass: {
            badge: "border-red-500/30 bg-red-500/10 text-red-400",
            dot: "bg-red-400",
            text: "text-red-400",
          },
        };
      }

      return {
        state: "Open",
        label: "Open Now",
        details: `Until ${closeTime}`,
        isOpenNow: true,
        colorClass: {
          badge: "border-qc-lime/30 bg-qc-lime/10 text-qc-lime",
          dot: "bg-qc-lime animate-pulse",
          text: "text-qc-lime",
        },
      };
    } else {
      // Overnight schedule (e.g. 18:00 to 02:00)
      const isNightOpen = currentTimeStr >= openTime || currentTimeStr < closeTime;
      if (isNightOpen) {
        return {
          state: "Open",
          label: "Open Now",
          details: `Open overnight until ${closeTime}`,
          isOpenNow: true,
          colorClass: {
            badge: "border-qc-lime/30 bg-qc-lime/10 text-qc-lime",
            dot: "bg-qc-lime animate-pulse",
            text: "text-qc-lime",
          },
        };
      }
      return {
        state: "Closed",
        label: `Opens at ${openTime}`,
        details: `Hours: ${openTime} – ${closeTime}`,
        isOpenNow: false,
        colorClass: {
          badge: "border-amber-500/30 bg-amber-500/10 text-amber-400",
          dot: "bg-amber-400",
          text: "text-amber-400",
        },
      };
    }
  }

  // 4. Fallback to general start/end hours
  const generalStart = business.businessHours?.startTime || "06:00";
  const generalEnd = business.businessHours?.endTime || "23:00";

  if (currentTimeStr >= generalStart && currentTimeStr < generalEnd) {
    return {
      state: "Open",
      label: "Open Now",
      details: `Until ${generalEnd}`,
      isOpenNow: true,
      colorClass: {
        badge: "border-qc-lime/30 bg-qc-lime/10 text-qc-lime",
        dot: "bg-qc-lime animate-pulse",
        text: "text-qc-lime",
      },
    };
  }

  return {
    state: "Closed",
    label: currentTimeStr < generalStart ? `Opens at ${generalStart}` : "Closed for the Day",
    details: `${generalStart} – ${generalEnd}`,
    isOpenNow: false,
    colorClass: {
      badge: "border-red-500/30 bg-red-500/10 text-red-400",
      dot: "bg-red-400",
      text: "text-red-400",
    },
  };
}
