import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";
import { quickFillFlow } from "@/data/mock";

export default function ForFacilitiesPage() {
  return (
    <main className="bg-qc-black">
      <LandingNav />
      <section className="px-5 pb-24 pt-32 md:px-12 lg:px-20">
        <div className="mx-auto max-w-5xl">
          <SectionLabel>For facilities</SectionLabel>
          <h1 className="mt-6 font-display text-6xl leading-[0.9] md:text-8xl">
            Turn empty hours
            <br />
            into playing hours.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-qc-muted">
            Manage courts, slots, bookings, and recover lost capacity with
            QuickFill demand intelligence.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button href="/owner" size="lg">
              Open owner OS
            </Button>
            <Button href="/pricing" variant="secondary" size="lg">
              View pricing
            </Button>
          </div>
          <div className="mt-16 flex flex-wrap gap-3">
            {quickFillFlow.map((s, i) => (
              <span
                key={s}
                className="border border-white/12 px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-qc-muted"
              >
                {i + 1}. {s}
              </span>
            ))}
          </div>
        </div>
      </section>
      <LandingFooter />
    </main>
  );
}
