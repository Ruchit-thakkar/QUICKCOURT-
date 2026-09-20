import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";
import { flowSteps } from "@/data/mock";

export default function ForPlayersPage() {
  return (
    <main className="bg-qc-black">
      <LandingNav />
      <section className="px-5 pb-24 pt-32 md:px-12 lg:px-20">
        <div className="mx-auto max-w-5xl">
          <SectionLabel live>For players</SectionLabel>
          <h1 className="mt-6 font-display text-6xl leading-[0.9] md:text-8xl">
            Don&apos;t just book a court.
            <br />
            <span className="text-qc-lime">Find your game.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-qc-muted">
            Express how you want to play. Match with compatible players. Form
            the game. Then book the court.
          </p>
          <div className="mt-10">
            <Button href="/player" size="lg">
              Open player app
            </Button>
          </div>
          <div className="mt-16 grid gap-4 md:grid-cols-5">
            {flowSteps.map((s, i) => (
              <div key={s} className="border-t border-white/10 pt-4">
                <p className="text-qc-lime">0{i + 1}</p>
                <p className="mt-2 font-display text-xl">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <LandingFooter />
    </main>
  );
}
