import type { OwnerBooking, BookingStatus, BusinessProfile } from "@/types";

/**
 * Default cancellation notice window (in hours).
 * Can be configured per business or overridden by business profile settings in the future.
 */
export const DEFAULT_CANCELLATION_WINDOW_HOURS = 2;

/**
 * Checks if a player is allowed to cancel a booking.
 * Rules:
 * 1. Booking must exist and not already be cancelled, completed, or marked as no_show.
 * 2. Current time must be at least `minHoursBefore` hours before the game start time on gameDate.
 */
export function canPlayerCancelBooking(
  booking: OwnerBooking,
  business?: BusinessProfile,
  now: Date = new Date()
): { allowed: boolean; reason?: string } {
  if (!booking) {
    return { allowed: false, reason: "Booking record not found." };
  }

  const currentStatus = booking.bookingStatus || booking.status;
  if (currentStatus === "cancelled") {
    return { allowed: false, reason: "This booking has already been cancelled." };
  }

  if (currentStatus === "completed") {
    return { allowed: false, reason: "Completed games cannot be cancelled." };
  }

  if (currentStatus === "no_show") {
    return { allowed: false, reason: "No-show games cannot be cancelled." };
  }

  // Parse booking start date & time
  if (!booking.gameDate || !booking.startTime) {
    return { allowed: true };
  }

  const [hours, minutes] = booking.startTime.split(":").map(Number);
  const bookingDateTime = new Date(`${booking.gameDate}T00:00:00`);
  bookingDateTime.setHours(hours || 0, minutes || 0, 0, 0);

  const diffMs = bookingDateTime.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  // If game has already started or passed
  if (diffHours <= 0) {
    return {
      allowed: false,
      reason: "Cancellation is not permitted after the scheduled game start time.",
    };
  }

  // Enforce minimum cancellation notice window
  const requiredWindow = DEFAULT_CANCELLATION_WINDOW_HOURS;
  if (diffHours < requiredWindow) {
    return {
      allowed: false,
      reason: `Cancellations must be made at least ${requiredWindow} hours before the scheduled game time. (Currently: ${diffHours.toFixed(1)}h remaining)`,
    };
  }

  return { allowed: true };
}

/**
 * Checks if a venue owner is allowed to cancel a booking for their venue.
 */
export function canOwnerCancelBooking(
  booking: OwnerBooking
): { allowed: boolean; reason?: string } {
  if (!booking) {
    return { allowed: false, reason: "Booking record not found." };
  }

  const currentStatus = booking.bookingStatus || booking.status;
  if (currentStatus === "cancelled") {
    return { allowed: false, reason: "Booking is already cancelled." };
  }

  if (currentStatus === "completed") {
    return { allowed: false, reason: "Completed games cannot be cancelled." };
  }

  return { allowed: true };
}

/**
 * Legal state machine transitions for bookings:
 * - pending   -> confirmed, cancelled
 * - confirmed -> completed, cancelled, no_show
 * - cancelled -> (terminal)
 * - completed -> (terminal)
 * - no_show   -> (terminal)
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled", "no_show"],
  cancelled: [],
  completed: [],
  no_show: [],
};

/**
 * Validates whether transitioning from currentStatus to nextStatus is permitted
 */
export function canTransitionBookingStatus(
  currentStatus: BookingStatus,
  nextStatus: BookingStatus
): boolean {
  if (currentStatus === nextStatus) return true;
  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
  return allowed.includes(nextStatus);
}
