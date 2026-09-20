import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { auth as firebaseAuth, db } from "@/lib/firebase";
import type { OwnerBooking, BookingStatus, PaymentStatus } from "@/types";

/**
 * Real-time listener for incoming bookings belonging to a specific business.
 * Supports reactive updates when status changes or new bookings arrive.
 */
export function subscribeToIncomingBookings(
  businessId: string,
  onUpdate: (bookings: OwnerBooking[]) => void,
  onError?: (error: Error) => void,
  ownerId?: string
): () => void {
  const currentUid = ownerId || firebaseAuth.currentUser?.uid;
  if (!businessId && !currentUid) {
    onUpdate([]);
    return () => {};
  }

  // Use ownerId in query if available to ensure rule matching for owners
  const q = currentUid
    ? query(
        collection(db, "bookings"),
        where("ownerId", "==", currentUid)
      )
    : query(
        collection(db, "bookings"),
        where("businessId", "==", businessId)
      );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const items: OwnerBooking[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          bookingId: docSnap.id,
          businessId: data.businessId,
          ownerId: data.ownerId,
          customer: {
            userId: data.customer?.userId || "",
            name: data.customer?.name || "Player",
            phone: data.customer?.phone || "",
            email: data.customer?.email || "",
          },
          sport: {
            id: data.sport?.id || "cricket",
            name: data.sport?.name || "Cricket",
          },
          court: {
            courtId: data.court?.courtId || "default_court",
            name: data.court?.name || "Main Court",
          },
          gameDate: data.gameDate || "",
          startTime: data.startTime || "",
          endTime: data.endTime || "",
          startAt: data.startAt,
          endAt: data.endAt,
          durationMinutes: data.durationMinutes || 60,
          playerCount: data.playerCount || 1,
          pricing: {
            subtotal: data.pricing?.subtotal || 0,
            discount: data.pricing?.discount || 0,
            total: data.pricing?.total || 0,
            currency: data.pricing?.currency || "INR",
          },
          bookingStatus: (data.bookingStatus as BookingStatus) || "confirmed",
          payment: {
            status: (data.payment?.status as PaymentStatus) || "pending",
            method: data.payment?.method || "cash",
            paidAt: data.payment?.paidAt,
          },
          cancellation: data.cancellation
            ? {
                reason: data.cancellation.reason || "",
                cancelledAt: data.cancellation.cancelledAt,
                cancelledBy: data.cancellation.cancelledBy || "",
              }
            : undefined,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });

      // Sort by date and startTime ascending
      items.sort((a, b) => {
        if (a.gameDate !== b.gameDate) {
          return a.gameDate.localeCompare(b.gameDate);
        }
        return a.startTime.localeCompare(b.startTime);
      });

      onUpdate(items);
    },
    (err) => {
      console.error("subscribeToIncomingBookings error:", err);
      if (onError) onError(err as Error);
    }
  );

  return unsubscribe;
}

/**
 * Fetch existing bookings for a business on a specific date.
 * Used for checking slot availability in real time.
 */
export async function getExistingBookingsForDate(
  businessId: string,
  gameDate: string,
  ownerId?: string
): Promise<OwnerBooking[]> {
  const currentUid = ownerId || firebaseAuth.currentUser?.uid;
  if (!gameDate) return [];

  try {
    const q = currentUid
      ? query(
          collection(db, "bookings"),
          where("ownerId", "==", currentUid),
          where("gameDate", "==", gameDate)
        )
      : query(
          collection(db, "bookings"),
          where("businessId", "==", businessId),
          where("gameDate", "==", gameDate)
        );

    const snapshot = await getDocs(q);
    const bookings: OwnerBooking[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      // Exclude cancelled bookings from blocking slots
      if (data.bookingStatus !== "cancelled") {
        bookings.push({
          bookingId: docSnap.id,
          businessId: data.businessId,
          ownerId: data.ownerId,
          customer: data.customer || { name: "", phone: "" },
          sport: data.sport || { id: "", name: "" },
          court: data.court || { courtId: "", name: "" },
          gameDate: data.gameDate,
          startTime: data.startTime,
          endTime: data.endTime,
          playerCount: data.playerCount || 1,
          pricing: data.pricing || { total: 0, subtotal: 0, currency: "INR" },
          bookingStatus: data.bookingStatus || "confirmed",
          payment: data.payment || { status: "pending" },
          createdAt: data.createdAt,
        });
      }
    });

    return bookings;
  } catch (err) {
    console.error("getExistingBookingsForDate error:", err);
    return [];
  }
}

/**
 * Create a new booking manually (by Owner or Player).
 */
export async function createManualBooking(
  bookingData: Omit<OwnerBooking, "bookingId" | "createdAt" | "updatedAt">
): Promise<string> {
  const currentUid = firebaseAuth.currentUser?.uid;
  if (!currentUid) {
    throw new Error("Unauthorized: Must be logged in to create a booking.");
  }

  const bookingId = `book_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const bookingRef = doc(db, "bookings", bookingId);

  const payload: Record<string, any> = {
    bookingId,
    businessId: bookingData.businessId,
    ownerId: bookingData.ownerId,
    customer: {
      userId: bookingData.customer.userId || currentUid,
      name: bookingData.customer.name.trim(),
      phone: bookingData.customer.phone.trim(),
      email: bookingData.customer.email?.trim() || "",
    },
    sport: {
      id: bookingData.sport.id,
      name: bookingData.sport.name,
    },
    court: {
      courtId: bookingData.court.courtId,
      name: bookingData.court.name,
    },
    gameDate: bookingData.gameDate,
    startTime: bookingData.startTime,
    endTime: bookingData.endTime,
    durationMinutes: bookingData.durationMinutes || 60,
    playerCount: Number(bookingData.playerCount) || 1,
    pricing: {
      subtotal: Number(bookingData.pricing.subtotal) || 0,
      discount: Number(bookingData.pricing.discount) || 0,
      total: Number(bookingData.pricing.total) || 0,
      currency: bookingData.pricing.currency || "INR",
    },
    bookingStatus: bookingData.bookingStatus || "confirmed",
    payment: {
      status: bookingData.payment.status || "paid",
      method: bookingData.payment.method || "cash",
      paidAt: serverTimestamp(),
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(bookingRef, payload);
  return bookingId;
}

/**
 * Confirm a pending booking
 */
export async function confirmBooking(bookingId: string): Promise<void> {
  if (!bookingId) return;
  const bookingRef = doc(db, "bookings", bookingId);
  await updateDoc(bookingRef, {
    bookingStatus: "confirmed",
    updatedAt: serverTimestamp(),
  });
}

/**
 * Cancel a booking with reason
 */
export async function cancelBooking(
  bookingId: string,
  reason: string,
  cancelledBy: string = "owner"
): Promise<void> {
  if (!bookingId) return;
  const bookingRef = doc(db, "bookings", bookingId);
  await updateDoc(bookingRef, {
    bookingStatus: "cancelled",
    cancellation: {
      reason: reason.trim() || "Cancelled by owner",
      cancelledAt: serverTimestamp(),
      cancelledBy,
    },
    updatedAt: serverTimestamp(),
  });
}
