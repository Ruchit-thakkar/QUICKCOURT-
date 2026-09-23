import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  runTransaction,
} from "firebase/firestore";
import { auth as firebaseAuth, db } from "@/lib/firebase";
import type {
  OwnerBooking,
  BookingStatus,
  PaymentStatus,
  CreateBookingInput,
  BlockedSlot,
  VenueCourt,
  SlotLockData,
} from "@/types";
import {
  canPlayerCancelBooking,
  canOwnerCancelBooking,
  canTransitionBookingStatus,
} from "./cancellationRules";

/**
 * Generates a clean, user-facing booking ID formatted as QC-YYYYMMDD-XXXX
 */
export function generateReadableBookingId(gameDate: string): string {
  const cleanDate = (gameDate || "").replace(/-/g, "");
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `QC-${cleanDate || "2026"}-${randomSuffix}`;
}

/**
 * Generates deterministic slot lock ID using zero-padded 24h start time
 */
export function generateSlotLockId(
  businessId: string,
  courtId: string,
  gameDate: string,
  startTime: string
): string {
  const [h, m] = (startTime || "00:00").split(":");
  const hh = String(parseInt(h, 10) || 0).padStart(2, "0");
  const mm = String(parseInt(m, 10) || 0).padStart(2, "0");
  return `${businessId}_${courtId}_${gameDate}_${hh}${mm}`;
}

/**
 * Real-time listener for live court slot locks (bookings and blocks) for a venue on a date.
 * Publicly accessible to players and owners, contains zero customer PII.
 */
export function subscribeToDateAvailability(
  businessId: string,
  gameDate: string,
  onUpdate: (locks: SlotLockData[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!businessId || !gameDate) {
    onUpdate([]);
    return () => {};
  }

  const q = query(
    collection(db, "slot_locks"),
    where("businessId", "==", businessId),
    where("gameDate", "==", gameDate)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const locks: SlotLockData[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        locks.push({
          lockId: d.id,
          businessId: data.businessId,
          courtId: data.courtId,
          gameDate: data.gameDate,
          startTime: data.startTime,
          endTime: data.endTime,
          status: data.status || "confirmed",
          reason: data.reason,
        });
      });
      onUpdate(locks);
    },
    (err) => {
      console.error("subscribeToDateAvailability error:", err);
      if (onError) onError(err as Error);
    }
  );
}

/**
 * Fetch blocked slots for a business on a specific date
 */
export async function getBlockedSlotsForDate(
  businessId: string,
  gameDate: string
): Promise<BlockedSlot[]> {
  if (!businessId || !gameDate) return [];
  try {
    const q = query(
      collection(db, "blocked_slots"),
      where("businessId", "==", businessId),
      where("gameDate", "==", gameDate)
    );
    const snap = await getDocs(q);
    const blocks: BlockedSlot[] = [];
    snap.forEach((d) => {
      const data = d.data();
      blocks.push({
        blockId: d.id,
        businessId: data.businessId,
        ownerId: data.ownerId,
        courtId: data.courtId,
        courtName: data.courtName,
        gameDate: data.gameDate,
        startTime: data.startTime,
        endTime: data.endTime,
        reason: data.reason || "Blocked by venue",
        blockedAt: data.blockedAt,
      });
    });
    return blocks;
  } catch (err) {
    console.error("getBlockedSlotsForDate error:", err);
    return [];
  }
}

/**
 * Real-time listener for blocked slots on a given date for a business
 */
export function subscribeToBlockedSlots(
  businessId: string,
  gameDate: string,
  onUpdate: (blocks: BlockedSlot[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!businessId || !gameDate) {
    onUpdate([]);
    return () => {};
  }

  const q = query(
    collection(db, "blocked_slots"),
    where("businessId", "==", businessId),
    where("gameDate", "==", gameDate)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const blocks: BlockedSlot[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        blocks.push({
          blockId: d.id,
          businessId: data.businessId,
          ownerId: data.ownerId,
          courtId: data.courtId,
          courtName: data.courtName,
          gameDate: data.gameDate,
          startTime: data.startTime,
          endTime: data.endTime,
          reason: data.reason || "Blocked by venue",
          blockedAt: data.blockedAt,
        });
      });
      onUpdate(blocks);
    },
    (err) => {
      console.error("subscribeToBlockedSlots error:", err);
      if (onError) onError(err as Error);
    }
  );
}

/**
 * Atomically blocks a court slot for a specified reason (maintenance, private event, etc.)
 */
export async function blockSlotAtomically(input: {
  businessId: string;
  ownerId: string;
  courtId: string;
  courtName?: string;
  gameDate: string;
  startTime: string;
  endTime: string;
  reason: string;
}): Promise<string> {
  const currentUid = firebaseAuth.currentUser?.uid;
  if (!currentUid) {
    throw new Error("You must be logged in as an owner to block a slot.");
  }

  const lockId = generateSlotLockId(
    input.businessId,
    input.courtId,
    input.gameDate,
    input.startTime
  );
  const slotLockRef = doc(db, "slot_locks", lockId);
  const blockId = `block_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const blockRef = doc(db, "blocked_slots", blockId);

  await runTransaction(db, async (transaction) => {
    // 1. Check if slot lock is already occupied by a confirmed booking or existing block
    const lockSnap = await transaction.get(slotLockRef);
    if (lockSnap.exists()) {
      const data = lockSnap.data();
      if (data.status === "confirmed") {
        throw new Error("This slot is already booked and cannot be blocked.");
      }
      if (data.status === "blocked") {
        throw new Error("This slot is already blocked.");
      }
    }

    // 2. Set slot lock to blocked state
    transaction.set(slotLockRef, {
      lockId,
      blockId,
      businessId: input.businessId,
      courtId: input.courtId,
      gameDate: input.gameDate,
      startTime: input.startTime,
      endTime: input.endTime,
      ownerId: input.ownerId || currentUid,
      status: "blocked",
      reason: input.reason.trim() || "Maintenance",
      createdAt: serverTimestamp(),
    });

    // 3. Write blocked slot record
    transaction.set(blockRef, {
      blockId,
      lockId,
      businessId: input.businessId,
      ownerId: input.ownerId || currentUid,
      courtId: input.courtId,
      courtName: input.courtName || "Court",
      gameDate: input.gameDate,
      startTime: input.startTime,
      endTime: input.endTime,
      reason: input.reason.trim() || "Maintenance",
      blockedAt: serverTimestamp(),
    });
  });

  return blockId;
}

/**
 * Atomically unblocks a previously blocked slot
 */
export async function unblockSlot(blockId: string): Promise<void> {
  if (!blockId) return;

  const currentUid = firebaseAuth.currentUser?.uid;
  if (!currentUid) {
    throw new Error("Unauthorized: Must be logged in to unblock a slot.");
  }

  const blockRef = doc(db, "blocked_slots", blockId);
  const blockSnap = await getDoc(blockRef);
  if (!blockSnap.exists()) {
    throw new Error("Block record not found.");
  }

  const blockData = blockSnap.data();
  const lockId =
    blockData.lockId ||
    generateSlotLockId(
      blockData.businessId,
      blockData.courtId,
      blockData.gameDate,
      blockData.startTime
    );
  const slotLockRef = doc(db, "slot_locks", lockId);

  await runTransaction(db, async (transaction) => {
    // Delete block record
    transaction.delete(blockRef);

    // Delete lock document if it exists
    const lockSnap = await transaction.get(slotLockRef);
    if (lockSnap.exists()) {
      transaction.delete(slotLockRef);
    }
  });
}

/**
 * Real-time listener for incoming bookings belonging to a specific business.
 * Used by the business owner.
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

  // Query by ownerId if available to match Firestore rules
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
          readableId: data.readableId || docSnap.id,
          businessId: data.businessId,
          ownerId: data.ownerId,
          playerId: data.playerId || data.customer?.userId || "",
          customer: {
            userId: data.customer?.userId || data.playerId || "",
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
            subtotal: data.pricing?.subtotal || data.price || 0,
            discount: data.pricing?.discount || 0,
            total: data.pricing?.total || data.price || 0,
            currency: data.pricing?.currency || "INR",
          },
          price: data.price || data.pricing?.total || 0,
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

      // Sort by date and startTime descending (most recent first)
      items.sort((a, b) => {
        if (a.gameDate !== b.gameDate) {
          return b.gameDate.localeCompare(a.gameDate);
        }
        return b.startTime.localeCompare(a.startTime);
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
 * Fetch existing bookings for a business on a specific date to check slot availability.
 */
export async function getExistingBookingsForDate(
  businessId: string,
  gameDate: string,
  ownerId?: string
): Promise<OwnerBooking[]> {
  if (!businessId || !gameDate) return [];

  try {
    const q = query(
      collection(db, "bookings"),
      where("businessId", "==", businessId),
      where("gameDate", "==", gameDate)
    );

    const snapshot = await getDocs(q);
    const bookings: OwnerBooking[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      // Only active, non-cancelled bookings block availability
      if (data.bookingStatus !== "cancelled") {
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
          playerCount: data.playerCount || 1,
          pricing: data.pricing || { total: data.price || 0, subtotal: data.price || 0, currency: "INR" },
          price: data.price || data.pricing?.total || 0,
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
 * Real-time listener for detailed bookings on a specific date for a business owner.
 */
export function subscribeToDateBookings(
  businessId: string,
  gameDate: string,
  onUpdate: (bookings: OwnerBooking[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!businessId || !gameDate) {
    onUpdate([]);
    return () => {};
  }

  const q = query(
    collection(db, "bookings"),
    where("businessId", "==", businessId),
    where("gameDate", "==", gameDate)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: OwnerBooking[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          bookingId: docSnap.id,
          readableId: data.readableId || docSnap.id,
          businessId: data.businessId,
          ownerId: data.ownerId,
          playerId: data.playerId || data.customer?.userId || "",
          source: data.source || "player",
          customer: {
            userId: data.customer?.userId || data.playerId || "",
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
          durationMinutes: data.durationMinutes || 60,
          playerCount: data.playerCount || 1,
          pricing: data.pricing || { total: data.price || 0, subtotal: data.price || 0, currency: "INR" },
          price: data.price || data.pricing?.total || 0,
          bookingStatus: (data.bookingStatus as BookingStatus) || "confirmed",
          status: (data.bookingStatus as BookingStatus) || "confirmed",
          payment: {
            status: data.payment?.status || "pending",
            method: data.payment?.method || "cash",
            paidAt: data.payment?.paidAt,
          },
          cancellation: data.cancellation,
          confirmedAt: data.confirmedAt,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });

      items.sort((a, b) => a.startTime.localeCompare(b.startTime));
      onUpdate(items);
    },
    (err) => {
      console.error("subscribeToDateBookings error:", err);
      if (onError) onError(err as Error);
    }
  );
}

/**
 * Atomically books a court slot using Firestore runTransaction and deterministic slot lock
 * documents to prevent concurrent double-bookings.
 */
export async function bookSlotAtomically(
  input: CreateBookingInput
): Promise<{ bookingId: string; readableId: string }> {
  const currentUid = firebaseAuth.currentUser?.uid;
  if (!currentUid) {
    throw new Error("You must be logged in to book a court.");
  }

  // 1. Construct deterministic slot lock key
  const lockId = generateSlotLockId(
    input.businessId,
    input.courtId,
    input.gameDate,
    input.startTime
  );
  const slotLockRef = doc(db, "slot_locks", lockId);

  const bookingId = `book_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const readableId = generateReadableBookingId(input.gameDate);
  const bookingRef = doc(db, "bookings", bookingId);

  // 2. Execute atomic transaction
  await runTransaction(db, async (transaction) => {
    // 1. Check if slot lock document already exists or is locked/blocked
    const lockSnap = await transaction.get(slotLockRef);
    if (lockSnap.exists()) {
      const lockData = lockSnap.data();
      if (lockData.status === "confirmed") {
        throw new Error("This slot was just booked. Please select another slot.");
      }
      if (lockData.status === "blocked") {
        throw new Error(`This slot is currently unavailable (${lockData.reason || "blocked"}). Please select another slot.`);
      }
    }

    // 2. Verify business document
    const bizRef = doc(db, "businesses", input.businessId);
    const bizSnap = await transaction.get(bizRef);
    if (!bizSnap.exists()) {
      throw new Error("Venue does not exist.");
    }
    const bizData = bizSnap.data();
    if (bizData.status?.operationalStatus === "CLOSED" || bizData.businessStatus === "closed") {
      throw new Error("This venue is currently closed.");
    }
    if (bizData.status?.operationalStatus === "TEMPORARILY_UNAVAILABLE") {
      throw new Error("This venue is temporarily unavailable.");
    }

    // 3. Verify court status and pricing
    const courts: VenueCourt[] = Array.isArray(bizData.courts) ? bizData.courts : [];
    const matchedCourt = courts.find((c) => c.courtId === input.courtId);
    if (matchedCourt) {
      if (matchedCourt.status === "maintenance") {
        throw new Error("This court is currently under maintenance. Please select another court.");
      }
      if (matchedCourt.status === "inactive" || matchedCourt.active === false) {
        throw new Error("This court is currently inactive.");
      }

      // Authoritative Price Calculation & Validation
      const duration = input.durationMinutes || matchedCourt.slotDurationMinutes || 60;
      const baseHourly = Number(matchedCourt.pricePerHour) || 0;
      const calculatedExpectedPrice = duration === 30 ? Math.round(baseHourly / 2) : baseHourly;

      // If user is a player, prevent price tampering
      const isOwner = currentUid === input.ownerId;
      if (!isOwner && calculatedExpectedPrice > 0 && Math.abs(Number(input.price) - calculatedExpectedPrice) > 5) {
        throw new Error("Price mismatch detected. Please refresh the page to view current court rates.");
      }
    }

    // Determine booking source
    const bookingSource = input.source || (currentUid === input.ownerId ? "owner" : "player");

    // Build booking payload
    const payload: Record<string, any> = {
      bookingId,
      readableId,
      businessId: input.businessId,
      ownerId: input.ownerId,
      playerId: input.playerId || currentUid,
      source: bookingSource,
      customer: {
        userId: input.playerId || currentUid,
        name: input.customerName.trim(),
        phone: input.customerPhone.trim(),
        email: input.customerEmail?.trim() || "",
      },
      sport: {
        id: input.sportId,
        name: input.sportName,
      },
      court: {
        courtId: input.courtId,
        name: input.courtName,
      },
      gameDate: input.gameDate,
      startTime: input.startTime,
      endTime: input.endTime,
      durationMinutes: input.durationMinutes || 60,
      playerCount: Number(input.playerCount) || 1,
      pricing: {
        subtotal: Number(input.price) || 0,
        discount: 0,
        total: Number(input.price) || 0,
        currency: "INR",
      },
      price: Number(input.price) || 0,
      bookingStatus: "confirmed",
      status: "confirmed",
      payment: {
        status: input.paymentStatus || "pending",
        method: input.paymentMethod || "pay_at_venue",
        paidAt: input.paymentStatus === "paid" ? serverTimestamp() : null,
      },
      confirmedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Atomically write the slot lock
    transaction.set(slotLockRef, {
      lockId,
      bookingId,
      readableId,
      businessId: input.businessId,
      courtId: input.courtId,
      gameDate: input.gameDate,
      startTime: input.startTime,
      endTime: input.endTime,
      playerId: input.playerId || currentUid,
      ownerId: input.ownerId,
      status: "confirmed",
      source: bookingSource,
      createdAt: serverTimestamp(),
    });

    // Atomically write the booking
    transaction.set(bookingRef, payload);
  });

  // 3. Asynchronously sync/update customer CRM record
  try {
    const { upsertCustomerFromBooking } = await import("@/services/customerService");
    await upsertCustomerFromBooking({
      businessId: input.businessId,
      ownerId: input.ownerId,
      customer: {
        userId: input.playerId || currentUid,
        name: input.customerName.trim(),
        phone: input.customerPhone.trim(),
        email: input.customerEmail?.trim() || "",
      },
      sport: { id: input.sportId, name: input.sportName },
      court: { courtId: input.courtId, name: input.courtName },
      gameDate: input.gameDate,
      startTime: input.startTime,
      endTime: input.endTime,
      playerCount: input.playerCount,
      pricing: { subtotal: input.price, total: input.price, currency: "INR" },
      bookingStatus: "confirmed",
      payment: { status: "pending" },
    });
  } catch (err) {
    console.warn("Could not sync customer CRM profile:", err);
  }

  return { bookingId, readableId };
}

/**
 * Cancels a booking and releases the slot lock atomically
 */
export async function cancelBookingWithLock(
  bookingId: string,
  reason: string,
  cancelledBy: "player" | "owner" | "admin" = "player"
): Promise<void> {
  if (!bookingId) return;

  const currentUid = firebaseAuth.currentUser?.uid;
  if (!currentUid) {
    throw new Error("Unauthorized: Must be logged in to cancel a booking.");
  }

  const bookingRef = doc(db, "bookings", bookingId);
  const snap = await getDoc(bookingRef);
  if (!snap.exists()) {
    throw new Error("Booking not found.");
  }
  const data = snap.data() as OwnerBooking;

  // Validate cancellation permission & rules
  if (cancelledBy === "player") {
    const check = canPlayerCancelBooking(data);
    if (!check.allowed) {
      throw new Error(check.reason || "This booking cannot be cancelled.");
    }
  } else if (cancelledBy === "owner") {
    const check = canOwnerCancelBooking(data);
    if (!check.allowed) {
      throw new Error(check.reason || "This booking cannot be cancelled.");
    }
  }

  // Identify slot lock key
  const lockId = generateSlotLockId(
    data.businessId,
    data.court?.courtId || "default_court",
    data.gameDate,
    data.startTime
  );
  const slotLockRef = doc(db, "slot_locks", lockId);

  await runTransaction(db, async (transaction) => {
    // 1. Update booking status to cancelled
    transaction.update(bookingRef, {
      bookingStatus: "cancelled",
      status: "cancelled",
      cancellation: {
        reason: reason.trim() || "Cancelled by user",
        cancelledAt: serverTimestamp(),
        cancelledBy,
      },
      cancelledAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 2. Free up slot lock
    const lockSnap = await transaction.get(slotLockRef);
    if (lockSnap.exists()) {
      transaction.delete(slotLockRef);
    }
  });
}

/**
 * Marks an eligible confirmed booking as completed (owner only)
 */
export async function markBookingCompleted(bookingId: string): Promise<void> {
  if (!bookingId) return;
  const currentUid = firebaseAuth.currentUser?.uid;
  if (!currentUid) throw new Error("Unauthorized");

  const bookingRef = doc(db, "bookings", bookingId);
  const snap = await getDoc(bookingRef);
  if (!snap.exists()) throw new Error("Booking not found");

  const data = snap.data() as OwnerBooking;
  const currentStatus = data.bookingStatus || data.status || "confirmed";
  if (!canTransitionBookingStatus(currentStatus, "completed")) {
    throw new Error(`Cannot mark booking with status "${currentStatus}" as completed.`);
  }

  await updateDoc(bookingRef, {
    bookingStatus: "completed",
    status: "completed",
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Marks an eligible confirmed booking as no-show (owner only)
 */
export async function markBookingNoShow(bookingId: string): Promise<void> {
  if (!bookingId) return;
  const currentUid = firebaseAuth.currentUser?.uid;
  if (!currentUid) throw new Error("Unauthorized");

  const bookingRef = doc(db, "bookings", bookingId);
  const snap = await getDoc(bookingRef);
  if (!snap.exists()) throw new Error("Booking not found");

  const data = snap.data() as OwnerBooking;
  const currentStatus = data.bookingStatus || data.status || "confirmed";
  if (!canTransitionBookingStatus(currentStatus, "no_show")) {
    throw new Error(`Cannot mark booking with status "${currentStatus}" as no-show.`);
  }

  await updateDoc(bookingRef, {
    bookingStatus: "no_show",
    status: "no_show",
    noShowAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Confirm a pending booking
 */
export async function confirmBooking(bookingId: string): Promise<void> {
  if (!bookingId) return;
  const bookingRef = doc(db, "bookings", bookingId);
  await updateDoc(bookingRef, {
    bookingStatus: "confirmed",
    status: "confirmed",
    confirmedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Cancel a booking with reason
 */
export async function cancelBooking(
  bookingId: string,
  reason: string,
  cancelledBy: "owner" | "player" | "admin" = "owner"
): Promise<void> {
  return cancelBookingWithLock(bookingId, reason, cancelledBy);
}

/**
 * Fetch all bookings for an authenticated player
 */
export async function getPlayerBookings(playerId: string): Promise<OwnerBooking[]> {
  if (!playerId) return [];

  try {
    const q = query(
      collection(db, "bookings"),
      where("customer.userId", "==", playerId)
    );
    const snap = await getDocs(q);
    const bookings: OwnerBooking[] = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      bookings.push({
        bookingId: docSnap.id,
        readableId: data.readableId || docSnap.id,
        businessId: data.businessId,
        ownerId: data.ownerId,
        playerId: data.playerId || data.customer?.userId,
        customer: data.customer || { name: "Player", phone: "" },
        sport: data.sport || { id: "", name: "" },
        court: data.court || { courtId: "", name: "" },
        gameDate: data.gameDate,
        startTime: data.startTime,
        endTime: data.endTime,
        playerCount: data.playerCount || 1,
        pricing: data.pricing || { total: data.price || 0, subtotal: data.price || 0, currency: "INR" },
        price: data.price || data.pricing?.total || 0,
        bookingStatus: data.bookingStatus || "confirmed",
        payment: data.payment || { status: "pending" },
        cancellation: data.cancellation,
        createdAt: data.createdAt,
      });
    });

    // Sort descending by date and time
    bookings.sort((a, b) => {
      if (a.gameDate !== b.gameDate) {
        return b.gameDate.localeCompare(a.gameDate);
      }
      return b.startTime.localeCompare(a.startTime);
    });

    return bookings;
  } catch (err) {
    console.error("getPlayerBookings error:", err);
    return [];
  }
}

/**
 * Subscribes to real-time updates for a player's bookings
 */
export function subscribePlayerBookings(
  playerId: string,
  onUpdate: (bookings: OwnerBooking[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!playerId) {
    onUpdate([]);
    return () => {};
  }

  const q = query(
    collection(db, "bookings"),
    where("customer.userId", "==", playerId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const bookings: OwnerBooking[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        bookings.push({
          bookingId: docSnap.id,
          readableId: data.readableId || docSnap.id,
          businessId: data.businessId,
          ownerId: data.ownerId,
          playerId: data.playerId || data.customer?.userId,
          customer: data.customer || { name: "Player", phone: "" },
          sport: data.sport || { id: "", name: "" },
          court: data.court || { courtId: "", name: "" },
          gameDate: data.gameDate,
          startTime: data.startTime,
          endTime: data.endTime,
          playerCount: data.playerCount || 1,
          pricing: data.pricing || { total: data.price || 0, subtotal: data.price || 0, currency: "INR" },
          price: data.price || data.pricing?.total || 0,
          bookingStatus: data.bookingStatus || "confirmed",
          payment: data.payment || { status: "pending" },
          cancellation: data.cancellation,
          createdAt: data.createdAt,
        });
      });

      bookings.sort((a, b) => {
        if (a.gameDate !== b.gameDate) {
          return b.gameDate.localeCompare(a.gameDate);
        }
        return b.startTime.localeCompare(a.startTime);
      });

      onUpdate(bookings);
    },
    (err) => {
      console.error("subscribePlayerBookings error:", err);
      if (onError) onError(err as Error);
    }
  );
}

/**
 * Legacy wrapper: createManualBooking (used by owner quick booking)
 */
export async function createManualBooking(
  bookingData: Omit<OwnerBooking, "bookingId" | "createdAt" | "updatedAt">
): Promise<string> {
  const result = await bookSlotAtomically({
    businessId: bookingData.businessId,
    ownerId: bookingData.ownerId,
    courtId: bookingData.court.courtId,
    courtName: bookingData.court.name,
    sportId: bookingData.sport.id,
    sportName: bookingData.sport.name,
    gameDate: bookingData.gameDate,
    startTime: bookingData.startTime,
    endTime: bookingData.endTime,
    durationMinutes: bookingData.durationMinutes || 60,
    playerCount: bookingData.playerCount || 1,
    price: bookingData.pricing?.total || 0,
    customerName: bookingData.customer.name,
    customerPhone: bookingData.customer.phone,
    customerEmail: bookingData.customer.email,
    playerId: bookingData.customer.userId || bookingData.playerId || "",
    source: bookingData.source || "owner",
    paymentMethod: bookingData.payment?.method,
    paymentStatus: bookingData.payment?.status,
  });

  return result.bookingId;
}
