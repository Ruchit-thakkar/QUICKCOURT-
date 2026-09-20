"use client";

import { usePathname } from "next/navigation";
import { OwnerSidebar, OwnerMobileNav } from "@/components/owner/OwnerSidebar";
import { OwnerAuthGuard } from "@/components/owner/OwnerAuthGuard";

export function OwnerLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/owner/login" || pathname === "/owner/signup";
  const isSetupPage = pathname === "/owner/business-profile/setup";

  if (isAuthPage) {
    return <>{children}</>;
  }

  // First-time onboarding setup page has a clean, focused layout without the full dashboard sidebar
  if (isSetupPage) {
    return (
      <OwnerAuthGuard>
        <div className="min-h-screen bg-qc-black text-qc-white">
          <main className="w-full mx-auto px-4 py-8 md:py-12">
            {children}
          </main>
        </div>
      </OwnerAuthGuard>
    );
  }

  return (
    <OwnerAuthGuard>
      <div className="flex min-h-screen bg-qc-black text-qc-white">
        <OwnerSidebar />
        <div className="flex flex-1 flex-col min-w-0 overflow-x-hidden">
          <OwnerMobileNav />
          <main className="flex-1 px-4 py-6 md:px-8 md:py-8 max-w-[1600px] w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </OwnerAuthGuard>
  );
}
