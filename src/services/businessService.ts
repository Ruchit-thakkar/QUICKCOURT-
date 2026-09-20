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
import type { BusinessProfile } from "@/types";

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
      return {
        businessId: docSnap.id,
        ownerId: data.ownerId,
        businessName: data.businessName || "",
        owner: {
          name: data.owner?.name || "",
          phone: data.owner?.phone || "",
          email: data.owner?.email || "",
        },
        description: data.description || "",
        logoUrl: data.logoUrl || "",
        coverImageUrl: data.coverImageUrl || "",
        categories: Array.isArray(data.categories) ? data.categories : [],
        location: {
          pinCode: data.location?.pinCode || "",
          address: data.location?.address || "",
          city: data.location?.city || "",
          state: data.location?.state || "",
          country: data.location?.country || "India",
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
        businessHours: data.businessHours
          ? {
              startTime: data.businessHours.startTime || "08:00",
              endTime: data.businessHours.endTime || "22:00",
            }
          : {
              startTime: "08:00",
              endTime: "22:00",
            },
        businessStatus: data.businessStatus === "closed" ? "closed" : "open",
        closedReason: data.closedReason || "",
        closedMessage:
          data.closedMessage ||
          "We are currently closed. Please check our business hours and visit us later.",
        courts: Array.isArray(data.courts) ? data.courts : [],
        slotDurationMinutes: data.slotDurationMinutes === 30 ? 30 : 60,
        onboardingCompleted: Boolean(data.onboardingCompleted),
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
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

  const payload: Record<string, any> = {
    businessId,
    ownerId: currentUid, // Authoritative ownerId from auth.currentUser
    businessName: profileData.businessName?.trim() || "",
    owner: {
      name: profileData.owner?.name?.trim() || "",
      phone: profileData.owner?.phone?.trim() || "",
      email: profileData.owner?.email?.trim() || "",
    },
    description: profileData.description?.trim() || "",
    logoUrl: profileData.logoUrl || "",
    coverImageUrl: profileData.coverImageUrl || "",
    categories: profileData.categories || [],
    courts: profileData.courts || existing?.courts || [],
    slotDurationMinutes: profileData.slotDurationMinutes || existing?.slotDurationMinutes || 60,
    location: {
      pinCode: String(profileData.location?.pinCode || "").trim(),
      address: profileData.location?.address?.trim() || "",
      city: profileData.location?.city?.trim() || "",
      state: profileData.location?.state?.trim() || "",
      country: profileData.location?.country || "India",
    },
    contact: {
      phone: profileData.contact?.phone?.trim() || profileData.owner?.phone?.trim() || "",
      whatsapp: profileData.contact?.whatsapp?.trim() || "",
      email: profileData.contact?.email?.trim() || profileData.owner?.email?.trim() || "",
    },
    social: {
      instagram: profileData.social?.instagram?.trim() || "",
      website: profileData.social?.website?.trim() || "",
    },
    businessHours: profileData.businessHours || existing?.businessHours || {
      startTime: "08:00",
      endTime: "22:00",
    },
    businessStatus: profileData.businessStatus || existing?.businessStatus || "open",
    closedReason: profileData.closedReason !== undefined ? profileData.closedReason : (existing?.closedReason || ""),
    closedMessage: profileData.closedMessage || existing?.closedMessage || "We are currently closed. Please check our business hours and visit us later.",
    onboardingCompleted: true,
    updatedAt: serverTimestamp(),
  };

  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    payload.createdAt = serverTimestamp();
    await setDoc(docRef, payload);
  } else {
    await updateDoc(docRef, payload);
  }

  return businessId;
}

export async function updateBusinessStatus(
  businessId: string,
  status: "open" | "closed",
  closedReason: string = ""
): Promise<void> {
  const currentUid = firebaseAuth.currentUser?.uid;
  if (!currentUid) {
    throw new Error("Unauthorized: User must be authenticated to update status.");
  }

  const docRef = doc(db, "businesses", businessId);
  await updateDoc(docRef, {
    businessStatus: status,
    closedReason: status === "closed" ? closedReason.trim() : "",
    updatedAt: serverTimestamp(),
  });
}

export async function updateBusinessHoursAndMessage(
  businessId: string,
  businessHours: { startTime: string; endTime: string },
  closedMessage: string
): Promise<void> {
  const currentUid = firebaseAuth.currentUser?.uid;
  if (!currentUid) {
    throw new Error("Unauthorized: User must be authenticated to update business hours.");
  }

  const docRef = doc(db, "businesses", businessId);
  await updateDoc(docRef, {
    businessHours: {
      startTime: businessHours.startTime.trim(),
      endTime: businessHours.endTime.trim(),
    },
    closedMessage: closedMessage.trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function uploadBusinessImage(
  file: File,
  folder: "logos" | "covers",
  ownerId: string
): Promise<string> {
  // Validate file type
  const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Only PNG, JPG, JPEG, and WEBP image formats are supported.");
  }

  // Validate size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image size must be under 5MB.");
  }

  try {
    const timestamp = Date.now();
    const ext = file.name.split(".").pop() || "jpg";
    const storageRef = ref(storage, `businesses/${ownerId}/${folder}/${timestamp}.${ext}`);
    const uploadResult = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(uploadResult.ref);
    return downloadUrl;
  } catch (storageError) {
    console.warn("Storage upload failed, attempting client dataURL fallback:", storageError);
    // Fallback: Convert small images (under 500KB) to data URL if Firebase Storage is uninitialized
    return new Promise((resolve, reject) => {
      if (file.size > 800 * 1024) {
        reject(new Error("Storage upload failed and image is too large for fallback. Please configure Firebase Storage."));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read image file."));
      reader.readAsDataURL(file);
    });
  }
}
