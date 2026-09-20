import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { pricingPlans } from "@/data/mock";
import { SubscriptionCard } from "@/components/ui/Cards";
import { SectionLabel } from "@/components/ui/SectionLabel";

export default function PricingPage() {
  return (
    <main className="bg-qc-black">
      <LandingNav />
      <section className="px-5 pb-24 pt-32 md:px-12 lg:px-20">
        <div className="mx-auto max-w-6xl">
          <SectionLabel>Pricing</SectionLabel>
          <h1 className="mt-6 font-display text-6xl md:text-8xl">
            Facility plans
          </h1>
          <p className="mt-4 text-qc-muted">
            14 day free trial. Players always free.
          </p>
          <div className="mt-14 grid gap-4 lg:grid-cols-3">
            {pricingPlans.map((p) => (
              <SubscriptionCard
                key={p.id}
                name={p.name}
                price={p.price}
                features={p.features}
                highlighted={"highlighted" in p && p.highlighted}
              />
            ))}
          </div>
        </div>
      </section>
      <LandingFooter />
    </main>
  );
}
