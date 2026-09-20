import { cn } from "@/lib/cn";

export function AsyncStateView({
  state,
  error,
  emptyMessage = "Nothing here yet.",
  children,
  className,
}: {
  state: "idle" | "loading" | "error" | "empty" | "success";
  error?: string | null;
  emptyMessage?: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (state === "loading" || state === "idle") {
    return (
      <div
        className={cn(
          "flex min-h-[120px] items-center justify-center text-sm text-qc-muted",
          className,
        )}
      >
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 animate-pulse rounded-full bg-qc-lime" />
          Loading…
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div
        className={cn(
          "flex min-h-[120px] items-center justify-center border border-red-500/20 bg-red-500/5 px-4 text-sm text-red-300",
          className,
        )}
      >
        {error ?? "Something went wrong. Please try again."}
      </div>
    );
  }

  if (state === "empty") {
    return (
      <div
        className={cn(
          "flex min-h-[120px] items-center justify-center text-sm text-qc-muted",
          className,
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  return <>{children}</>;
}
