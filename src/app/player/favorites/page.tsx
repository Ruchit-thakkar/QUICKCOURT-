"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Compass, Loader2, ArrowRight } from "lucide-react";
import { VenueDiscoveryCard } from "@/components/player/VenueDiscoveryCard";
import { getDiscoverableVenues, subscribeFavorites, toggleFavorite } from "@/services/playerService";
import { calculateDistanceKm } from "@/lib/geo";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import type { BusinessProfile } from "@/types";

export default function PlayerFavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [allVenues, setAllVenues] = useState<BusinessProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadVenues() {
      try {
        const venues = await getDiscoverableVenues();
        setAllVenues(venues);
      } catch (err) {
        console.error("Error loading venues for favorites:", err);
      } finally {
        setLoading(false);
      }
    }
    loadVenues();
  }, []);

  useEffect(() => {
    if (!user) {
      setFavoriteIds([]);
      return;
    }

    const unsubscribe = subscribeFavorites(user.uid, (ids) => {
      setFavoriteIds(ids);
    });

    return () => unsubscribe();
  }, [user]);

  const handleToggleFavorite = async (businessId: string, newState: boolean) => {
    if (!user) return;
    const business = allVenues.find((v) => v.businessId === businessId);
    await toggleFavorite(user.uid, businessId, newState, business);
  };

  const favoriteVenues = allVenues.filter((v) => favoriteIds.includes(v.businessId));

  // Get player location from session
  const savedLat = typeof window !== "undefined" ? sessionStorage.getItem("player_lat") : null;
  const savedLng = typeof window !== "undefined" ? sessionStorage.getItem("player_lng") : null;

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-qc-lime" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-qc-charcoal border border-white/15">
          <Heart className="h-6 w-6 text-qc-lime" />
        </div>
        <h1 className="font-display text-3xl text-qc-white">Save Your Favorite Venues</h1>
        <p className="mt-2 text-xs text-qc-muted max-w-sm mx-auto">
          Sign in with your player account to save your favourite turfs, grounds, and courts for quick access anytime.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button href="/player/login" size="md">
            Sign In
          </Button>
          <Button href="/player/signup" variant="secondary" size="md">
            Join QuickCourt
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl sm:text-5xl text-qc-white">
          Saved Favorites
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-qc-muted">
          Your bookmarked sports facilities and regular turfs
        </p>
      </div>

      {favoriteVenues.length === 0 ? (
        <div className="border border-white/10 bg-qc-panel p-12 text-center my-8">
          <Heart className="mx-auto h-12 w-12 text-white/20 mb-3" />
          <h2 className="font-display text-2xl text-qc-white">No Favorites Yet</h2>
          <p className="mt-1 text-xs text-qc-muted max-w-md mx-auto">
            You have not added any venues to your favorites. Tap the heart icon on any venue card to save it here.
          </p>
          <div className="mt-6">
            <Link
              href="/player/discover"
              className="inline-flex items-center gap-2 border border-qc-lime bg-qc-lime px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-qc-black transition hover:bg-qc-lime/90"
            >
              <Compass className="h-4 w-4" />
              Discover Nearby Venues
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {favoriteVenues.map((venue) => {
            let distanceKm: number | null = null;
            if (
              savedLat &&
              savedLng &&
              venue.location?.coordinates?.latitude &&
              venue.location?.coordinates?.longitude
            ) {
              distanceKm = calculateDistanceKm(
                parseFloat(savedLat),
                parseFloat(savedLng),
                venue.location.coordinates.latitude,
                venue.location.coordinates.longitude
              );
            }

            return (
              <VenueDiscoveryCard
                key={venue.businessId}
                business={venue}
                distanceKm={distanceKm}
                isFavorite={true}
                onToggleFavorite={handleToggleFavorite}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
