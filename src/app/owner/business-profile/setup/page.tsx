"use client";

import { useAuth } from "@/context/AuthContext";
import { BusinessProfileForm } from "@/components/owner/BusinessProfileForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function OwnerBusinessSetupPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-4xl py-6 md:py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-qc-muted transition hover:text-qc-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> QuickCourt Network
        </Link>
        <span className="font-mono text-xs text-qc-muted">
          Authenticated: {user?.email}
        </span>
      </div>

      <BusinessProfileForm mode="setup" />
    </div>
  );
}
