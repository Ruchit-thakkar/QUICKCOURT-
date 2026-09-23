"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function OwnerSlotsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/owner/bookings");
  }, [router]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-qc-muted">
      <Loader2 className="h-6 w-6 animate-spin text-qc-lime" />
      <p className="text-xs uppercase tracking-wider">Redirecting to Bookings...</p>
    </div>
  );
}
