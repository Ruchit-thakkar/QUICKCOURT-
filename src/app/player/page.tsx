"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Compass,
  ArrowRight,
  Navigation,
  Loader2,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { VenueDiscoveryCard } from "@/components/player/VenueDiscoveryCard";
import { getDiscoverableVenues, getFavorites, toggleFavorite } from "@/services/playerService";
import { calculateDistanceKm, PRESET_CITIES } from "@/lib/geo";
import { useAuth } from "@/context/AuthContext";
import type { BusinessProfile } from "@/types";

const FEATURED_SPORTS = [
  { id: "cricket", name: "Cricket", emoji: "🏏", tagline: "Box cricket & grounds" },
  { id: "football", name: "Football", emoji: "⚽", tagline: "Turfs & full grounds" },
  { id: "badminton", name: "Badminton", emoji: "🏸", tagline: "Indoor wooden & synthetic" },
  { id: "tennis", name: "Tennis", emoji: "🎾", tagline: "Clay & hard courts" },
  { id: "basketball", name: "Basketball", emoji: "🏀", tagline: "Half & full indoor/outdoor" },
  { id: "pickleball", name: "Pickleball", emoji: "🏓", tagline: "Trending racket game" },
  { id: "volleyball", name: "Volleyball", emoji: "🏐", tagline: "Sand & hard courts" },
  { id: "box_cricket", name: "Box Cricket", emoji: "🏏", tagline: "Floodlight box arenas" },
];

export default function PlayerHomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [venues, setVenues] = useState<BusinessProfile[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState<string>("");

  useEffect(() => {
    // Try to load cached player location from session
    const savedLat = sessionStorage.getItem("player_lat");
    const savedLng = sessionStorage.getItem("player_lng");
    const savedName = sessionStorage.getItem("player_city_name");
    if (savedLat && savedLng) {
      setUserLocation({ lat: parseFloat(savedLat), lng: parseFloat(savedLng) });
      if (savedName) setLocationName(savedName);
    }

    async function loadData() {
      try {
        const discoverable = await getDiscoverableVenues();
        setVenues(discoverable);

        if (user) {
          const favs = await getFavorites(user.uid);
          setFavoriteIds(favs);
        }
      } catch (err) {
        console.error("Error loading home venues:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      router.push("/player/discover");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        sessionStorage.setItem("player_lat", String(lat));
        sessionStorage.setItem("player_lng", String(lng));
        sessionStorage.setItem("player_city_name", "Current GPS Location");
        router.push("/player/discover?location=gps");
      },
      (err) => {
        setLocating(false);
        // Geolocation denied or unavailable: seamlessly navigate to discovery with manual selector
        router.push("/player/discover?location=prompt_manual");
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleSelectCity = (city: typeof PRESET_CITIES[0]) => {
    sessionStorage.setItem("player_lat", String(city.lat));
    sessionStorage.setItem("player_lng", String(city.lng));
    sessionStorage.setItem("player_city_name", city.name);
    router.push(`/player/discover?city=${encodeURIComponent(city.name)}`);
  };

  const handleToggleFavorite = async (businessId: string, newState: boolean) => {
    if (!user) {
      router.push("/player/login");
      return;
    }
    const business = venues.find((v) => v.businessId === businessId);
    await toggleFavorite(user.uid, businessId, newState, business);
    setFavoriteIds((prev) =>
      newState ? [...prev, businessId] : prev.filter((id) => id !== businessId)
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Hero Section: What do you want to play? */}
      <section className="mb-12">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 border border-qc-lime/30 bg-qc-lime/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-qc-lime mb-4">
            <Sparkles className="h-3 w-3" />
            Discover & Play
          </div>
          <h1 className="font-display text-4xl sm:text-6xl md:text-7xl tracking-tight text-qc-white">
            What do you want to play?
          </h1>
          <p className="mt-3 text-sm sm:text-base text-qc-muted max-w-2xl leading-relaxed">
            Find the best verified sports venues, box turfs, and courts near you. Check live court pricing, operating hours, and get direct directions.
          </p>
        </div>

        {/* Sport Cards Grid */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {FEATURED_SPORTS.map((sport) => (
            <Link
              key={sport.id}
              href={`/player/discover?sport=${sport.id}`}
              className="group relative flex flex-col justify-between border border-white/10 bg-qc-panel p-4 sm:p-5 transition hover:border-qc-lime/50 hover:bg-qc-charcoal"
            >
              <div className="flex items-start justify-between">
                <span className="text-3xl sm:text-4xl">{sport.emoji}</span>
                <ChevronRight className="h-4 w-4 text-white/30 transition group-hover:text-qc-lime group-hover:translate-x-1" />
              </div>
              <div className="mt-4">
                <h2 className="font-display text-xl sm:text-2xl text-qc-white group-hover:text-qc-lime transition">
                  {sport.name}
                </h2>
                <p className="mt-0.5 text-[11px] text-qc-muted line-clamp-1">
                  {sport.tagline}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Sports Near You Location Banner */}
      <section className="mb-14 border border-white/15 bg-gradient-to-r from-qc-charcoal via-qc-panel to-qc-charcoal p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <span className="text-xs uppercase tracking-[0.2em] text-qc-lime font-bold">
              Sports Near You
            </span>
            <h2 className="font-display text-3xl sm:text-4xl text-qc-white mt-1">
              Find Grounds in Your Area
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-qc-muted">
              Use your device location or pick a major city to calculate exact distances to venues.
            </p>

            {/* Quick city chips */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-white/40 mr-1">
                Popular:
              </span>
              {PRESET_CITIES.slice(0, 5).map((city) => (
                <button
                  key={city.id}
                  onClick={() => handleSelectCity(city)}
                  className="border border-white/10 bg-qc-black/60 px-2.5 py-1 text-xs text-white/80 hover:text-qc-lime hover:border-qc-lime/40 transition"
                >
                  {city.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto shrink-0">
            <button
              onClick={handleRequestLocation}
              disabled={locating}
              className="flex items-center justify-center gap-2 bg-qc-lime px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-qc-black transition hover:bg-qc-lime/90 disabled:opacity-50"
            >
              {locating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Locating...
                </>
              ) : (
                <>
                  <Navigation className="h-4 w-4" />
                  Use Current Location
                </>
              )}
            </button>
            <Button href="/player/discover" variant="secondary" size="md" className="text-xs">
              Explore All Venues
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Venues Section */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-display text-3xl text-qc-white">
              Featured Venues
            </h2>
            <p className="mt-0.5 text-xs text-qc-muted">
              Explore active sports facilities and bookable courts
            </p>
          </div>
          <Link
            href="/player/discover"
            className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.16em] text-qc-lime hover:underline"
          >
            See All ({venues.length})
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-80 border border-white/10 bg-qc-panel/50 animate-pulse"
              />
            ))}
          </div>
        ) : venues.length === 0 ? (
          <div className="border border-white/10 bg-qc-panel p-12 text-center">
            <Compass className="mx-auto h-10 w-10 text-white/30 mb-3" />
            <h3 className="font-display text-2xl text-qc-white">No Venues Found</h3>
            <p className="mt-1 text-xs text-qc-muted">
              No sports facilities have registered yet. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {venues.slice(0, 6).map((venue) => {
              let distanceKm: number | null = null;
              if (
                userLocation &&
                venue.location?.coordinates?.latitude &&
                venue.location?.coordinates?.longitude
              ) {
                distanceKm = calculateDistanceKm(
                  userLocation.lat,
                  userLocation.lng,
                  venue.location.coordinates.latitude,
                  venue.location.coordinates.longitude
                );
              }

              return (
                <VenueDiscoveryCard
                  key={venue.businessId}
                  business={venue}
                  distanceKm={distanceKm}
                  isFavorite={favoriteIds.includes(venue.businessId)}
                  onToggleFavorite={handleToggleFavorite}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
