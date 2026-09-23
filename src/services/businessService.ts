import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth as firebaseAuth, db, storage } from "@/lib/firebase";
import type {
  BusinessProfile,
  BusinessMedia,
  BusinessImageItem,
  BusinessLocation,
  BusinessCoordinates,
  WeeklySchedule,
  VenueCourt,
  PlatformBusinessStatus,
  OperationalStatus,
  CourtStatus,
} from "@/types";

/**
 * Normalizes phone number: strips non-digits, standardizes format (e.g. +91...)
 */
export function normalizePhone(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/[^\d+]/g, "").trim();
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.length === 10) return `+91${cleaned}`;
  if (cleaned.length === 12 && cleaned.startsWith("91")) return `+${cleaned}`;
  return cleaned;
}

/**
 * Normalizes Instagram handle: removes URLs, @ symbol, returns canonical handle
 */
export function normalizeInstagramHandle(input: string): string {
  if (!input) return "";
  let clean = input.trim();
  clean = clean.replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, "");
  clean = clean.replace(/^@/, "");
  clean = clean.split("/")[0].split("?")[0].trim();
  return clean;
}

/**
 * Normalizes Website URL: ensures https:// protocol, removes trailing slashes
 */
export function normalizeWebsiteUrl(input: string): string {
  if (!input) return "";
  let clean = input.trim();
  if (!/^https?:\/\//i.test(clean)) {
    clean = `https://${clean}`;
  }
  return clean.replace(/\/+$/, "");
}

/**
 * Validates geographic coordinates
 */
export function isValidCoordinates(coords?: BusinessCoordinates): boolean {
  if (!coords) return false;
  const { latitude, longitude } = coords;
  if (typeof latitude !== "number" || typeof longitude !== "number") return false;
  if (isNaN(latitude) || isNaN(longitude)) return false;
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

/**
 * Synthesizes a backward-compatible weekly schedule from flat startTime and endTime
 */
export function buildWeeklyScheduleFromHours(startTime: string, endTime: string): WeeklySchedule {
  const standardDay = {
    isOpen: true,
    openTime: startTime || "08:00",
    closeTime: endTime || "22:00",
  };
  return {
    monday: { ...standardDay },
    tuesday: { ...standardDay },
    wednesday: { ...standardDay },
    thursday: { ...standardDay },
    friday: { ...standardDay },
    saturday: { ...standardDay },
    sunday: { ...standardDay },
  };
}

/**
 * Calculates profile completeness percentage and identifies missing fields
 */
export function calculateProfileCompleteness(profile: Partial<BusinessProfile>): {
  percentage: number;
  missingFields: string[];
} {
  const missing: string[] = [];
  let score = 0;

  // 1. Business Name (15%)
  if (profile.businessName?.trim()) score += 15;
  else missing.push("Business Name");

  // 2. Owner Contact (15%)
  if (profile.owner?.name?.trim() && profile.owner?.phone?.trim() && profile.owner?.email?.trim()) {
    score += 15;
  } else {
    missing.push("Owner Contact Information");
  }

  // 3. Sports Categories (15%)
  if (profile.categories && profile.categories.length > 0) score += 15;
  else missing.push("Sports Categories");

  // 4. Courts & Grounds (15%)
  const activeCourts = profile.courts?.filter((c) => c.active !== false) || [];
  if (activeCourts.length > 0) score += 15;
  else missing.push("Courts or Grounds");

  // 5. Location PIN & Address (15%)
  if (profile.location?.pinCode?.trim() && profile.location?.address?.trim()) score += 15;
  else missing.push("Venue Address & PIN Code");

  // 6. Business Hours (10%)
  if (profile.businessHours?.startTime && profile.businessHours?.endTime) score += 10;
  else missing.push("Operating Hours");

  // 7. Logo or Branding (10%)
  if (profile.logoUrl?.trim() || profile.media?.logo?.url?.trim()) score += 10;
  else missing.push("Venue Logo");

  // 8. Map Coordinates (5% bonus)
  if (isValidCoordinates(profile.location?.coordinates)) score += 5;

  return {
    percentage: Math.min(score, 100),
    missingFields: missing,
  };
}

/**
 * Determines whether the business profile satisfies minimum criteria for player discovery
 */
export function checkIsDiscoverable(profile: Partial<BusinessProfile>): boolean {
  const hasName = Boolean(profile.businessName?.trim());
  const hasSports = Boolean(profile.categories && profile.categories.length > 0);
  const hasLocation = Boolean(profile.location?.pinCode?.trim());
  const hasHours = Boolean(profile.businessHours?.startTime && profile.businessHours?.endTime);
  const isSuspended = profile.status?.platformStatus === "SUSPENDED";

  return hasName && hasSports && hasLocation && hasHours && !isSuspended;
}

export async function getBusinessProfileByOwnerId(
  ownerId: string
): Promise<BusinessProfile | null> {
  if (!ownerId) return null;
  try {
    const q = query(
      collection(db, "businesses"),
      where("ownerId", "==", ownerId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      const data = docSnap.data();

      const startTime = data.businessHours?.startTime || "08:00";
      const endTime = data.businessHours?.endTime || "22:00";
      const operationalStatus =
        data.status?.operationalStatus ||
        (data.businessStatus === "closed" ? "CLOSED" : "OPEN");

      // Validate coordinates if present in legacy or structured doc
      const rawCoords = data.location?.coordinates;
      const validCoords = isValidCoordinates(rawCoords)
        ? { latitude: Number(rawCoords.latitude), longitude: Number(rawCoords.longitude) }
        : undefined;

      const profile: BusinessProfile = {
        businessId: docSnap.id,
        ownerId: data.ownerId,
        businessName: data.businessName || "",
        owner: {
          name: data.owner?.name || "",
          phone: data.owner?.phone || "",
          email: data.owner?.email || "",
        },
        description: data.description || "",
        logoUrl: data.media?.logo?.url || data.logoUrl || data.media?.logoUrl || "",
        coverImageUrl: data.media?.coverImage?.url || data.coverImageUrl || data.media?.coverImageUrl || "",
        media: {
          logo: data.media?.logo || (data.logoUrl ? { url: data.logoUrl, fileId: "" } : undefined),
          coverImage: data.media?.coverImage || (data.coverImageUrl ? { url: data.coverImageUrl, fileId: "" } : undefined),
          gallery: Array.isArray(data.media?.gallery)
            ? data.media.gallery.map((item: any, idx: number) =>
                typeof item === "string"
                  ? { url: item, fileId: `legacy_${idx}`, order: idx }
                  : item
              )
            : [],
          logoUrl: data.media?.logo?.url || data.logoUrl || data.media?.logoUrl || "",
          coverImageUrl: data.media?.coverImage?.url || data.coverImageUrl || data.media?.coverImageUrl || "",
        },
        categories: Array.isArray(data.categories) ? data.categories : [],
        location: {
          pinCode: data.location?.pinCode || "",
          address: data.location?.address || "",
          city: data.location?.city || "",
          state: data.location?.state || "",
          country: data.location?.country || "India",
          coordinates: validCoords,
          googleMaps: data.location?.googleMaps || {
            placeId: data.location?.googleMaps?.placeId || "",
            mapsUrl: data.location?.googleMaps?.mapsUrl || "",
            directionsUrl: data.location?.googleMaps?.directionsUrl || "",
          },
          hasCoordinates: Boolean(validCoords),
          isVerified: Boolean(data.location?.isVerified),
        },
        contact: {
          phone: data.contact?.phone || "",
          whatsapp: data.contact?.whatsapp || "",
          email: data.contact?.email || "",
        },
        social: {
          instagram: data.social?.instagram || "",
          website: data.social?.website || "",
        },
        businessHours: {
          startTime,
          endTime,
          timezone: data.businessHours?.timezone || "Asia/Kolkata",
          weeklySchedule:
            data.businessHours?.weeklySchedule ||
            buildWeeklyScheduleFromHours(startTime, endTime),
        },
        businessStatus: data.businessStatus === "closed" ? "closed" : "open",
        closedReason: data.closedReason || "",
        closedMessage:
          data.closedMessage ||
          "We are currently closed. Please check our business hours and visit us later.",
        status: {
          operationalStatus: (data.status?.operationalStatus as OperationalStatus) || operationalStatus,
          businessStatus: (data.status?.businessStatus as PlatformBusinessStatus) || (data.status?.platformStatus as PlatformBusinessStatus) || "ACTIVE",
          platformStatus: data.status?.platformStatus || "ACTIVE",
          verificationStatus: data.status?.verificationStatus || "UNVERIFIED",
        },
        courts: Array.isArray(data.courts)
          ? data.courts.map((c: any, index: number) => {
              const status: CourtStatus = c.status || (c.active === false ? "inactive" : "active");
              return {
                courtId: c.courtId || `court_${index + 1}`,
                name: c.name || `Court ${index + 1}`,
                sportId: c.sportId || "cricket",
                sportName: c.sportName || "Cricket",
                pricePerHour: Number(c.pricePerHour) || 800,
                status,
                slotDurationMinutes: c.slotDurationMinutes === 30 ? 30 : 60,
                active: status === "active",
                description: c.description || "",
              };
            })
          : [],
        slotDurationMinutes: data.slotDurationMinutes === 30 ? 30 : 60,
        onboardingCompleted: Boolean(data.onboardingCompleted),
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };

      // Calculate health & discoverability
      profile.profileCompletion = calculateProfileCompleteness(profile);
      profile.isDiscoverable = checkIsDiscoverable(profile);

      return profile;
    }
    return null;
  } catch (err) {
    console.warn("Could not fetch business profile:", err);
    return null;
  }
}

export async function saveBusinessProfile(
  profileData: Partial<BusinessProfile>
): Promise<string> {
  const currentUid = firebaseAuth.currentUser?.uid;
  if (!currentUid) {
    throw new Error("Unauthorized: User must be authenticated to save business profile.");
  }

  // Check if profile already exists for this owner
  const existing = await getBusinessProfileByOwnerId(currentUid);
  const businessId = existing?.businessId || profileData.businessId || `biz_${currentUid}`;
  const docRef = doc(db, "businesses", businessId);

  // Normalize contact and social strings
  const normOwnerPhone = normalizePhone(profileData.owner?.phone || existing?.owner?.phone || "");
  const normOwnerEmail = (profileData.owner?.email || existing?.owner?.email || "").trim().toLowerCase();
  const normContactPhone = normalizePhone(profileData.contact?.phone || normOwnerPhone);
  const normContactWhatsapp = normalizePhone(profileData.contact?.whatsapp || "");
  const normContactEmail = (profileData.contact?.email || normOwnerEmail).trim().toLowerCase();
  const normInstagram = normalizeInstagramHandle(profileData.social?.instagram || existing?.social?.instagram || "");
  const normWebsite = normalizeWebsiteUrl(profileData.social?.website || existing?.social?.website || "");

  // Normalize operating hours
  const startTime = (profileData.businessHours?.startTime || existing?.businessHours?.startTime || "08:00").trim();
  const endTime = (profileData.businessHours?.endTime || existing?.businessHours?.endTime || "22:00").trim();

  // Validate coordinates if provided
  const rawCoords = profileData.location?.coordinates || existing?.location?.coordinates;
  const validCoords = isValidCoordinates(rawCoords)
    ? { latitude: Number(rawCoords!.latitude), longitude: Number(rawCoords!.longitude) }
    : undefined;

  // Preserve and merge courts with stable identities
  const courtsToSave = (profileData.courts || existing?.courts || []).map((c, i) => ({
    courtId: c.courtId || `court_${Date.now()}_${i}`,
    name: c.name.trim(),
    sportId: c.sportId,
    sportName: c.sportName,
    pricePerHour: Math.max(0, Number(c.pricePerHour) || 0),
    slotDurationMinutes: c.slotDurationMinutes === 30 ? 30 : 60,
    active: c.active !== false,
  }));

  const operationalStatus =
    (profileData.businessStatus || existing?.businessStatus) === "closed" ? "CLOSED" : "OPEN";

  const payload: Record<string, any> = {
    businessId,
    ownerId: currentUid, // Authoritative ownerId from auth.currentUser
    businessName: (profileData.businessName || existing?.businessName || "").trim(),
    owner: {
      name: (profileData.owner?.name || existing?.owner?.name || "").trim(),
      phone: normOwnerPhone,
      email: normOwnerEmail,
    },
    description: (profileData.description !== undefined ? profileData.description : (existing?.description || "")).trim(),
    logoUrl:
      profileData.media?.logo?.url ||
      profileData.logoUrl ||
      existing?.media?.logo?.url ||
      existing?.logoUrl ||
      "",
    coverImageUrl:
      profileData.media?.coverImage?.url ||
      profileData.coverImageUrl ||
      existing?.media?.coverImage?.url ||
      existing?.coverImageUrl ||
      "",
    media: {
      logo:
        profileData.media?.logo ||
        existing?.media?.logo ||
        ((profileData.media?.logo?.url || profileData.logoUrl || existing?.logoUrl)
          ? {
              url: profileData.media?.logo?.url || profileData.logoUrl || existing?.logoUrl || "",
              fileId: profileData.media?.logo?.fileId || existing?.media?.logo?.fileId || "",
            }
          : undefined),
      coverImage:
        profileData.media?.coverImage ||
        existing?.media?.coverImage ||
        ((profileData.media?.coverImage?.url || profileData.coverImageUrl || existing?.coverImageUrl)
          ? {
              url: profileData.media?.coverImage?.url || profileData.coverImageUrl || existing?.coverImageUrl || "",
              fileId: profileData.media?.coverImage?.fileId || existing?.media?.coverImage?.fileId || "",
            }
          : undefined),
      gallery: profileData.media?.gallery || existing?.media?.gallery || [],
      logoUrl:
        profileData.media?.logo?.url ||
        profileData.logoUrl ||
        existing?.logoUrl ||
        "",
      coverImageUrl:
        profileData.media?.coverImage?.url ||
        profileData.coverImageUrl ||
        existing?.coverImageUrl ||
        "",
    },
    categories: profileData.categories || existing?.categories || [],
    courts: courtsToSave,
    slotDurationMinutes: profileData.slotDurationMinutes || existing?.slotDurationMinutes || 60,
    location: {
      pinCode: String(profileData.location?.pinCode || existing?.location?.pinCode || "").trim(),
      address: (profileData.location?.address || existing?.location?.address || "").trim(),
      city: (profileData.location?.city || existing?.location?.city || "").trim(),
      state: (profileData.location?.state || existing?.location?.state || "").trim(),
      country: profileData.location?.country || existing?.location?.country || "India",
      ...(validCoords ? { coordinates: validCoords } : {}),
      googleMaps: {
        placeId: profileData.location?.googleMaps?.placeId || existing?.location?.googleMaps?.placeId || "",
        mapsUrl: profileData.location?.googleMaps?.mapsUrl || existing?.location?.googleMaps?.mapsUrl || "",
        directionsUrl: profileData.location?.googleMaps?.directionsUrl || existing?.location?.googleMaps?.directionsUrl || "",
      },
      hasCoordinates: Boolean(validCoords),
      isVerified: existing?.location?.isVerified || false,
    },
    contact: {
      phone: normContactPhone,
      whatsapp: normContactWhatsapp,
      email: normContactEmail,
    },
    social: {
      instagram: normInstagram,
      website: normWebsite,
    },
    businessHours: {
      startTime,
      endTime,
      timezone: profileData.businessHours?.timezone || existing?.businessHours?.timezone || "Asia/Kolkata",
      weeklySchedule:
        profileData.businessHours?.weeklySchedule ||
        existing?.businessHours?.weeklySchedule ||
        buildWeeklyScheduleFromHours(startTime, endTime),
    },
    businessStatus: profileData.businessStatus || existing?.businessStatus || "open",
    closedReason: profileData.closedReason !== undefined ? profileData.closedReason : (existing?.closedReason || ""),
    closedMessage: profileData.closedMessage || existing?.closedMessage || "We are currently closed. Please check our business hours and visit us later.",
    status: {
      operationalStatus,
      platformStatus: existing?.status?.platformStatus || "ACTIVE",
      verificationStatus: existing?.status?.verificationStatus || "UNVERIFIED",
    },
    onboardingCompleted: true,
    updatedAt: serverTimestamp(),
  };

  // Compute profile completeness and discoverability flag
  const completeness = calculateProfileCompleteness(payload);
  payload.profileCompletion = completeness;
  payload.isDiscoverable = checkIsDiscoverable(payload);

  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    payload.createdAt = serverTimestamp();
    await setDoc(docRef, payload);
  } else {
    await updateDoc(docRef, payload);
  }

  return businessId;
}

export async function updateOperationalStatus(
  businessId: string,
  status: OperationalStatus,
  closedReason: string = "",
  closedMessage?: string
): Promise<void> {
  const currentUid = firebaseAuth.currentUser?.uid;
  if (!currentUid) {
    throw new Error("Unauthorized: User must be authenticated to update operational status.");
  }

  const docRef = doc(db, "businesses", businessId);
  const payload: Record<string, any> = {
    "status.operationalStatus": status,
    businessStatus: status === "CLOSED" ? "closed" : "open",
    closedReason: status !== "OPEN" ? closedReason.trim() : "",
    updatedAt: serverTimestamp(),
  };

  if (closedMessage !== undefined) {
    payload.closedMessage = closedMessage.trim();
  }

  await updateDoc(docRef, payload);
}

// Backwards-compatible alias for operational status updates
export const updateBusinessStatus = updateOperationalStatus;

export async function updatePlatformBusinessStatus(
  businessId: string,
  status: PlatformBusinessStatus
): Promise<void> {
  const currentUid = firebaseAuth.currentUser?.uid;
  if (!currentUid) {
    throw new Error("Unauthorized: User must be authenticated to update business status.");
  }

  const docRef = doc(db, "businesses", businessId);
  await updateDoc(docRef, {
    "status.businessStatus": status,
    "status.platformStatus": status,
    updatedAt: serverTimestamp(),
  });
}

export async function saveCourts(
  businessId: string,
  courts: VenueCourt[]
): Promise<void> {
  const currentUid = firebaseAuth.currentUser?.uid;
  if (!currentUid) {
    throw new Error("Unauthorized: User must be authenticated to save courts.");
  }

  const docRef = doc(db, "businesses", businessId);
  const normalizedCourts = courts.map((c, i) => {
    const status: CourtStatus = c.status || (c.active === false ? "inactive" : "active");
    return {
      courtId: c.courtId || `court_${Date.now()}_${i}`,
      name: c.name.trim(),
      sportId: c.sportId,
      sportName: c.sportName,
      pricePerHour: Math.max(0, Number(c.pricePerHour) || 0),
      status,
      slotDurationMinutes: c.slotDurationMinutes === 30 ? 30 : 60,
      active: status === "active",
      description: c.description || "",
    };
  });

  await updateDoc(docRef, {
    courts: normalizedCourts,
    updatedAt: serverTimestamp(),
  });
}

export async function saveCourt(
  businessId: string,
  court: VenueCourt
): Promise<void> {
  const currentUid = firebaseAuth.currentUser?.uid;
  if (!currentUid) {
    throw new Error("Unauthorized: User must be authenticated to save court.");
  }

  const docRef = doc(db, "businesses", businessId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    throw new Error("Business not found.");
  }

  const currentCourts: VenueCourt[] = Array.isArray(docSnap.data().courts)
    ? docSnap.data().courts
    : [];

  const status: CourtStatus = court.status || (court.active === false ? "inactive" : "active");
  const courtToSave: VenueCourt = {
    courtId: court.courtId || `court_${Date.now()}`,
    name: court.name.trim(),
    sportId: court.sportId,
    sportName: court.sportName,
    pricePerHour: Math.max(0, Number(court.pricePerHour) || 0),
    status,
    slotDurationMinutes: court.slotDurationMinutes === 30 ? 30 : 60,
    active: status === "active",
    description: court.description || "",
  };

  const existingIndex = currentCourts.findIndex((c) => c.courtId === courtToSave.courtId);
  let updatedCourts: VenueCourt[];
  if (existingIndex >= 0) {
    updatedCourts = [...currentCourts];
    updatedCourts[existingIndex] = courtToSave;
  } else {
    updatedCourts = [...currentCourts, courtToSave];
  }

  await updateDoc(docRef, {
    courts: updatedCourts,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCourt(
  businessId: string,
  courtId: string
): Promise<void> {
  const currentUid = firebaseAuth.currentUser?.uid;
  if (!currentUid) {
    throw new Error("Unauthorized: User must be authenticated to delete court.");
  }

  const docRef = doc(db, "businesses", businessId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    throw new Error("Business not found.");
  }

  const currentCourts: VenueCourt[] = Array.isArray(docSnap.data().courts)
    ? docSnap.data().courts
    : [];

  const updatedCourts = currentCourts.filter((c) => c.courtId !== courtId);

  await updateDoc(docRef, {
    courts: updatedCourts,
    updatedAt: serverTimestamp(),
  });
}

export async function updateWeeklySchedule(
  businessId: string,
  weeklySchedule: WeeklySchedule,
  generalHours?: { startTime: string; endTime: string }
): Promise<void> {
  const currentUid = firebaseAuth.currentUser?.uid;
  if (!currentUid) {
    throw new Error("Unauthorized: User must be authenticated to update schedule.");
  }

  const docRef = doc(db, "businesses", businessId);
  const payload: Record<string, any> = {
    "businessHours.weeklySchedule": weeklySchedule,
    updatedAt: serverTimestamp(),
  };

  if (generalHours?.startTime && generalHours?.endTime) {
    payload["businessHours.startTime"] = generalHours.startTime.trim();
    payload["businessHours.endTime"] = generalHours.endTime.trim();
  }

  await updateDoc(docRef, payload);
}

/**
 * Uploads an image file to ImageKit via our authenticated Next.js API route
 */
export async function uploadMediaFileViaApi(
  file: File,
  businessId: string,
  photoType: "logo" | "cover" | "gallery"
): Promise<BusinessImageItem> {
  const user = firebaseAuth.currentUser;
  if (!user) {
    throw new Error("Unauthorized: Please sign in to upload images.");
  }

  const idToken = await user.getIdToken();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("businessId", businessId);
  formData.append("photoType", photoType);

  const res = await fetch("/api/owner/media/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
    body: formData,
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || "Failed to upload image to ImageKit.");
  }

  return {
    url: json.data.url,
    fileId: json.data.fileId,
    name: json.data.name,
    thumbnailUrl: json.data.thumbnailUrl,
    createdAt: json.data.createdAt,
  };
}

/**
 * Deletes an image file from ImageKit via our authenticated Next.js API route
 */
export async function deleteMediaFileViaApi(
  businessId: string,
  fileId: string
): Promise<void> {
  if (!fileId || fileId.startsWith("legacy_")) return;

  const user = firebaseAuth.currentUser;
  if (!user) {
    throw new Error("Unauthorized: Please sign in to delete images.");
  }

  const idToken = await user.getIdToken();
  const res = await fetch("/api/owner/media/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ businessId, fileId }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    console.warn("ImageKit file deletion error:", json.error);
  }
}

/**
 * Uploads a business image (logo, cover, court) to Firebase Storage (legacy fallback)
 */
export async function uploadBusinessImage(
  file: File,
  folder: "logos" | "covers" | "courts" | string,
  ownerId: string
): Promise<string> {
  const extension = file.name.split(".").pop() || "jpg";
  const filename = `${folder}/${ownerId}_${Date.now()}.${extension}`;
  const storageRef = ref(storage, filename);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
}

