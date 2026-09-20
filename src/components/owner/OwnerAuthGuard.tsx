"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function OwnerAuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, loadingBusinessProfile, hasCompletedOnboarding } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 1. If auth check finished and not logged in -> redirect to login
    if (!loading && !user) {
      router.replace("/owner/login");
      return;
    }

    // 2. If logged in and business profile check finished:
    if (!loading && user && !loadingBusinessProfile) {
      const isSetupPage = pathname === "/owner/business-profile/setup";

      // If owner has NOT completed onboarding and is trying to access dashboard or other owner pages:
      if (!hasCompletedOnboarding && !isSetupPage) {
        router.replace("/owner/business-profile/setup");
        return;
      }

      // If owner HAS completed onboarding and attempts to visit setup:
      if (hasCompletedOnboarding && isSetupPage) {
        router.replace("/owner/dashboard");
        return;
      }
    }
  }, [user, loading, loadingBusinessProfile, hasCompletedOnboarding, pathname, router]);

  if (loading || (user && loadingBusinessProfile)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-qc-black">
        <div className="text-center">
          <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center border border-qc-lime/30 bg-qc-charcoal">
            <span className="font-display text-2xl tracking-wider text-qc-lime">QC</span>
            <div className="absolute inset-0 animate-ping border border-qc-lime/40 opacity-30" />
          </div>
          <p className="font-display text-xl tracking-[0.2em] text-qc-white">
            QUICKCOURT
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-qc-muted">
            Checking venue & owner session...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Prevent flash of dashboard if onboarding is incomplete
  const isSetupPage = pathname === "/owner/business-profile/setup";
  if (!hasCompletedOnboarding && !isSetupPage) {
    return null;
  }

  if (hasCompletedOnboarding && isSetupPage) {
    return null;
  }

  return <>{children}</>;
}
