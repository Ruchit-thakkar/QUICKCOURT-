import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";
import { UserCog, ArrowLeft } from "lucide-react";

export default function OwnerStaffPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <header className="border-b border-white/8 pb-6">
        <SectionLabel>Module Architecture</SectionLabel>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="font-display text-4xl text-qc-white md:text-5xl">
            Staff & Access Control
          </h1>
          <span className="border border-white/20 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-wider text-qc-muted font-medium">
            Prepared for Phase 2
          </span>
        </div>
        <p className="mt-2 text-sm text-qc-muted">
          Manage desk managers, coaches, referees, and role-based permissions.
        </p>
      </header>

      <div className="border border-white/10 bg-qc-charcoal p-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center border border-white/10 bg-qc-panel text-qc-muted">
          <UserCog className="h-6 w-6" />
        </div>
        <h3 className="mt-4 font-display text-3xl text-qc-white">
          Staff Permissions Architecture Ready
        </h3>
        <p className="mx-auto mt-2 max-w-md text-xs text-qc-muted leading-relaxed">
          Multi-user venue permissions (Manager, Front Desk, Coach) and WhatsApp check-in capabilities will be connected in Phase 2.
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
