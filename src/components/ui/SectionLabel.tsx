import { cn } from "@/lib/cn";

export function SectionLabel({
  children,
  className,
  live,
}: {
  children: React.ReactNode;
  className?: string;
  live?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-qc-muted",
        className,
      )}
    >
      {live && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-qc-lime opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-qc-lime" />
        </span>
      )}
      {children}
    </div>
  );
}
