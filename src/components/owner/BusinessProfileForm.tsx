"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  saveBusinessProfile,
  uploadMediaFileViaApi,
  deleteMediaFileViaApi,
} from "@/services/businessService";
import { validateImageFile, validateImageBatch } from "@/lib/imageValidation";
import { getImageKitUrl, IMAGE_PRESETS } from "@/lib/imagekit";
import { Button } from "@/components/ui/Button";
import {
  Building2,
  Phone,
  Mail,
  User,
  MapPin,
  FileText,
  Upload,
  X,
  Check,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Globe,
  MessageSquare,
  Clock,
  Plus,
  Trash2,
  Star,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import type { BusinessProfile, VenueCourt, BusinessImageItem } from "@/types";

export interface SportOption {
  id: string;
  name: string;
  emoji: string;
  categoryGroup: string;
}

export const ALL_SPORTS_CATEGORIES: SportOption[] = [
  { id: "cricket", name: "Cricket", emoji: "🏏", categoryGroup: "Team Sports" },
  { id: "football", name: "Football", emoji: "⚽", categoryGroup: "Team Sports" },
  { id: "futsal", name: "Futsal", emoji: "🥅", categoryGroup: "Team Sports" },
  { id: "basketball", name: "Basketball", emoji: "🏀", categoryGroup: "Team Sports" },
  { id: "tennis", name: "Tennis", emoji: "🎾", categoryGroup: "Racket Sports" },
  { id: "badminton", name: "Badminton", emoji: "🏸", categoryGroup: "Racket Sports" },
  { id: "table_tennis", name: "Table Tennis", emoji: "🏓", categoryGroup: "Racket Sports" },
  { id: "pickleball", name: "Pickleball", emoji: "🏓", categoryGroup: "Racket Sports" },
  { id: "volleyball", name: "Volleyball", emoji: "🏐", categoryGroup: "Team Sports" },
  { id: "box_cricket", name: "Box Cricket", emoji: "🏏", categoryGroup: "Turf & Court" },
  { id: "hockey", name: "Hockey", emoji: "🏑", categoryGroup: "Team Sports" },
  { id: "swimming", name: "Swimming", emoji: "🏊", categoryGroup: "Aquatics & Fitness" },
  { id: "kabaddi", name: "Kabaddi", emoji: "🤼", categoryGroup: "Traditional & Combat" },
  { id: "gym_fitness", name: "Gym / Fitness", emoji: "🏋️", categoryGroup: "Aquatics & Fitness" },
  { id: "other", name: "Other Sports", emoji: "🎯", categoryGroup: "Specialty" },
];

interface BusinessProfileFormProps {
  mode: "setup" | "edit";
  initialData?: BusinessProfile | null;
  onSuccess?: () => void;
}

export function BusinessProfileForm({
  mode,
  initialData,
  onSuccess,
}: BusinessProfileFormProps) {
  const router = useRouter();
  const { user, ownerProfile, refreshBusinessProfile } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);

  // Form Fields
  const [businessName, setBusinessName] = useState(initialData?.businessName || "");
  const [ownerName, setOwnerName] = useState(
    initialData?.owner?.name || ownerProfile?.name || user?.displayName || ""
  );
  const [phone, setPhone] = useState(
    initialData?.owner?.phone || initialData?.contact?.phone || ""
  );
  const [email, setEmail] = useState(
    initialData?.owner?.email || initialData?.contact?.email || user?.email || ""
  );
  const [description, setDescription] = useState(initialData?.description || "");

  // Media State
  const [logo, setLogo] = useState<BusinessImageItem | null>(() => {
    if (initialData?.media?.logo) return initialData.media.logo;
    if (initialData?.logoUrl) return { url: initialData.logoUrl, fileId: "" };
    return null;
  });
  const [coverImage, setCoverImage] = useState<BusinessImageItem | null>(() => {
    if (initialData?.media?.coverImage) return initialData.media.coverImage;
    if (initialData?.coverImageUrl) return { url: initialData.coverImageUrl, fileId: "" };
    return null;
  });
  const [gallery, setGallery] = useState<BusinessImageItem[]>(() => {
    if (Array.isArray(initialData?.media?.gallery)) {
      return initialData.media.gallery.map((g, idx) =>
        typeof g === "string" ? { url: g, fileId: `legacy_${idx}`, order: idx } : g
      );
    }
    return [];
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<
    Array<{
      id: string;
      file: File;
      previewUrl: string;
      status: "preparing" | "uploading" | "uploaded" | "failed";
      error?: string;
    }>
  >([]);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [deleteConfirmPhoto, setDeleteConfirmPhoto] = useState<BusinessImageItem | null>(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

  // Sports Categories (Array of IDs)
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialData?.categories && initialData.categories.length > 0
      ? initialData.categories
      : []
  );

  // Location
  const [pinCode, setPinCode] = useState(initialData?.location?.pinCode || "");
  const [address, setAddress] = useState(initialData?.location?.address || "");
  const [city, setCity] = useState(initialData?.location?.city || "");
  const [state, setState] = useState(initialData?.location?.state || "");

  // Social & Additional Contact
  const [whatsapp, setWhatsapp] = useState(initialData?.contact?.whatsapp || "");
  const [website, setWebsite] = useState(initialData?.social?.website || "");
  const [instagram, setInstagram] = useState(initialData?.social?.instagram || "");

  // Business Hours & Closed Message
  const [startTime, setStartTime] = useState(
    initialData?.businessHours?.startTime || "08:00"
  );
  const [endTime, setEndTime] = useState(
    initialData?.businessHours?.endTime || "22:00"
  );
  const [closedMessage, setClosedMessage] = useState(
    initialData?.closedMessage ||
      "We are currently closed. Please check our business hours and visit us later."
  );

  // Courts / Grounds & Slot Duration
  const [courts, setCourts] = useState<VenueCourt[]>(
    Array.isArray(initialData?.courts) && initialData.courts.length > 0
      ? initialData.courts
      : []
  );
  const [slotDurationMinutes, setSlotDurationMinutes] = useState<30 | 60>(
    initialData?.slotDurationMinutes === 30 ? 30 : 60
  );

  // New Court input draft state
  const [newCourtName, setNewCourtName] = useState("");
  const [newCourtSportId, setNewCourtSportId] = useState("");
  const [newCourtPrice, setNewCourtPrice] = useState("800");
  const [courtError, setCourtError] = useState<string | null>(null);

  // Submission & Validation States
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync initialData if updated externally
  useEffect(() => {
    if (initialData) {
      setBusinessName(initialData.businessName || "");
      setOwnerName(initialData.owner?.name || "");
      setPhone(initialData.owner?.phone || "");
      setEmail(initialData.owner?.email || "");
      setDescription(initialData.description || "");
      if (initialData.media?.logo) {
        setLogo(initialData.media.logo);
      } else if (initialData.logoUrl) {
        setLogo({ url: initialData.logoUrl, fileId: "" });
      } else {
        setLogo(null);
      }

      if (initialData.media?.coverImage) {
        setCoverImage(initialData.media.coverImage);
      } else if (initialData.coverImageUrl) {
        setCoverImage({ url: initialData.coverImageUrl, fileId: "" });
      } else {
        setCoverImage(null);
      }

      if (Array.isArray(initialData.media?.gallery)) {
        setGallery(
          initialData.media.gallery.map((g, idx) =>
            typeof g === "string" ? { url: g, fileId: `legacy_${idx}`, order: idx } : g
          )
        );
      } else {
        setGallery([]);
      }
      setSelectedCategories(initialData.categories || []);
      setPinCode(initialData.location?.pinCode || "");
      setAddress(initialData.location?.address || "");
      setCity(initialData.location?.city || "");
      setState(initialData.location?.state || "");
      setWhatsapp(initialData.contact?.whatsapp || "");
      setWebsite(initialData.social?.website || "");
      setInstagram(initialData.social?.instagram || "");
      if (initialData.businessHours) {
        setStartTime(initialData.businessHours.startTime || "08:00");
        setEndTime(initialData.businessHours.endTime || "22:00");
      }
      if (initialData.closedMessage) {
        setClosedMessage(initialData.closedMessage);
      }
      if (Array.isArray(initialData.courts)) {
        setCourts(initialData.courts);
      }
      if (initialData.slotDurationMinutes) {
        setSlotDurationMinutes(initialData.slotDurationMinutes);
      }
    }
  }, [initialData]);

  // Validation functions
  const validateStep1 = () => {
    const errors: Record<string, string> = {};
    if (!businessName.trim()) {
      errors.businessName = "Business / Ground Name is required.";
    }
    if (!ownerName.trim()) {
      errors.ownerName = "Owner Name is required.";
    }
    const cleanPhone = phone.trim().replace(/[\s-]/g, "");
    if (!cleanPhone) {
      errors.phone = "Phone number is required.";
    } else if (cleanPhone.length < 7 || cleanPhone.length > 15) {
      errors.phone = "Please enter a valid phone number (at least 7 to 15 digits).";
    }
    if (!email.trim()) {
      errors.email = "Business email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Please enter a valid email address.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = () => {
    const errors: Record<string, string> = {};
    if (!selectedCategories || selectedCategories.length === 0) {
      errors.categories = "Please select at least one sports category.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep3 = () => {
    const errors: Record<string, string> = {};
    const trimmedPin = pinCode.trim();
    if (!trimmedPin) {
      errors.pinCode = "PIN Code is required.";
    } else if (!/^\d{6}$/.test(trimmedPin)) {
      errors.pinCode = "PIN Code must be exactly 6 numeric digits (e.g., 380001).";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    setGlobalError(null);
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
      } else {
        setGlobalError("Please fill in all required fields in Step 1 (Business Name, Owner Name, Phone, and Email).");
      }
    } else if (currentStep === 2) {
      if (validateStep2()) {
        setCurrentStep(3);
      } else {
        setGlobalError("Please select at least 1 sports category to continue.");
      }
    }
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) => {
      const exists = prev.includes(categoryId);
      const updated = exists
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId];
      if (updated.length > 0 && fieldErrors.categories) {
        setFieldErrors((curr) => {
          const next = { ...curr };
          delete next.categories;
          return next;
        });
      }
      return updated;
    });
  };

  const handleAddCourt = () => {
    setCourtError(null);
    const trimmedName = newCourtName.trim();
    if (!trimmedName) {
      setCourtError("Please enter a Court / Ground name (e.g. Pitch A, Court 1).");
      return;
    }
    const duplicate = courts.some(
      (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      setCourtError(`A court named "${trimmedName}" already exists.`);
      return;
    }

    const sportIdToUse = newCourtSportId || selectedCategories[0] || "cricket";
    const foundSport = ALL_SPORTS_CATEGORIES.find((s) => s.id === sportIdToUse);
    const sportName = foundSport ? foundSport.name : sportIdToUse;

    const newCourt: VenueCourt = {
      courtId: `court_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: trimmedName,
      sportId: sportIdToUse,
      sportName,
      pricePerHour: Math.max(0, Number(newCourtPrice) || 800),
      slotDurationMinutes,
      active: true,
    };

    setCourts((prev) => [...prev, newCourt]);
    setNewCourtName("");
  };

  const handleRemoveCourt = (courtId: string) => {
    setCourts((prev) => prev.filter((c) => c.courtId !== courtId));
  };

  // Image Upload Handlers (ImageKit via authenticated API)
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setGlobalError(validation.error || "Invalid logo image.");
      return;
    }

    setUploadingLogo(true);
    setGlobalError(null);
    try {
      const bizId = initialData?.businessId || `biz_${user.uid}`;
      const uploaded = await uploadMediaFileViaApi(file, bizId, "logo");
      if (logo?.fileId) {
        deleteMediaFileViaApi(bizId, logo.fileId).catch(() => {});
      }
      setLogo(uploaded);
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : "Failed to upload logo.");
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  const handleRemoveLogo = async () => {
    if (!logo) return;
    const bizId = initialData?.businessId || `biz_${user?.uid}`;
    if (logo.fileId) {
      deleteMediaFileViaApi(bizId, logo.fileId).catch(() => {});
    }
    setLogo(null);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setGlobalError(validation.error || "Invalid cover image.");
      return;
    }

    setUploadingCover(true);
    setGlobalError(null);
    try {
      const bizId = initialData?.businessId || `biz_${user.uid}`;
      const uploaded = await uploadMediaFileViaApi(file, bizId, "cover");
      if (coverImage?.fileId) {
        deleteMediaFileViaApi(bizId, coverImage.fileId).catch(() => {});
      }
      setCoverImage(uploaded);
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : "Failed to upload cover.");
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  };

  const handleRemoveCover = async () => {
    if (!coverImage) return;
    const bizId = initialData?.businessId || `biz_${user?.uid}`;
    if (coverImage.fileId) {
      deleteMediaFileViaApi(bizId, coverImage.fileId).catch(() => {});
    }
    setCoverImage(null);
  };

  const handleSetAsCover = (item: BusinessImageItem) => {
    setCoverImage(item);
  };

  // Multiple Gallery Files Selection
  const handleSelectGalleryFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    const validation = validateImageBatch(selected, gallery.length);
    if (!validation.valid) {
      setGlobalError(validation.error || "Invalid photos selected.");
      return;
    }

    setGlobalError(null);
    const newItems = selected.map((f) => ({
      id: `${f.name}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      file: f,
      previewUrl: URL.createObjectURL(f),
      status: "preparing" as const,
    }));

    setUploadQueue((prev) => [...prev, ...newItems]);
    e.target.value = "";
  };

  const handleRemoveFromQueue = (queueId: string) => {
    setUploadQueue((prev) => {
      const target = prev.find((i) => i.id === queueId);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.id !== queueId);
    });
  };

  const handleClearQueue = () => {
    uploadQueue.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    setUploadQueue([]);
  };

  const handleUploadQueue = async () => {
    if (uploadQueue.length === 0 || !user) return;
    setIsUploadingGallery(true);
    setGlobalError(null);
    const bizId = initialData?.businessId || `biz_${user.uid}`;
    const uploadedList: BusinessImageItem[] = [];

    for (const item of uploadQueue) {
      if (item.status === "uploaded") continue;

      setUploadQueue((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: "uploading" } : i))
      );

      try {
        const uploaded = await uploadMediaFileViaApi(item.file, bizId, "gallery");
        uploaded.order = gallery.length + uploadedList.length;
        uploadedList.push(uploaded);

        setUploadQueue((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: "uploaded" } : i))
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setUploadQueue((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: "failed", error: msg } : i))
        );
      }
    }

    if (uploadedList.length > 0) {
      setGallery((prev) => [...prev, ...uploadedList]);
      if (!coverImage && uploadedList.length > 0) {
        setCoverImage(uploadedList[0]);
      }
    }

    setIsUploadingGallery(false);
    setTimeout(() => {
      setUploadQueue((prev) => prev.filter((i) => i.status !== "uploaded"));
    }, 1200);
  };

  const handleMoveGalleryPhoto = (index: number, direction: "left" | "right") => {
    const target = direction === "left" ? index - 1 : index + 1;
    if (target < 0 || target >= gallery.length) return;

    setGallery((prev) => {
      const copy = [...prev];
      const item = copy[index];
      copy[index] = copy[target];
      copy[target] = item;
      return copy.map((p, idx) => ({ ...p, order: idx }));
    });
  };

  const handleConfirmDeletePhoto = async () => {
    if (!deleteConfirmPhoto || !user) return;
    const bizId = initialData?.businessId || `biz_${user.uid}`;
    setDeletingPhotoId(deleteConfirmPhoto.fileId);

    try {
      if (deleteConfirmPhoto.fileId) {
        await deleteMediaFileViaApi(bizId, deleteConfirmPhoto.fileId);
      }

      setGallery((prev) =>
        prev
          .filter(
            (p) =>
              p.fileId !== deleteConfirmPhoto.fileId &&
              p.url !== deleteConfirmPhoto.url
          )
          .map((p, idx) => ({ ...p, order: idx }))
      );

      if (coverImage?.url === deleteConfirmPhoto.url) {
        const remaining = gallery.filter((p) => p.url !== deleteConfirmPhoto.url);
        setCoverImage(remaining[0] || null);
      }

      setDeleteConfirmPhoto(null);
    } catch (err: unknown) {
      console.error("Delete photo error:", err);
      setGlobalError(err instanceof Error ? err.message : "Failed to delete photo.");
    } finally {
      setDeletingPhotoId(null);
    }
  };

  // Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);
    setSavedSuccess(false);

    // Validate all required steps
    const valid1 = validateStep1();
    if (!valid1) {
      setGlobalError("Please complete Step 1: Business name, owner name, valid phone and email are required.");
      return;
    }
    const valid3 = validateStep3();
    if (!valid3) {
      setGlobalError("Please complete Step 3: PIN Code and street address are required.");
      return;
    }
    if (selectedCategories.length === 0) {
      setGlobalError("Please select at least one sports category in Step 2.");
      return;
    }
    if (courts.length === 0) {
      setGlobalError("Please configure at least one court or ground in Step 4.");
      return;
    }
    if (startTime === endTime) {
      setGlobalError("Opening time and closing time cannot be the same.");
      return;
    }

    if (!user) {
      setGlobalError("You must be signed in to save your venue profile. Please log in again.");
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<BusinessProfile> = {
        businessName: businessName.trim(),
        owner: {
          name: ownerName.trim(),
          phone: phone.trim(),
          email: email.trim(),
        },
        description: description.trim(),
        logoUrl: logo?.url || "",
        coverImageUrl: coverImage?.url || "",
        media: {
          logo: logo || undefined,
          coverImage: coverImage || undefined,
          gallery: gallery.map((item, idx) => ({ ...item, order: idx })),
          logoUrl: logo?.url || "",
          coverImageUrl: coverImage?.url || "",
        },
        categories: selectedCategories,
        location: {
          pinCode: pinCode.trim(),
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          country: "India",
          coordinates: initialData?.location?.coordinates,
          googleMaps: initialData?.location?.googleMaps,
        },
        contact: {
          phone: phone.trim(),
          whatsapp: whatsapp.trim(),
          email: email.trim(),
        },
        social: {
          instagram: instagram.trim(),
          website: website.trim(),
        },
        businessHours: {
          startTime: startTime.trim(),
          endTime: endTime.trim(),
          weeklySchedule: initialData?.businessHours?.weeklySchedule,
        },
        courts: courts,
        slotDurationMinutes: slotDurationMinutes,
        closedMessage: closedMessage.trim() || "We are currently closed. Please check our business hours and visit us later.",
      };

      await saveBusinessProfile(payload);
      await refreshBusinessProfile();
      setSavedSuccess(true);

      if (onSuccess) {
        onSuccess();
      } else if (mode === "setup") {
        // Setup completion: redirect to owner dashboard
        window.location.href = "/owner/dashboard";
      } else {
        // Edit mode: stay on business profile page and show success notification
        window.scrollTo({ top: 0, behavior: "smooth" });
        setTimeout(() => setSavedSuccess(false), 5000);
      }
    } catch (err: unknown) {
      console.error("saveBusinessProfile error:", err);
      setGlobalError(
        err instanceof Error
          ? err.message
          : "Business profile could not be saved. Please check details and try again."
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      {/* Onboarding Step Progress Header (Setup mode) */}
      {mode === "setup" && (
        <div className="border-b border-white/10 pb-6">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.24em] text-qc-lime font-medium">
              Venue Onboarding · Step {currentStep} of 3
            </span>
            <span className="border border-qc-lime/30 bg-qc-lime/10 px-2 py-0.5 text-[9px] uppercase tracking-wider text-qc-lime">
              Initial Setup
            </span>
          </div>
          <h1 className="mt-2 font-display text-4xl text-qc-white md:text-5xl">
            Set Up Your Sports Venue
          </h1>
          <p className="mt-1 text-sm text-qc-muted">
            Configure your business profile, sports categories, and location to launch your venue on QuickCourt.
          </p>

          {/* Stepper bar */}
          <div className="mt-6 grid grid-cols-3 gap-2">
            {[
              { step: 1, label: "Business Information" },
              { step: 2, label: "Sports & Categories" },
              { step: 3, label: "Location & PIN" },
            ].map((s) => (
              <button
                type="button"
                key={s.step}
                onClick={() => {
                  if (s.step < currentStep) setCurrentStep(s.step);
                  else if (s.step === 2 && validateStep1()) setCurrentStep(2);
                  else if (s.step === 3 && validateStep1() && validateStep2()) setCurrentStep(3);
                }}
                className={`flex flex-col border-t-2 pt-2 text-left transition ${
                  currentStep === s.step
                    ? "border-qc-lime text-qc-lime"
                    : currentStep > s.step
                    ? "border-white/40 text-white/80"
                    : "border-white/10 text-white/30"
                }`}
              >
                <span className="text-[9px] uppercase tracking-wider">Step 0{s.step}</span>
                <span className="truncate text-xs font-medium">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Global error banner */}
      {globalError && (
        <div className="flex items-start gap-3 border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{globalError}</span>
        </div>
      )}

      {/* Success banner */}
      {savedSuccess && (
        <div className="flex items-start gap-3 border border-qc-lime/30 bg-qc-lime/10 p-4 text-xs text-qc-lime">
          <Check className="h-4 w-4 shrink-0 text-qc-lime" />
          <span>
            {mode === "setup"
              ? "Business profile saved successfully! Redirecting..."
              : "Business profile and operating schedule updated successfully!"}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* STEP 1: Business Information */}
        {(mode === "edit" || currentStep === 1) && (
          <section className="border border-white/10 bg-qc-charcoal p-6 md:p-8 space-y-6">
            <div className="border-b border-white/8 pb-4">
              <h2 className="font-display text-2xl text-qc-white">
                1. Business & Owner Details
              </h2>
              <p className="mt-0.5 text-xs text-qc-muted">
                Essential contact details and public name for your venue.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {/* Business Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs uppercase tracking-[0.14em] text-qc-muted">
                  Business / Ground Name *
                </label>
                <div className="mt-1.5 flex items-center border border-white/15 bg-qc-panel px-3 py-2.5 focus-within:border-qc-lime">
                  <Building2 className="mr-2 h-4 w-4 text-white/40" />
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => {
                      setBusinessName(e.target.value);
                      if (fieldErrors.businessName) {
                        setFieldErrors((prev) => ({ ...prev, businessName: "" }));
                      }
                    }}
                    placeholder="QuickCourt Sports Arena"
                    className="w-full bg-transparent text-sm text-qc-white placeholder:text-white/25 focus:outline-none"
                  />
                </div>
                {fieldErrors.businessName && (
                  <p className="mt-1 text-xs text-red-400">{fieldErrors.businessName}</p>
                )}
              </div>

              {/* Owner Name */}
              <div>
                <label className="block text-xs uppercase tracking-[0.14em] text-qc-muted">
                  Owner Name *
                </label>
                <div className="mt-1.5 flex items-center border border-white/15 bg-qc-panel px-3 py-2.5 focus-within:border-qc-lime">
                  <User className="mr-2 h-4 w-4 text-white/40" />
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => {
                      setOwnerName(e.target.value);
                      if (fieldErrors.ownerName) {
                        setFieldErrors((prev) => ({ ...prev, ownerName: "" }));
                      }
                    }}
                    placeholder="Ruchit Thakkar"
                    className="w-full bg-transparent text-sm text-qc-white placeholder:text-white/25 focus:outline-none"
                  />
                </div>
                {fieldErrors.ownerName && (
                  <p className="mt-1 text-xs text-red-400">{fieldErrors.ownerName}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs uppercase tracking-[0.14em] text-qc-muted">
                  Phone Number *
                </label>
                <div className="mt-1.5 flex items-center border border-white/15 bg-qc-panel px-3 py-2.5 focus-within:border-qc-lime">
                  <Phone className="mr-2 h-4 w-4 text-white/40" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (fieldErrors.phone) {
                        setFieldErrors((prev) => ({ ...prev, phone: "" }));
                      }
                    }}
                    placeholder="+91 98765 43210"
                    className="w-full bg-transparent text-sm text-qc-white placeholder:text-white/25 focus:outline-none"
                  />
                </div>
                {fieldErrors.phone && (
                  <p className="mt-1 text-xs text-red-400">{fieldErrors.phone}</p>
                )}
              </div>

              {/* Email */}
              <div className="sm:col-span-2">
                <label className="block text-xs uppercase tracking-[0.14em] text-qc-muted">
                  Business Email *
                </label>
                <div className="mt-1.5 flex items-center border border-white/15 bg-qc-panel px-3 py-2.5 focus-within:border-qc-lime">
                  <Mail className="mr-2 h-4 w-4 text-white/40" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) {
                        setFieldErrors((prev) => ({ ...prev, email: "" }));
                      }
                    }}
                    placeholder="contact@quickcourt-arena.com"
                    className="w-full bg-transparent text-sm text-qc-white placeholder:text-white/25 focus:outline-none"
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-400">{fieldErrors.email}</p>
                )}
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="block text-xs uppercase tracking-[0.14em] text-qc-muted">
                  Business Description (Optional)
                </label>
                <div className="mt-1.5 flex border border-white/15 bg-qc-panel p-3 focus-within:border-qc-lime">
                  <FileText className="mr-2 h-4 w-4 shrink-0 text-white/40 mt-0.5" />
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Premier sports arena with high-grade turf, floodlights, and professional locker facilities."
                    className="w-full bg-transparent text-sm text-qc-white placeholder:text-white/25 focus:outline-none resize-none"
                  />
                </div>
              </div>

              {/* Comprehensive Media & Photos Management */}
              <div className="sm:col-span-2 border-t border-white/8 pt-6 space-y-6">
                <div>
                  <h3 className="font-display text-xl text-qc-white flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-qc-lime" />
                    <span>Business Media & Photos</span>
                  </h3>
                  <p className="mt-1 text-xs text-qc-muted">
                    Manage your business logo, primary cover photo, and gallery pictures powered by ImageKit CDN.
                  </p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  {/* 1. Business Logo */}
                  <div className="border border-white/10 bg-qc-panel/60 p-4">
                    <label className="block text-xs uppercase tracking-[0.14em] text-qc-muted font-semibold">
                      Business Logo
                    </label>
                    <div className="mt-3 flex items-start gap-4">
                      {logo?.url ? (
                        <div className="relative h-20 w-20 shrink-0 border border-qc-lime/50 bg-qc-charcoal overflow-hidden shadow-md">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getImageKitUrl(logo.url, IMAGE_PRESETS.LOGO)}
                            alt="Business Logo"
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            className="absolute right-0 top-0 bg-red-600/90 p-1 text-white hover:bg-red-700 transition"
                            title="Remove logo"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex h-20 w-20 shrink-0 cursor-pointer flex-col items-center justify-center border border-dashed border-white/20 bg-qc-charcoal text-white/40 hover:border-qc-lime/50 hover:text-qc-lime transition">
                          {uploadingLogo ? (
                            <Loader2 className="h-5 w-5 animate-spin text-qc-lime" />
                          ) : (
                            <Upload className="h-5 w-5" />
                          )}
                          <span className="mt-1 text-[8px] font-bold uppercase">Upload</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            onChange={handleLogoUpload}
                            disabled={uploadingLogo}
                            className="hidden"
                          />
                        </label>
                      )}

                      <div className="space-y-2">
                        <p className="text-xs text-white/80">
                          {logo?.url ? "Logo is uploaded and active." : "Upload your official venue logo."}
                        </p>
                        <p className="text-[11px] text-qc-muted leading-tight">
                          JPG, PNG, or WEBP up to 5MB. Appears as your avatar across player discovery cards and bookings.
                        </p>
                        {logo?.url && (
                          <label className="inline-flex cursor-pointer items-center gap-1.5 border border-white/20 bg-qc-charcoal px-2.5 py-1 text-[11px] font-semibold text-white/80 hover:border-qc-lime/50 hover:text-qc-lime transition">
                            {uploadingLogo ? (
                              <Loader2 className="h-3 w-3 animate-spin text-qc-lime" />
                            ) : (
                              <Upload className="h-3 w-3" />
                            )}
                            <span>Change Logo</span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,image/webp"
                              onChange={handleLogoUpload}
                              disabled={uploadingLogo}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2. Cover Image */}
                  <div className="border border-white/10 bg-qc-panel/60 p-4">
                    <label className="block text-xs uppercase tracking-[0.14em] text-qc-muted font-semibold">
                      Cover Photo
                    </label>
                    <div className="mt-3 flex items-start gap-4">
                      {coverImage?.url ? (
                        <div className="relative h-20 w-32 shrink-0 border border-qc-lime/50 bg-qc-charcoal overflow-hidden shadow-md">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getImageKitUrl(coverImage.url, IMAGE_PRESETS.CARD)}
                            alt="Venue Cover"
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveCover}
                            className="absolute right-0 top-0 bg-red-600/90 p-1 text-white hover:bg-red-700 transition"
                            title="Remove cover"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex h-20 w-32 shrink-0 cursor-pointer flex-col items-center justify-center border border-dashed border-white/20 bg-qc-charcoal text-white/40 hover:border-qc-lime/50 hover:text-qc-lime transition">
                          {uploadingCover ? (
                            <Loader2 className="h-5 w-5 animate-spin text-qc-lime" />
                          ) : (
                            <Upload className="h-5 w-5" />
                          )}
                          <span className="mt-1 text-[8px] font-bold uppercase">Upload Banner</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            onChange={handleCoverUpload}
                            disabled={uploadingCover}
                            className="hidden"
                          />
                        </label>
                      )}

                      <div className="space-y-2">
                        <p className="text-xs text-white/80">
                          {coverImage?.url
                            ? "Custom cover photo active."
                            : "Landscape banner photo for your venue hero."}
                        </p>
                        <p className="text-[11px] text-qc-muted leading-tight">
                          If left empty, your first gallery photo is automatically used as the cover banner.
                        </p>
                        {coverImage?.url && (
                          <label className="inline-flex cursor-pointer items-center gap-1.5 border border-white/20 bg-qc-charcoal px-2.5 py-1 text-[11px] font-semibold text-white/80 hover:border-qc-lime/50 hover:text-qc-lime transition">
                            {uploadingCover ? (
                              <Loader2 className="h-3 w-3 animate-spin text-qc-lime" />
                            ) : (
                              <Upload className="h-3 w-3" />
                            )}
                            <span>Change Cover</span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,image/webp"
                              onChange={handleCoverUpload}
                              disabled={uploadingCover}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Business Gallery Photos */}
                <div className="border border-white/10 bg-qc-panel/60 p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/8 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase tracking-[0.14em] text-qc-white font-bold">
                          Business Photos Gallery
                        </span>
                        <span className="border border-qc-lime/30 bg-qc-lime/10 px-2 py-0.5 text-[10px] font-bold text-qc-lime font-mono">
                          {gallery.length} / 30
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-qc-muted">
                        Photos of your grounds, turfs, lighting, seating, and facilities.
                      </p>
                    </div>

                    {/* Multi-Photo Input Trigger */}
                    <label className="inline-flex cursor-pointer items-center justify-center gap-2 border border-qc-lime bg-qc-lime px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-qc-black hover:bg-qc-lime/90 transition shadow-sm">
                      <Plus className="h-4 w-4" />
                      <span>Add Photos (1–10)</span>
                      <input
                        type="file"
                        multiple
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handleSelectGalleryFiles}
                        disabled={isUploadingGallery}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* PRE-UPLOAD QUEUE SECTION */}
                  {uploadQueue.length > 0 && (
                    <div className="border border-qc-lime/30 bg-qc-charcoal/80 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-qc-lime uppercase tracking-wider">
                          Ready to Upload ({uploadQueue.length} {uploadQueue.length === 1 ? "photo" : "photos"})
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleClearQueue}
                            disabled={isUploadingGallery}
                            className="text-xs text-white/50 hover:text-red-400 transition"
                          >
                            Cancel
                          </button>
                          <Button
                            type="button"
                            onClick={handleUploadQueue}
                            disabled={isUploadingGallery}
                            size="sm"
                            className="gap-1.5"
                          >
                            {isUploadingGallery ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span>Uploading...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="h-3.5 w-3.5" />
                                <span>Upload Now</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                        {uploadQueue.map((item) => (
                          <div
                            key={item.id}
                            className="relative border border-white/10 bg-qc-panel p-2 flex flex-col items-center text-center group"
                          >
                            <div className="relative aspect-square w-full overflow-hidden bg-black/40 mb-1.5">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.previewUrl}
                                alt={item.file.name}
                                className="h-full w-full object-cover"
                              />
                              {item.status === "uploading" && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                  <Loader2 className="h-5 w-5 animate-spin text-qc-lime" />
                                </div>
                              )}
                              {item.status === "uploaded" && (
                                <div className="absolute inset-0 bg-emerald-950/80 flex items-center justify-center">
                                  <Check className="h-6 w-6 text-emerald-400 font-bold" />
                                </div>
                              )}
                              {item.status === "failed" && (
                                <div className="absolute inset-0 bg-red-950/80 flex flex-col items-center justify-center p-1">
                                  <AlertCircle className="h-5 w-5 text-red-400 mb-0.5" />
                                  <span className="text-[9px] text-red-300 line-clamp-1">{item.error || "Failed"}</span>
                                </div>
                              )}
                            </div>

                            <span className="truncate w-full text-[10px] text-white/80 font-mono">
                              {item.file.name}
                            </span>
                            <span className="text-[9px] text-qc-muted">
                              {(item.file.size / (1024 * 1024)).toFixed(1)} MB
                            </span>

                            {item.status === "preparing" && (
                              <button
                                type="button"
                                onClick={() => handleRemoveFromQueue(item.id)}
                                className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 shadow hover:bg-red-700"
                                title="Remove from queue"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* UPLOADED PHOTOS GRID */}
                  {gallery.length === 0 ? (
                    <div className="border border-dashed border-white/10 bg-qc-charcoal/40 p-8 text-center">
                      <ImageIcon className="mx-auto h-8 w-8 text-white/20 mb-2" />
                      <p className="text-xs font-semibold text-white/70">No photos uploaded yet</p>
                      <p className="mt-1 text-[11px] text-white/40 max-w-sm mx-auto">
                        Add photos of your playing surfaces, lighting, changing rooms, and amenities to attract more player bookings.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {gallery.map((photo, index) => {
                        const isCover = coverImage?.url === photo.url;
                        return (
                          <div
                            key={photo.fileId || photo.url}
                            className="group relative border border-white/10 bg-qc-charcoal overflow-hidden hover:border-qc-lime/40 transition"
                          >
                            <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/40">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={getImageKitUrl(photo.url, IMAGE_PRESETS.THUMB)}
                                alt={`Venue photo ${index + 1}`}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />

                              {/* Badges */}
                              <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 z-10">
                                <span className="bg-black/80 px-1.5 py-0.5 text-[9px] font-mono text-white/70">
                                  #{index + 1}
                                </span>
                                {isCover && (
                                  <span className="inline-flex items-center gap-1 border border-qc-lime/50 bg-qc-black/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-qc-lime">
                                    <Star className="h-2.5 w-2.5 fill-qc-lime text-qc-lime" />
                                    <span>Cover</span>
                                  </span>
                                )}
                              </div>

                              {/* Action Overlay */}
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                                <div className="flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmPhoto(photo)}
                                    className="bg-red-600/90 p-1 text-white hover:bg-red-700 transition"
                                    title="Delete photo"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>

                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      disabled={index === 0}
                                      onClick={() => handleMoveGalleryPhoto(index, "left")}
                                      className="border border-white/20 bg-black/80 p-1 text-white hover:border-qc-lime hover:text-qc-lime disabled:opacity-30 disabled:hover:border-white/20 disabled:hover:text-white"
                                      title="Move Left"
                                    >
                                      <ChevronLeft className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={index === gallery.length - 1}
                                      onClick={() => handleMoveGalleryPhoto(index, "right")}
                                      className="border border-white/20 bg-black/80 p-1 text-white hover:border-qc-lime hover:text-qc-lime disabled:opacity-30 disabled:hover:border-white/20 disabled:hover:text-white"
                                      title="Move Right"
                                    >
                                      <ChevronRight className="h-3.5 w-3.5" />
                                    </button>
                                  </div>

                                  {!isCover && (
                                    <button
                                      type="button"
                                      onClick={() => handleSetAsCover(photo)}
                                      className="border border-white/20 bg-black/80 px-2 py-1 text-[10px] font-semibold text-white/90 hover:border-qc-lime hover:text-qc-lime"
                                      title="Set as venue cover"
                                    >
                                      Set Cover
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {mode === "setup" && (
              <div className="pt-4 flex justify-end">
                <Button
                  type="button"
                  onClick={handleNextStep}
                  size="md"
                  className="gap-2"
                >
                  <span>Continue to Sports</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </section>
        )}

        {/* STEP 2: Sports Categories */}
        {(mode === "edit" || currentStep === 2) && (
          <section className="border border-white/10 bg-qc-charcoal p-6 md:p-8 space-y-6">
            <div className="border-b border-white/8 pb-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl text-qc-white">
                  2. Sports & Category Selection *
                </h2>
                <span className="text-xs text-qc-lime font-medium">
                  {selectedCategories.length} selected
                </span>
              </div>
              <p className="mt-0.5 text-xs text-qc-muted">
                Select one or multiple sports hosted at your facility. You can update this at any time.
              </p>
            </div>

            {fieldErrors.categories && (
              <div className="flex items-center gap-2 border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{fieldErrors.categories}</span>
              </div>
            )}

            {/* Visual Chip Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {ALL_SPORTS_CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat.id);
                return (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={`relative flex flex-col items-center justify-center border p-4 text-center transition-all ${
                      isSelected
                        ? "border-qc-lime bg-qc-lime/15 text-qc-white shadow-[0_0_15px_rgba(200,245,66,0.15)]"
                        : "border-white/10 bg-qc-panel text-white/70 hover:border-white/25 hover:bg-qc-panel/80 hover:text-white"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-qc-lime text-qc-black">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                    )}
                    <span className="text-2xl">{cat.emoji}</span>
                    <span className="mt-2 text-xs font-medium tracking-wide">
                      {cat.name}
                    </span>
                    <span className="mt-0.5 text-[8px] uppercase tracking-wider text-qc-muted">
                      {cat.categoryGroup}
                    </span>
                  </button>
                );
              })}
            </div>

            {mode === "setup" && (
              <div className="pt-4 flex justify-between">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCurrentStep(1)}
                  size="md"
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </Button>
                <Button
                  type="button"
                  onClick={handleNextStep}
                  size="md"
                  className="gap-2"
                >
                  <span>Continue to Location</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </section>
        )}

        {/* STEP 3: Location & PIN */}
        {(mode === "edit" || currentStep === 3) && (
          <section className="border border-white/10 bg-qc-charcoal p-6 md:p-8 space-y-6">
            <div className="border-b border-white/8 pb-4">
              <h2 className="font-display text-2xl text-qc-white">
                3. Venue Location & Postal PIN Code *
              </h2>
              <p className="mt-0.5 text-xs text-qc-muted">
                Required for localized player matchmaking and QuickFill radius discovery.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {/* PIN Code */}
              <div>
                <label className="block text-xs uppercase tracking-[0.14em] text-qc-muted">
                  PIN Code (6 digits) *
                </label>
                <div className="mt-1.5 flex items-center border border-white/15 bg-qc-panel px-3 py-2.5 focus-within:border-qc-lime">
                  <MapPin className="mr-2 h-4 w-4 text-white/40" />
                  <input
                    type="text"
                    maxLength={6}
                    value={pinCode}
                    onChange={(e) => {
                      // Allow only digits
                      const val = e.target.value.replace(/\D/g, "");
                      setPinCode(val);
                      if (fieldErrors.pinCode) {
                        setFieldErrors((prev) => ({ ...prev, pinCode: "" }));
                      }
                    }}
                    placeholder="380001"
                    className="w-full bg-transparent font-mono text-sm tracking-widest text-qc-white placeholder:text-white/25 focus:outline-none"
                  />
                </div>
                {fieldErrors.pinCode && (
                  <p className="mt-1 text-xs text-red-400">{fieldErrors.pinCode}</p>
                )}
                <p className="mt-1 text-[11px] text-qc-muted">
                  Must be exactly 6 numeric digits (e.g., 380001 or 560001).
                </p>
              </div>

              {/* City */}
              <div>
                <label className="block text-xs uppercase tracking-[0.14em] text-qc-muted">
                  City / Area
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ahmedabad"
                  className="mt-1.5 w-full border border-white/15 bg-qc-panel px-4 py-2.5 text-sm text-qc-white placeholder:text-white/25 focus:border-qc-lime focus:outline-none"
                />
              </div>

              {/* Address */}
              <div className="sm:col-span-2">
                <label className="block text-xs uppercase tracking-[0.14em] text-qc-muted">
                  Full Street Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Plot 104, Near Sports Complex Road, Opp. Central Garden"
                  className="mt-1.5 w-full border border-white/15 bg-qc-panel px-4 py-2.5 text-sm text-qc-white placeholder:text-white/25 focus:border-qc-lime focus:outline-none"
                />
              </div>

              {/* Socials & Additional Contact (Optional) */}
              <div>
                <label className="block text-xs uppercase tracking-[0.14em] text-qc-muted">
                  WhatsApp (Optional)
                </label>
                <div className="mt-1.5 flex items-center border border-white/15 bg-qc-panel px-3 py-2.5 focus-within:border-qc-lime">
                  <MessageSquare className="mr-2 h-4 w-4 text-white/40" />
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-transparent text-sm text-qc-white placeholder:text-white/25 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-[0.14em] text-qc-muted">
                  Instagram Handle / Profile
                </label>
                <div className="mt-1.5 flex items-center border border-white/15 bg-qc-panel px-3 py-2.5 focus-within:border-qc-lime">
                  <Globe className="mr-2 h-4 w-4 text-white/40" />
                  <input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="@quickcourtarena"
                    className="w-full bg-transparent text-sm text-qc-white placeholder:text-white/25 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Business Hours Section */}
            <div className="pt-6 border-t border-white/8 space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-qc-lime" />
                  <h3 className="font-display text-lg text-qc-white">
                    Business Hours
                  </h3>
                </div>
                <p className="mt-0.5 text-xs text-qc-muted">
                  Standard daily operational schedule (stored in HH:mm 24-hour format).
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs uppercase tracking-[0.14em] text-qc-muted">
                    Opening Time *
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      if (globalError) setGlobalError(null);
                    }}
                    className="mt-1.5 w-full border border-white/15 bg-qc-panel px-4 py-2.5 font-mono text-sm text-qc-white focus:border-qc-lime focus:outline-none"
                    required
                  />
                  <p className="mt-1 text-[11px] text-qc-muted">
                    Standard morning start time (e.g. 08:00 AM)
                  </p>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-[0.14em] text-qc-muted">
                    Closing Time *
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => {
                      setEndTime(e.target.value);
                      if (globalError) setGlobalError(null);
                    }}
                    className="mt-1.5 w-full border border-white/15 bg-qc-panel px-4 py-2.5 font-mono text-sm text-qc-white focus:border-qc-lime focus:outline-none"
                    required
                  />
                  <p className="mt-1 text-[11px] text-qc-muted">
                    Standard evening end time (e.g. 10:00 PM)
                  </p>
                </div>
              </div>
            </div>

            {/* Courts / Grounds & Slot Duration Configuration */}
            <div className="pt-6 border-t border-white/8 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="font-display text-lg text-qc-white">
                    Courts & Grounds Management
                  </h3>
                  <p className="text-xs text-qc-muted">
                    Add specific courts, pitches, or grounds for player bookings and schedule slots.
                  </p>
                </div>

                {/* Slot Duration Preference */}
                <div className="flex items-center gap-2 border border-white/10 bg-qc-panel px-3 py-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-qc-muted">Slot Duration:</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSlotDurationMinutes(30);
                        setCourts((prev) => prev.map((c) => ({ ...c, slotDurationMinutes: 30 })));
                      }}
                      className={`px-2.5 py-1 text-xs font-mono transition ${
                        slotDurationMinutes === 30
                          ? "bg-qc-lime text-qc-black font-semibold"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      30 min (1/2 h)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSlotDurationMinutes(60);
                        setCourts((prev) => prev.map((c) => ({ ...c, slotDurationMinutes: 60 })));
                      }}
                      className={`px-2.5 py-1 text-xs font-mono transition ${
                        slotDurationMinutes === 60
                          ? "bg-qc-lime text-qc-black font-semibold"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      60 min (1 h)
                    </button>
                  </div>
                </div>
              </div>

              {/* Add New Court Bar */}
              <div className="border border-white/10 bg-qc-panel/60 p-4 space-y-3">
                <span className="text-[10px] uppercase tracking-[0.16em] text-qc-lime font-medium">
                  + Add Court / Ground
                </span>
                <div className="grid gap-3 sm:grid-cols-4">
                  {/* Court Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] uppercase tracking-wider text-qc-muted">
                      Court / Ground Name *
                    </label>
                    <input
                      type="text"
                      value={newCourtName}
                      onChange={(e) => {
                        setNewCourtName(e.target.value);
                        if (courtError) setCourtError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.stopPropagation();
                          handleAddCourt();
                        }
                      }}
                      placeholder="e.g. Main Turf A, Court 1"
                      className="mt-1 w-full border border-white/15 bg-qc-panel px-3 py-2 text-xs text-qc-white focus:border-qc-lime focus:outline-none"
                    />
                  </div>

                  {/* Sport selection (restricted to owner's selected categories) */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-qc-muted">
                      Sport *
                    </label>
                    <select
                      value={newCourtSportId || (selectedCategories[0] || "cricket")}
                      onChange={(e) => setNewCourtSportId(e.target.value)}
                      className="mt-1 w-full border border-white/15 bg-qc-panel px-2.5 py-2 text-xs text-qc-white focus:border-qc-lime focus:outline-none"
                    >
                      {selectedCategories.length === 0 ? (
                        <option value="cricket">Cricket (Select sports in Step 2)</option>
                      ) : (
                        selectedCategories.map((catId) => {
                          const s = ALL_SPORTS_CATEGORIES.find((item) => item.id === catId);
                          return (
                            <option key={catId} value={catId} className="bg-qc-panel text-white">
                              {s ? `${s.emoji} ${s.name}` : catId}
                            </option>
                          );
                        })
                      )}
                    </select>
                  </div>

                  {/* Price per hour */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-qc-muted">
                      Price / Hour (₹)
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={newCourtPrice}
                        onChange={(e) => setNewCourtPrice(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.stopPropagation();
                            handleAddCourt();
                          }
                        }}
                        placeholder="800"
                        className="w-full border border-white/15 bg-qc-panel px-3 py-2 font-mono text-xs text-qc-white focus:border-qc-lime focus:outline-none"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddCourt}
                        className="shrink-0 gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {courtError && (
                  <p className="text-xs text-red-400">{courtError}</p>
                )}
              </div>

              {/* Courts List */}
              <div className="space-y-2">
                {courts.length === 0 ? (
                  <div className="border border-dashed border-white/15 bg-qc-panel/30 p-4 text-center">
                    <p className="text-xs text-qc-muted">
                      No specific courts configured yet. You can add Court / Ground names above (e.g. &ldquo;Pitch 1&rdquo;, &ldquo;Court A&rdquo;) to manage bookings individually.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {courts.map((court, index) => (
                      <div
                        key={court.courtId || index}
                        className="flex items-center justify-between border border-white/10 bg-qc-panel px-3.5 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-xs text-qc-white truncate">
                              {court.name}
                            </span>
                            <span className="border border-qc-lime/30 bg-qc-lime/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-qc-lime">
                              {court.sportName}
                            </span>
                          </div>
                          <p className="mt-0.5 font-mono text-[11px] text-qc-muted">
                            ₹{court.pricePerHour}/hr · {slotDurationMinutes === 30 ? "30 min" : "1 hr"} slots
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCourt(court.courtId)}
                          className="ml-2 text-white/40 hover:text-red-400 transition p-1"
                          title="Remove court"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Closed Business Message Section */}
            <div className="pt-6 border-t border-white/8 space-y-3">
              <div>
                <label className="block text-xs uppercase tracking-[0.14em] text-qc-muted">
                  Closed Business Message
                </label>
                <p className="mt-0.5 text-xs text-qc-muted">
                  Message shown to players and staff whenever the venue is manually switched to CLOSED.
                </p>
              </div>

              <textarea
                rows={3}
                value={closedMessage}
                onChange={(e) => setClosedMessage(e.target.value)}
                placeholder="We are currently closed. Please check our business hours and visit us later."
                className="w-full border border-white/15 bg-qc-panel px-4 py-2.5 text-sm text-qc-white placeholder:text-white/25 focus:border-qc-lime focus:outline-none"
              />
            </div>

            {globalError && (
              <div className="flex items-start gap-3 border border-red-500/30 bg-red-500/15 p-4 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-red-200">Unable to complete setup</p>
                  <p>{globalError}</p>
                </div>
              </div>
            )}

            <div className="pt-6 border-t border-white/8 flex flex-col sm:flex-row justify-between items-center gap-4">
              {mode === "setup" && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCurrentStep(2)}
                  size="md"
                  className="gap-2 w-full sm:w-auto"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </Button>
              )}

              <Button
                type="submit"
                disabled={
                  saving ||
                  uploadingLogo ||
                  uploadingCover ||
                  isUploadingGallery ||
                  uploadQueue.some((i) => i.status === "uploading")
                }
                size="lg"
                className="gap-2 w-full sm:w-auto"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving Business Profile...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-qc-black" />
                    <span>{mode === "setup" ? "Complete Setup & Launch Dashboard" : "Save Changes"}</span>
                  </>
                )}
              </Button>
            </div>
          </section>
        )}

        {/* Delete Photo Confirmation Modal */}
        {deleteConfirmPhoto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md border border-white/20 bg-qc-panel p-6 shadow-2xl space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 text-red-400">
                  <Trash2 className="h-5 w-5" />
                  <h3 className="font-display text-lg text-qc-white">Delete Business Photo?</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmPhoto(null)}
                  disabled={deletingPhotoId !== null}
                  className="text-white/40 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="relative aspect-[16/9] w-full overflow-hidden border border-white/10 bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={deleteConfirmPhoto.url}
                  alt="Photo to delete"
                  className="h-full w-full object-cover"
                />
              </div>

              <p className="text-xs text-qc-muted leading-relaxed">
                This photo will be permanently deleted from ImageKit CDN and removed from your business profile. This action cannot be undone.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmPhoto(null)}
                  disabled={deletingPhotoId !== null}
                  className="border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/70 hover:border-white/40 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeletePhoto}
                  disabled={deletingPhotoId !== null}
                  className="inline-flex items-center gap-1.5 border border-red-500/50 bg-red-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-red-700 disabled:opacity-50 transition"
                >
                  {deletingPhotoId !== null ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete Photo</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
