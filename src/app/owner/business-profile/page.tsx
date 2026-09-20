"use client";

import { useAuth } from "@/context/AuthContext";
import { BusinessProfileForm } from "@/components/owner/BusinessProfileForm";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Loader2 } from "lucide-react";

export default function BusinessProfilePage() {
  const { businessProfile, loadingBusinessProfile } = useAuth();

  if (loadingBusinessProfile) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-qc-lime" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <header className="border-b border-white/8 pb-6">
        <SectionLabel>Venue Management</SectionLabel>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="font-display text-4xl text-qc-white md:text-5xl">
            Business Profile
          </h1>
          <span className="border border-qc-lime/40 bg-qc-lime/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-qc-lime font-medium">
            Active Venue
          </span>
        </div>
        <p className="mt-2 text-sm text-qc-muted">
          Update your facility information, sports categories, operating PIN code, and branding photos.
        </p>
      </header>

      <BusinessProfileForm mode="edit" initialData={businessProfile} />
    </div>
  );
}
