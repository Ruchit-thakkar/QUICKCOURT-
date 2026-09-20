"use client";

import { cn } from "@/lib/cn";

export type MapMarker = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  kind: "facility" | "game" | "demand" | "quickfill";
};

/**
 * Dark premium map visualization.
 * Integration point: replace internals with Mapbox / Google Maps when API keys exist.
 *   NEXT_PUBLIC_MAPBOX_TOKEN
 */
export function MapView({
  markers,
  className,
  filters,
}: {
  markers: MapMarker[];
  className?: string;
  filters?: React.ReactNode;
}) {
  // Normalize Mumbai-ish coords into percentage positions for the demo map.
  const points = markers.map((m) => ({
    ...m,
    x: ((m.lng - 72.82) / 0.12) * 100,
    y: ((19.18 - m.lat) / 0.14) * 100,
  }));

  return (
    <div
      className={cn(
        "relative min-h-[420px] overflow-hidden border border-white/10 bg-[#0b0f0c]",
        className,
      )}
    >
      {filters && (
        <div className="absolute left-4 top-4 z-20 flex flex-wrap gap-2">
          {filters}
        </div>
      )}

      {/* Grid / road-like texture */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(rgba(200,245,66,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(200,245,66,0.05) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(5,5,5,0.75)_100%)]" />

      {/* Fake arterial roads */}
      <svg className="absolute inset-0 h-full w-full opacity-30" aria-hidden>
        <path
          d="M0 280 C120 240, 220 320, 400 260 S700 200, 900 240"
          stroke="rgba(245,245,240,0.25)"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M80 0 C140 160, 100 280, 180 520"
          stroke="rgba(245,245,240,0.18)"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M0 140 H900"
          stroke="rgba(200,245,66,0.12)"
          strokeWidth="1"
          fill="none"
        />
      </svg>

      {points.map((p) => (
        <div
          key={p.id}
          className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${Math.min(90, Math.max(10, p.x))}%`,
            top: `${Math.min(85, Math.max(15, p.y))}%`,
          }}
        >
          <div
            className={cn(
              "relative flex flex-col items-center",
              p.kind === "demand" && "text-qc-lime",
              p.kind === "quickfill" && "text-amber-300",
            )}
          >
            <span
              className={cn(
                "h-3 w-3 rounded-full",
                p.kind === "facility" && "bg-qc-lime shadow-[0_0_12px_rgba(200,245,66,0.6)]",
                p.kind === "game" && "bg-white",
                p.kind === "demand" && "bg-qc-lime/80",
                p.kind === "quickfill" && "bg-amber-300",
              )}
            />
            <span className="mt-2 whitespace-nowrap border border-white/10 bg-black/70 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white/80 backdrop-blur">
              {p.label}
            </span>
          </div>
        </div>
      ))}

      <div className="absolute bottom-4 left-4 z-20 text-[10px] uppercase tracking-[0.16em] text-white/35">
        Demo map · Mapbox-ready
      </div>
    </div>
  );
}
