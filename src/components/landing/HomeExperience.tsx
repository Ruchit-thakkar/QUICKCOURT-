"use client";

import dynamic from "next/dynamic";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { ProductTransition } from "@/components/landing/ProductTransition";
import { DemandPool } from "@/components/landing/DemandPool";
import { GameMatchingSection } from "@/components/landing/GameMatchingSection";
import { FacilityMatchingSection } from "@/components/landing/FacilityMatchingSection";
import { BookingFlow } from "@/components/landing/BookingFlow";
import { QuickFillSection } from "@/components/landing/QuickFillSection";

const CinematicHero = dynamic(
  () =>
    import("@/components/cinematic/CinematicHero").then((m) => m.CinematicHero),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[100svh] items-center justify-center bg-qc-black">
        <p className="font-display text-4xl text-white/20">QUICKCOURT</p>
      </div>
    ),
  },
);

export function HomeExperience() {
  return (
    <main className="bg-qc-black">
      <LandingNav />
      <CinematicHero />
      <ProductTransition />
      <DemandPool />
      <GameMatchingSection />
      <FacilityMatchingSection />
      <BookingFlow />
      <QuickFillSection />
      <LandingFooter />
    </main>
  );
}
