import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";
import { Boxes, ArrowLeft } from "lucide-react";

export default function OwnerInventoryPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <header className="border-b border-white/8 pb-6">
        <SectionLabel>Module Architecture</SectionLabel>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="font-display text-4xl text-qc-white md:text-5xl">
            Court & Equipment Inventory
          </h1>
          <span className="border border-white/20 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-wider text-qc-muted font-medium">
            Prepared for Phase 2
          </span>
        </div>
        <p className="mt-2 text-sm text-qc-muted">
          Track racket rentals, shuttlecock packs, court maintenance supplies, and lighting status.
        </p>
      </header>

      <div className="border border-white/10 bg-qc-charcoal p-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center border border-white/10 bg-qc-panel text-qc-muted">
          <Boxes className="h-6 w-6" />
        </div>
        <h3 className="mt-4 font-display text-3xl text-qc-white">
          Inventory Architecture Ready
        </h3>
        <p className="mx-auto mt-2 max-w-md text-xs text-qc-muted leading-relaxed">
          The data model for equipment tracking, low-stock notifications, and rental gear billing is scheduled for implementation in Phase 2.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button href="/owner/dashboard" variant="secondary" size="sm">
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
