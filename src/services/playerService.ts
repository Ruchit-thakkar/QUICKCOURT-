import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PlayerProfile, BusinessProfile } from "@/types";

/**
 * Retrieves a player profile from players collection
 */
export async function getPlayerProfile(
  playerId: string
): Promise<PlayerProfile | null> {
  if (!playerId) return null;

  try {
    const playerRef = doc(db, "players", playerId);
    const snap = await getDoc(playerRef);

    if (snap.exists()) {
      const data = snap.data();
      return {
        playerId,
        name: data.name || "Player",
        email: data.email || "",
        phone: data.phone || "",
        profileImage: data.profileImage || "",
        favoriteSports: Array.isArray(data.favoriteSports) ? data.favoriteSports : [],
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    }

    // Fallback: Check if user exists in users collection
    const userRef = doc(db, "users", playerId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const uData = userSnap.data();
      return {
        playerId,
        name: uData.name || "Player",
        email: uData.email || "",
        phone: uData.phone || "",
        profileImage: uData.photoURL || "",
        favoriteSports: [],
        createdAt: uData.createdAt,
      };
    }

    return null;
  } catch (error) {
    console.error("Error fetching player profile:", error);
    return null;
  }
}

/**
 * Creates or updates a player's profile
 */
export async function updatePlayerProfile(
  playerId: string,
  data: Partial<PlayerProfile>
): Promise<void> {
  if (!playerId) throw new Error("Player ID is required");

  const playerRef = doc(db, "players", playerId);
  const snap = await getDoc(playerRef);

  const payload: Record<string, any> = {
    updatedAt: serverTimestamp(),
  };

  if (data.name !== undefined) payload.name = data.name.trim();
  if (data.phone !== undefined) payload.phone = data.phone.trim();
  if (data.profileImage !== undefined) payload.profileImage = data.profileImage;
  if (data.favoriteSports !== undefined) payload.favoriteSports = data.favoriteSports;
  if (data.email !== undefined) payload.email = data.email.trim();

  if (!snap.exists()) {
    payload.playerId = playerId;
    payload.createdAt = serverTimestamp();
    await setDoc(playerRef, payload);
  } else {
    await updateDoc(playerRef, payload);
  }

  // Sync basic display name and phone with users doc
  try {
    const userRef = doc(db, "users", playerId);
    const userUpdate: Record<string, any> = { updatedAt: serverTimestamp() };
    if (data.name) userUpdate.name = data.name.trim();
    if (data.phone) userUpdate.phone = data.phone.trim();
    await updateDoc(userRef, userUpdate);
  } catch {
    // Non-blocking
  }
}

/**
 * Fetches all discoverable sports venues from Firestore
 */
export async function getDiscoverableVenues(): Promise<BusinessProfile[]> {
  try {
    const colRef = collection(db, "businesses");
    const snap = await getDocs(colRef);

    const venues: BusinessProfile[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() as BusinessProfile;
      // Skip if explicitly marked not discoverable or suspended/inactive platform status
      if (data.isDiscoverable === false) return;
      if (data.status?.businessStatus === "INACTIVE") return;

      venues.push({
        ...data,
        businessId: docSnap.id,
      });
    });

    return venues;
  } catch (error) {
    console.error("Error fetching discoverable venues:", error);
    return [];
  }
}

/**
 * Fetches a single business venue by businessId
 */
export async function getVenueById(
  businessId: string
): Promise<BusinessProfile | null> {
  if (!businessId) return null;
  try {
    const docRef = doc(db, "businesses", businessId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return {
      ...(snap.data() as BusinessProfile),
      businessId: snap.id,
    };
  } catch (error) {
    console.error("Error fetching venue by id:", error);
    return null;
  }
}

/**
 * Fetches the IDs of businesses favorited by the player
 */
export async function getFavorites(playerId: string): Promise<string[]> {
  if (!playerId) return [];
  try {
    const favRef = collection(db, "players", playerId, "favorites");
    const snap = await getDocs(favRef);
    return snap.docs.map((d) => d.id);
  } catch (error) {
    console.warn("Error fetching favorites:", error);
    return [];
  }
}

/**
 * Subscribes to real-time changes in a player's favorite venues
 */
export function subscribeFavorites(
  playerId: string,
  onUpdate: (ids: string[]) => void
): () => void {
  if (!playerId) {
    onUpdate([]);
    return () => {};
  }

  const favRef = collection(db, "players", playerId, "favorites");
  return onSnapshot(
    favRef,
    (snapshot) => {
      const ids = snapshot.docs.map((doc) => doc.id);
      onUpdate(ids);
    },
    (err) => {
      console.warn("Favorites subscription error:", err);
      onUpdate([]);
    }
  );
}

/**
 * Toggles a business in the player's favorites
 */
export async function toggleFavorite(
  playerId: string,
  businessId: string,
  isFavorite: boolean,
  business?: Partial<BusinessProfile>
): Promise<void> {
  if (!playerId || !businessId) return;

  const docRef = doc(db, "players", playerId, "favorites", businessId);

  if (isFavorite) {
    await setDoc(docRef, {
      businessId,
      businessName: business?.businessName || "",
      city: business?.location?.city || "",
      coverImageUrl: business?.coverImageUrl || business?.logoUrl || "",
      categories: business?.categories || [],
      favoritedAt: serverTimestamp(),
    });
  } else {
    await deleteDoc(docRef);
  }
}
