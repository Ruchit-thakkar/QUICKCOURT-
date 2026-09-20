"use client";

import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { Settings, ArrowLeft, Shield, Mail, Key } from "lucide-react";

export default function OwnerSettingsPage() {
  const { user, ownerProfile } = useAuth();

  return (
    <div className="space-y-8 max-w-4xl">
      <header className="border-b border-white/8 pb-6">
        <SectionLabel>Account</SectionLabel>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="font-display text-4xl text-qc-white md:text-5xl">
            Owner & Venue Settings
          </h1>
          <span className="border border-white/20 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-wider text-qc-muted font-medium">
            Account Management
          </span>
        </div>
        <p className="mt-2 text-sm text-qc-muted">
          Security settings, notification preferences, and account credentials.
        </p>
      </header>

      <div className="border border-white/10 bg-qc-charcoal p-6 space-y-6">
        <div className="flex items-center gap-4 border-b border-white/8 pb-4">
          <div className="flex h-12 w-12 items-center justify-center border border-qc-lime/30 bg-qc-lime/10 text-qc-lime font-display text-xl">
            {ownerProfile?.name?.charAt(0) || user?.email?.charAt(0) || "O"}
          </div>
          <div>
            <h3 className="font-display text-2xl text-qc-white">
              {ownerProfile?.name || "Facility Owner"}
            </h3>
            <p className="text-xs text-qc-muted">{user?.email}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 text-xs">
          <div className="border border-white/10 bg-qc-panel p-4">
            <p className="flex items-center gap-2 text-qc-muted uppercase tracking-wider text-[10px]">
              <Mail className="h-3.5 w-3.5 text-qc-lime" /> Account Email
            </p>
            <p className="mt-2 font-medium text-qc-white">{user?.email}</p>
          </div>

          <div className="border border-white/10 bg-qc-panel p-4">
            <p className="flex items-center gap-2 text-qc-muted uppercase tracking-wider text-[10px]">
              <Shield className="h-3.5 w-3.5 text-qc-lime" /> Role / Authorization
            </p>
            <p className="mt-2 font-medium text-qc-lime capitalize">{ownerProfile?.role || "Owner"}</p>
          </div>

          <div className="border border-white/10 bg-qc-panel p-4">
            <p className="flex items-center gap-2 text-qc-muted uppercase tracking-wider text-[10px]">
              <Key className="h-3.5 w-3.5 text-qc-lime" /> Auth Provider
            </p>
            <p className="mt-2 font-medium text-qc-white capitalize">{ownerProfile?.authProvider || "Firebase Auth"}</p>
          </div>

          <div className="border border-white/10 bg-qc-panel p-4">
            <p className="flex items-center gap-2 text-qc-muted uppercase tracking-wider text-[10px]">
              <Settings className="h-3.5 w-3.5 text-qc-lime" /> User ID (UID)
            </p>
            <p className="mt-2 font-mono text-[11px] text-white/70 truncate">{user?.uid}</p>
          </div>
        </div>

        <div className="pt-4 flex justify-between items-center border-t border-white/8">
          <Button href="/owner/dashboard" variant="secondary" size="sm">
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Dashboard
          </Button>
          <span className="text-[10px] uppercase tracking-wider text-qc-muted">
            QuickCourt Owner Portal Phase 1
          </span>
        </div>
      </div>
    </div>
  );
}
