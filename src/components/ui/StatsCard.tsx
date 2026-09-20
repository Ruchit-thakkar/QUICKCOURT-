import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/format";

export function StatsCard({
  label,
  value,
  hint,
  accent,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border border-white/8 bg-qc-panel/80 p-5 backdrop-blur-sm",
        accent && "border-qc-lime/25 bg-qc-lime/5",
        className,
      )}
    >
      <p className="text-[10px] uppercase tracking-[0.2em] text-qc-muted">
        {label}
      </p>
      <p
        className={cn(
          "mt-3 font-display text-4xl text-qc-white",
          accent && "text-qc-lime",
        )}
      >
        {typeof value === "number" && label.toLowerCase().includes("revenue")
          ? formatINR(value)
          : value}
      </p>
      {hint && <p className="mt-2 text-xs text-qc-dim">{hint}</p>}
    </div>
  );
}
