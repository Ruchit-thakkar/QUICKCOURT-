"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Heart, ArrowRight, Clock } from "lucide-react";
import { formatINR } from "@/lib/format";
import { formatDistance } from "@/lib/geo";
import { getVenueOperationalInfo } from "@/lib/operationalStatus";
import { getImageKitUrl, IMAGE_PRESETS } from "@/lib/imagekit";
import type { BusinessProfile } from "@/types";
import { cn } from "@/lib/cn";

interface VenueDiscoveryCardProps {
  business: BusinessProfile;
  distanceKm?: number | null;
  isFavorite?: boolean;
  onToggleFavorite?: (businessId: string, newState: boolean) => void;
  className?: string;
}

export function VenueDiscoveryCard({
  business,
  distanceKm,
  isFavorite = false,
  onToggleFavorite,
  className,
}: VenueDiscoveryCardProps) {
  const [favoriteActive, setFavoriteActive] = useState(isFavorite);
  const [imgLoaded, setImgLoaded] = useState(true);

  // Operational status info
  const opInfo = getVenueOperationalInfo(business);

  // Calculate starting price from active courts
  const activeCourts = (business.courts || []).filter(
    (c) => c.status === "active" || c.active !== false
  );
  const startingPrice =
    activeCourts.length > 0
      ? Math.min(...activeCourts.map((c) => Number(c.pricePerHour) || 0))
      : 0;

  // Primary image with ImageKit CDN optimization
  const rawImage =
    business.media?.coverImage?.url ||
    business.coverImageUrl ||
    business.media?.gallery?.[0]?.url ||
    business.media?.logo?.url ||
    business.logoUrl;
  const displayImage = getImageKitUrl(rawImage, IMAGE_PRESETS.CARD);

  // Primary sports list
  const sports = business.categories && business.categories.length > 0
    ? business.categories
    : activeCourts.map((c) => c.sportName || c.sportId).filter(Boolean);
  const uniqueSports = Array.from(new Set(sports)).slice(0, 3);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextState = !favoriteActive;
    setFavoriteActive(nextState);
    if (onToggleFavorite) {
      onToggleFavorite(business.businessId, nextState);
    }
  };

  return (
    <article
      className={cn(
        "group relative flex flex-col justify-between border border-white/10 bg-qc-panel transition-all duration-300 hover:border-qc-lime/50 hover:shadow-xl hover:shadow-qc-lime/5",
        className
      )}
    >
      {/* Top Image Banner */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-qc-charcoal">
        {displayImage && imgLoaded ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayImage}
            alt={business.businessName}
            onError={() => setImgLoaded(false)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-qc-charcoal to-qc-panel p-6 text-center">
            <span className="font-display text-3xl tracking-widest text-white/20 uppercase">
              {business.businessName.slice(0, 3)}
            </span>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-qc-panel via-transparent to-black/40" />

        {/* Favorite Button */}
        <button
          onClick={handleFavoriteClick}
          aria-label={favoriteActive ? "Remove from favorites" : "Add to favorites"}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-qc-black/70 backdrop-blur-md border border-white/20 text-white transition hover:scale-110 active:scale-95"
        >
          <Heart
            className={cn(
              "h-4 w-4 transition-colors",
              favoriteActive
                ? "fill-red-500 text-red-500"
                : "text-white/80 hover:text-white"
            )}
          />
        </button>

        {/* Operational Status Pill */}
        <div className="absolute left-3 top-3 z-10">
          <div
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold tracking-wider uppercase backdrop-blur-md border",
              opInfo.colorClass.badge
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", opInfo.colorClass.dot)} />
            {opInfo.label}
          </div>
        </div>

        {/* Distance Badge */}
        {distanceKm !== undefined && distanceKm !== null && (
          <div className="absolute bottom-3 left-3 z-10">
            <span className="inline-flex items-center gap-1 border border-white/20 bg-qc-black/80 px-2.5 py-1 text-[11px] font-medium tracking-wide text-qc-lime backdrop-blur-md">
              <MapPin className="h-3 w-3" />
              {formatDistance(distanceKm)}
            </span>
          </div>
        )}
      </div>

      {/* Card Content Body */}
      <div className="flex flex-1 flex-col p-5">
        {/* Venue Title & City */}
        <div className="mb-2">
          <h3 className="font-display text-2xl tracking-wide text-qc-white transition group-hover:text-qc-lime line-clamp-1">
            {business.businessName}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-qc-muted line-clamp-1">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-white/40" />
            {business.location?.address
              ? `${business.location.address}, ${business.location.city || ""}`
              : business.location?.city || "Location available"}
          </p>
        </div>

        {/* Sports Supported Chips */}
        <div className="my-3 flex flex-wrap gap-1.5">
          {uniqueSports.map((sport) => (
            <span
              key={sport}
              className="border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-white/70"
            >
              {sport}
            </span>
          ))}
          {activeCourts.length > 0 && (
            <span className="border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-qc-muted">
              {activeCourts.length} {activeCourts.length === 1 ? "Court" : "Courts"}
            </span>
          )}
        </div>

        {/* Pricing and Action Footer */}
        <div className="mt-auto pt-4 border-t border-white/8 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-qc-muted block">
              Starting From
            </span>
            <div className="text-base font-bold text-qc-white">
              {startingPrice > 0 ? (
                <>
                  <span className="text-qc-lime">{formatINR(startingPrice)}</span>
                  <span className="text-xs font-normal text-qc-muted">/hour</span>
                </>
              ) : (
                <span className="text-xs font-normal text-qc-muted">Pricing on request</span>
              )}
            </div>
          </div>

          <Link
            href={`/player/venue/${business.businessId}`}
            className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.16em] text-qc-lime hover:underline group-hover:translate-x-0.5 transition-transform"
          >
            View Details
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}
