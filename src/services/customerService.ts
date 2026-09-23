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
} from "firebase/firestore";
import { auth as firebaseAuth, db } from "@/lib/firebase";
import type { CRMCustomer, OwnerBooking } from "@/types";

/**
 * Normalizes phone number: strips non-digits, ensures standard formatting (e.g. +91...)
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/[^\d+]/g, "").trim();
  if (cleaned.startsWith("+")) {
    return cleaned;
  }
  // Standardize 10-digit Indian numbers to +91
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  // Standardize 12-digit Indian numbers starting with 91
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return `+${cleaned}`;
  }
  return cleaned;
}

/**
 * Real-time listener for customers belonging to an owner's venue.
 */
export function subscribeToCustomers(
  businessId: string,
  ownerId: string,
  onUpdate: (customers: CRMCustomer[]) => void,
  onError?: (error: Error) => void
): () => void {
  const currentUid = ownerId || firebaseAuth.currentUser?.uid;
  if (!businessId && !currentUid) {
    onUpdate([]);
    return () => {};
  }

  const q = currentUid
    ? query(
        collection(db, "customers"),
        where("ownerId", "==", currentUid)
      )
    : query(
        collection(db, "customers"),
        where("businessId", "==", businessId)
      );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const items: CRMCustomer[] = [];
      const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        let lastBookingTime = 0;
        if (data.lastBookingAt?.toMillis) {
          lastBookingTime = data.lastBookingAt.toMillis();
        } else if (typeof data.lastBookingAt === "string") {
          lastBookingTime = new Date(data.lastBookingAt).getTime();
        }

        // Determine activity: Active if booked in last 90 days or status is manually active
        let computedStatus: "active" | "inactive" = data.status === "inactive" ? "inactive" : "active";
        if (lastBookingTime > 0 && lastBookingTime < ninetyDaysAgo) {
          computedStatus = "inactive";
        }

        items.push({
          customerId: docSnap.id,
          businessId: data.businessId,
          ownerId: data.ownerId,
          name: data.name || "Player",
          phone: data.phone || "",
          email: data.email || "",
          totalBookings: Number(data.totalBookings) || 0,
          totalSpent: Number(data.totalSpent) || 0,
          firstBookingAt: data.firstBookingAt,
          lastBookingAt: data.lastBookingAt,
          status: computedStatus,
          notes: data.notes || "",
          favoriteSport: data.favoriteSport || "",
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });

      // Sort by totalBookings descending then lastBookingAt
      items.sort((a, b) => b.totalBookings - a.totalBookings);
      onUpdate(items);
    },
    (err) => {
      console.error("subscribeToCustomers error:", err);
      if (onError) onError(err as Error);
    }
  );

  return unsubscribe;
}

/**
 * Find customer by normalized phone within the owner's venue.
 */
export async function findCustomerByPhone(
  businessId: string,
  phone: string,
  ownerId?: string
): Promise<CRMCustomer | null> {
  const normPhone = normalizePhoneNumber(phone);
  if (!normPhone) return null;
  const currentUid = ownerId || firebaseAuth.currentUser?.uid;

  try {
    const q = currentUid
      ? query(
          collection(db, "customers"),
          where("ownerId", "==", currentUid),
          where("phone", "==", normPhone)
        )
      : query(
          collection(db, "customers"),
          where("businessId", "==", businessId),
          where("phone", "==", normPhone)
        );

    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      const data = docSnap.data();
      return {
        customerId: docSnap.id,
        businessId: data.businessId,
        ownerId: data.ownerId,
        name: data.name || "",
        phone: data.phone || "",
        email: data.email || "",
        totalBookings: data.totalBookings || 0,
        totalSpent: data.totalSpent || 0,
        firstBookingAt: data.firstBookingAt,
        lastBookingAt: data.lastBookingAt,
        status: data.status || "active",
        notes: data.notes || "",
        favoriteSport: data.favoriteSport || "",
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    }
    return null;
  } catch (err) {
    console.error("findCustomerByPhone error:", err);
    return null;
  }
}

/**
 * Upserts a customer CRM record automatically from a booking.
 * Ensures deduplication using businessId + normalized phone.
 */
export async function upsertCustomerFromBooking(
  booking: Omit<OwnerBooking, "bookingId" | "createdAt" | "updatedAt">
): Promise<string> {
  const currentUid = booking.ownerId || firebaseAuth.currentUser?.uid;
  if (!currentUid || !booking.businessId) return "";

  const normPhone = normalizePhoneNumber(booking.customer.phone);
  if (!normPhone) return "";

  const isPaid = booking.payment?.status === "paid";
  const bookingAmount = isPaid ? Number(booking.pricing?.total) || 0 : 0;

  const existing = await findCustomerByPhone(booking.businessId, normPhone, currentUid);

  if (existing) {
    // Update existing customer profile
    const customerRef = doc(db, "customers", existing.customerId);
    const newTotalBookings = (existing.totalBookings || 0) + 1;
    const newTotalSpent = (existing.totalSpent || 0) + bookingAmount;

    await updateDoc(customerRef, {
      name: booking.customer.name.trim() || existing.name,
      email: booking.customer.email?.trim() || existing.email || "",
      totalBookings: newTotalBookings,
      totalSpent: newTotalSpent,
      lastBookingAt: serverTimestamp(),
      status: "active",
      favoriteSport: booking.sport?.name || existing.favoriteSport || "",
      updatedAt: serverTimestamp(),
    });

    return existing.customerId;
  } else {
    // Create new customer profile
    const customerId = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const customerRef = doc(db, "customers", customerId);

    const payload: Record<string, any> = {
      customerId,
      businessId: booking.businessId,
      ownerId: currentUid,
      name: booking.customer.name.trim() || "Player",
      phone: normPhone,
      email: booking.customer.email?.trim() || "",
      totalBookings: 1,
      totalSpent: bookingAmount,
      firstBookingAt: serverTimestamp(),
      lastBookingAt: serverTimestamp(),
      status: "active",
      notes: "",
      favoriteSport: booking.sport?.name || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(customerRef, payload);
    return customerId;
  }
}

/**
 * Manually add a new customer from the CRM dashboard.
 */
export async function createCustomerManually(data: {
  businessId: string;
  ownerId: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}): Promise<string> {
  const normPhone = normalizePhoneNumber(data.phone);
  if (!normPhone) {
    throw new Error("A valid phone number is required.");
  }

  // Check for duplicate phone
  const existing = await findCustomerByPhone(data.businessId, normPhone, data.ownerId);
  if (existing) {
    throw new Error(`A player with phone ${normPhone} already exists (${existing.name}).`);
  }

  const customerId = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const customerRef = doc(db, "customers", customerId);

  const payload: Record<string, any> = {
    customerId,
    businessId: data.businessId,
    ownerId: data.ownerId,
    name: data.name.trim(),
    phone: normPhone,
    email: data.email?.trim() || "",
    totalBookings: 0,
    totalSpent: 0,
    firstBookingAt: null,
    lastBookingAt: null,
    status: "active",
    notes: data.notes?.trim() || "",
    favoriteSport: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(customerRef, payload);
  return customerId;
}

/**
 * Update an existing player's details / CRM notes.
 */
export async function updateCustomerProfile(
  customerId: string,
  updates: {
    name?: string;
    phone?: string;
    email?: string;
    notes?: string;
    status?: "active" | "inactive";
  }
): Promise<void> {
  if (!customerId) return;
  const customerRef = doc(db, "customers", customerId);

  const payload: Record<string, any> = {
    updatedAt: serverTimestamp(),
  };

  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.phone !== undefined) payload.phone = normalizePhoneNumber(updates.phone);
  if (updates.email !== undefined) payload.email = updates.email.trim();
  if (updates.notes !== undefined) payload.notes = updates.notes.trim();
  if (updates.status !== undefined) payload.status = updates.status;

  await updateDoc(customerRef, payload);
}

/**
 * Archive a customer without deleting historical booking records.
 */
export async function archiveCustomer(customerId: string): Promise<void> {
  if (!customerId) return;
  const customerRef = doc(db, "customers", customerId);
  await updateDoc(customerRef, {
    status: "inactive",
    updatedAt: serverTimestamp(),
  });
}

/**
 * Fetch booking history for a specific customer.
 */
export async function getCustomerBookingHistory(
  businessId: string,
  customerPhone: string,
  ownerId?: string
): Promise<OwnerBooking[]> {
  const normPhone = normalizePhoneNumber(customerPhone);
  const currentUid = ownerId || firebaseAuth.currentUser?.uid;
  if (!currentUid) return [];

  try {
    const q = query(
      collection(db, "bookings"),
      where("ownerId", "==", currentUid)
    );

    const snap = await getDocs(q);
    const list: OwnerBooking[] = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const bookingPhone = normalizePhoneNumber(data.customer?.phone || "");
      if (bookingPhone === normPhone) {
        list.push({
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
          cancellation: data.cancellation,
          createdAt: data.createdAt,
        });
      }
    });

    // Sort by gameDate descending
    list.sort((a, b) => b.gameDate.localeCompare(a.gameDate));
    return list;
  } catch (err) {
    console.error("getCustomerBookingHistory error:", err);
    return [];
  }
}
