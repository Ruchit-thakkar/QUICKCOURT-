"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { saveBusinessProfile, uploadBusinessImage } from "@/services/businessService";
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
} from "lucide-react";
import type { BusinessProfile } from "@/types";

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

  // Media
  const [logoUrl, setLogoUrl] = useState(initialData?.logoUrl || "");
  const [coverImageUrl, setCoverImageUrl] = useState(initialData?.coverImageUrl || "");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

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
      setLogoUrl(initialData.logoUrl || "");
      setCoverImageUrl(initialData.coverImageUrl || "");
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

  // Image Upload Handlers
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingLogo(true);
    setGlobalError(null);
    try {
      const url = await uploadBusinessImage(file, "logos", user.uid);
      setLogoUrl(url);
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : "Failed to upload logo.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingCover(true);
    setGlobalError(null);
    try {
      const url = await uploadBusinessImage(file, "covers", user.uid);
      setCoverImageUrl(url);
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : "Failed to upload cover.");
    } finally {
      setUploadingCover(false);
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
      setCurrentStep(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const valid2 = validateStep2();
    if (!valid2) {
      setGlobalError("Please select at least one sports category in Step 2.");
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const valid3 = validateStep3();
    if (!valid3) {
      setGlobalError("Please enter a valid 6-digit PIN code in Step 3.");
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Validate Business Hours
    if (!startTime || !endTime) {
      setGlobalError("Please provide both opening and closing times.");
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
        logoUrl,
        coverImageUrl,
        categories: selectedCategories,
        location: {
          pinCode: pinCode.trim(),
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          country: "India",
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
        },
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

              {/* Media Uploads */}
              <div>
                <label className="block text-xs uppercase tracking-[0.14em] text-qc-muted">
                  Venue Logo (Optional)
                </label>
                <div className="mt-2 flex items-center gap-4">
                  {logoUrl ? (
                    <div className="relative h-16 w-16 overflow-hidden border border-qc-lime/40 bg-qc-panel">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={logoUrl}
                        alt="Venue logo"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setLogoUrl("")}
                        className="absolute right-0 top-0 bg-red-600/90 p-1 text-white hover:bg-red-700"
                        title="Remove logo"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center border border-dashed border-white/20 bg-qc-panel text-white/40 hover:border-qc-lime/50 hover:text-qc-lime transition">
                      {uploadingLogo ? (
                        <Loader2 className="h-4 w-4 animate-spin text-qc-lime" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      <span className="mt-1 text-[8px] uppercase">Upload</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                  <p className="text-[11px] text-qc-muted leading-tight">
                    PNG, JPG or WEBP up to 5MB. Appears on booking cards.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-[0.14em] text-qc-muted">
                  Cover Photo (Optional)
                </label>
                <div className="mt-2 flex items-center gap-4">
                  {coverImageUrl ? (
                    <div className="relative h-16 w-28 overflow-hidden border border-qc-lime/40 bg-qc-panel">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={coverImageUrl}
                        alt="Venue cover"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setCoverImageUrl("")}
                        className="absolute right-0 top-0 bg-red-600/90 p-1 text-white hover:bg-red-700"
                        title="Remove cover"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex h-16 w-28 cursor-pointer flex-col items-center justify-center border border-dashed border-white/20 bg-qc-panel text-white/40 hover:border-qc-lime/50 hover:text-qc-lime transition">
                      {uploadingCover ? (
                        <Loader2 className="h-4 w-4 animate-spin text-qc-lime" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      <span className="mt-1 text-[8px] uppercase">Upload</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handleCoverUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                  <p className="text-[11px] text-qc-muted leading-tight">
                    Landscape banner image for your arena profile.
                  </p>
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
                disabled={saving || uploadingLogo || uploadingCover}
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
      </form>
    </div>
  );
}
