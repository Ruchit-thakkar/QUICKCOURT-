"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  MapPin,
  Search,
  SlidersHorizontal,
  Navigation,
  Loader2,
  X,
  Compass,
  AlertCircle,
  Building2,
  ChevronDown,
} from "lucide-react";
import { VenueDiscoveryCard } from "@/components/player/VenueDiscoveryCard";
import { getDiscoverableVenues, getFavorites, toggleFavorite } from "@/services/playerService";
import { calculateDistanceKm, PRESET_CITIES, type PresetCity } from "@/lib/geo";
import { useAuth } from "@/context/AuthContext";
import type { BusinessProfile } from "@/types";

const SPORTS_FILTERS = [
  { id: "all", label: "All Sports" },
  { id: "cricket", label: "Cricket" },
  { id: "football", label: "Football" },
  { id: "badminton", label: "Badminton" },
  { id: "tennis", label: "Tennis" },
  { id: "basketball", label: "Basketball" },
  { id: "pickleball", label: "Pickleball" },
  { id: "volleyball", label: "Volleyball" },
  { id: "box_cricket", label: "Box Cricket" },
];

const RADIUS_OPTIONS = [
  { id: "all", label: "Any Distance" },
  { id: "5", label: "Within 5 km", maxKm: 5 },
  { id: "10", label: "Within 10 km", maxKm: 10 },
  { id: "25", label: "Within 25 km", maxKm: 25 },
  { id: "50", label: "Within 50 km", maxKm: 50 },
];

function DiscoverContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  // URL Query state
  const initialSport = searchParams.get("sport") || "all";
  const initialCity = searchParams.get("city") || "";
  const locationParam = searchParams.get("location");

  // Filter States
  const [selectedSport, setSelectedSport] = useState<string>(initialSport);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedRadius, setSelectedRadius] = useState<string>("all");
  const [sortByDistance, setSortByDistance] = useState<boolean>(true);

  // Data states
  const [venues, setVenues] = useState<BusinessProfile[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Geolocation & Manual Location state
  const [locating, setLocating] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [playerCoords, setPlayerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState<string>("");
  const [cityModalOpen, setCityModalOpen] = useState(false);

  // Initialize location from query or storage
  useEffect(() => {
    // 1. If city in URL query
    if (initialCity) {
      const match = PRESET_CITIES.find(
        (c) => c.name.toLowerCase() === initialCity.toLowerCase()
      );
      if (match) {
        setPlayerCoords({ lat: match.lat, lng: match.lng });
        setLocationName(match.name);
      } else {
        setLocationName(initialCity);
      }
    } else {
      // 2. Read from session storage
      const savedLat = sessionStorage.getItem("player_lat");
      const savedLng = sessionStorage.getItem("player_lng");
      const savedName = sessionStorage.getItem("player_city_name");
      if (savedLat && savedLng) {
        setPlayerCoords({ lat: parseFloat(savedLat), lng: parseFloat(savedLng) });
        if (savedName) setLocationName(savedName);
      }
    }

    if (locationParam === "prompt_manual") {
      setLocationDenied(true);
    }
  }, [initialCity, locationParam]);

  // Load venues & favorites
  useEffect(() => {
    async function load() {
      try {
        const discoverable = await getDiscoverableVenues();
        setVenues(discoverable);

        if (user) {
          const favs = await getFavorites(user.uid);
          setFavoriteIds(favs);
        }
      } catch (err) {
        console.error("Error loading discoverable venues:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  // Handle GPS location request
  const requestGPSLocation = () => {
    if (!navigator.geolocation) {
      setLocationDenied(true);
      return;
    }

    setLocating(true);
    setLocationDenied(false);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPlayerCoords({ lat, lng });
        setLocationName("Your Current Location");
        sessionStorage.setItem("player_lat", String(lat));
        sessionStorage.setItem("player_lng", String(lng));
        sessionStorage.setItem("player_city_name", "Your Current Location");
      },
      (err) => {
        setLocating(false);
        setLocationDenied(true);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Handle Manual City Select
  const handleSelectCity = (city: PresetCity) => {
    setPlayerCoords({ lat: city.lat, lng: city.lng });
    setLocationName(city.name);
    sessionStorage.setItem("player_lat", String(city.lat));
    sessionStorage.setItem("player_lng", String(city.lng));
    sessionStorage.setItem("player_city_name", city.name);
    setLocationDenied(false);
    setCityModalOpen(false);
  };

  const handleClearLocation = () => {
    setPlayerCoords(null);
    setLocationName("");
    sessionStorage.removeItem("player_lat");
    sessionStorage.removeItem("player_lng");
    sessionStorage.removeItem("player_city_name");
  };

  // Toggle favorite
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

  // Filter & calculate distances
  const filteredVenues = useMemo(() => {
    return venues
      .map((venue) => {
        let distanceKm: number | null = null;
        if (
          playerCoords &&
          venue.location?.coordinates?.latitude &&
          venue.location?.coordinates?.longitude
        ) {
          distanceKm = calculateDistanceKm(
            playerCoords.lat,
            playerCoords.lng,
            venue.location.coordinates.latitude,
            venue.location.coordinates.longitude
          );
        }
        return { venue, distanceKm };
      })
      .filter(({ venue, distanceKm }) => {
        // 1. Sport filter
        if (selectedSport !== "all") {
          const matchCategory = venue.categories?.some(
            (c) => c.toLowerCase() === selectedSport.toLowerCase()
          );
          const matchCourt = venue.courts?.some(
            (c) =>
              c.sportId?.toLowerCase() === selectedSport.toLowerCase() ||
              c.sportName?.toLowerCase() === selectedSport.toLowerCase()
          );
          if (!matchCategory && !matchCourt) return false;
        }

        // 2. Search query (matches name, description, address, city, sports, court names)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const nameMatch = venue.businessName?.toLowerCase().includes(q);
          const cityMatch = venue.location?.city?.toLowerCase().includes(q);
          const addrMatch = venue.location?.address?.toLowerCase().includes(q);
          const descMatch = venue.description?.toLowerCase().includes(q);
          const sportMatch = venue.categories?.some((c) => c.toLowerCase().includes(q));
          const courtMatch = venue.courts?.some((c) => c.name?.toLowerCase().includes(q));

          if (!nameMatch && !cityMatch && !addrMatch && !descMatch && !sportMatch && !courtMatch) {
            return false;
          }
        }

        // 3. Distance Radius filter
        if (selectedRadius !== "all" && distanceKm !== null) {
          const max = parseFloat(selectedRadius);
          if (distanceKm > max) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortByDistance && a.distanceKm !== null && b.distanceKm !== null) {
          return a.distanceKm - b.distanceKm;
        }
        return 0;
      });
  }, [venues, selectedSport, searchQuery, selectedRadius, sortByDistance, playerCoords]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      {/* Top Header & Search Bar */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl sm:text-5xl text-qc-white">
              Discover Sports Venues
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-qc-muted">
              Explore grounds, turfs, and courts with real-time pricing and hours
            </p>
          </div>

          {/* Location status / selector badge */}
          <div className="flex items-center gap-2 flex-wrap">
            {locationName ? (
              <div className="flex items-center gap-2 border border-qc-lime/30 bg-qc-lime/10 px-3 py-1.5 text-xs text-qc-lime">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="font-semibold">{locationName}</span>
                <button
                  onClick={handleClearLocation}
                  className="ml-1 text-white/50 hover:text-white"
                  title="Clear location"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}

            <button
              onClick={requestGPSLocation}
              disabled={locating}
              className="flex items-center gap-1.5 border border-white/10 bg-qc-panel px-3 py-1.5 text-xs text-white/80 hover:text-qc-lime hover:border-qc-lime/40 transition disabled:opacity-50"
            >
              {locating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-qc-lime" />
              ) : (
                <Navigation className="h-3.5 w-3.5 text-qc-lime" />
              )}
              {locating ? "Locating..." : "Use GPS"}
            </button>

            <button
              onClick={() => setCityModalOpen(true)}
              className="flex items-center gap-1.5 border border-white/10 bg-qc-panel px-3 py-1.5 text-xs text-white/80 hover:text-qc-white hover:border-white/20 transition"
            >
              <Building2 className="h-3.5 w-3.5 text-white/50" />
              Select City
              <ChevronDown className="h-3 w-3 text-white/40" />
            </button>
          </div>
        </div>

        {/* Location Denied Warning with Manual Pick prompt */}
        {locationDenied && !locationName && (
          <div className="mt-4 flex items-center justify-between gap-3 border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
              <span>
                Location access was denied or unavailable. Please pick a city manually to view accurate distances.
              </span>
            </div>
            <button
              onClick={() => setCityModalOpen(true)}
              className="underline font-bold text-qc-white shrink-0 hover:text-qc-lime"
            >
              Select City
            </button>
          </div>
        )}

        {/* Search Input and Radius Select */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by venue name, sport, area, or turf..."
              className="w-full border border-white/15 bg-qc-panel pl-10 pr-10 py-2.5 text-sm text-qc-white placeholder:text-white/30 focus:border-qc-lime focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedRadius}
              onChange={(e) => setSelectedRadius(e.target.value)}
              disabled={!playerCoords}
              className="h-10 border border-white/15 bg-qc-panel px-3 text-xs text-qc-white focus:border-qc-lime focus:outline-none disabled:opacity-40"
            >
              {RADIUS_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id} className="bg-qc-charcoal text-white">
                  {opt.label}
                </option>
              ))}
            </select>

            {playerCoords && (
              <button
                onClick={() => setSortByDistance(!sortByDistance)}
                className={`flex items-center gap-1.5 h-10 border px-3 text-xs font-medium uppercase tracking-wider transition ${
                  sortByDistance
                    ? "border-qc-lime/50 bg-qc-lime/10 text-qc-lime"
                    : "border-white/15 bg-qc-panel text-white/60 hover:text-white"
                }`}
                title="Sort closest first"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Closest
              </button>
            )}
          </div>
        </div>

        {/* Sport Filter Chips */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {SPORTS_FILTERS.map((filter) => {
            const isActive = selectedSport === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setSelectedSport(filter.id)}
                className={`whitespace-nowrap px-3.5 py-1.5 text-xs font-medium uppercase tracking-[0.14em] transition border ${
                  isActive
                    ? "border-qc-lime bg-qc-lime text-qc-black font-bold"
                    : "border-white/10 bg-qc-panel text-white/70 hover:border-white/30 hover:text-white"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Results Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-80 border border-white/10 bg-qc-panel/50 animate-pulse"
            />
          ))}
        </div>
      ) : filteredVenues.length === 0 ? (
        <div className="border border-white/10 bg-qc-panel p-12 text-center my-8">
          <Compass className="mx-auto h-12 w-12 text-white/20 mb-3" />
          <h3 className="font-display text-2xl text-qc-white">No Venues Found</h3>
          <p className="mt-1 text-xs text-qc-muted max-w-md mx-auto">
            {searchQuery || selectedSport !== "all" || selectedRadius !== "all"
              ? "Try broadening your filters, choosing a different sport, or expanding the distance radius."
              : "No venues are discoverable in this area yet."}
          </p>
          {(searchQuery || selectedSport !== "all" || selectedRadius !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedSport("all");
                setSelectedRadius("all");
              }}
              className="mt-4 border border-qc-lime/40 bg-qc-lime/10 px-4 py-2 text-xs font-semibold text-qc-lime hover:bg-qc-lime/20 transition"
            >
              Reset All Filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between text-xs text-qc-muted">
            <span>
              Showing <strong className="text-qc-white">{filteredVenues.length}</strong> {filteredVenues.length === 1 ? "venue" : "venues"}
              {selectedSport !== "all" && ` for ${selectedSport}`}
              {locationName && ` near ${locationName}`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVenues.map(({ venue, distanceKm }) => (
              <VenueDiscoveryCard
                key={venue.businessId}
                business={venue}
                distanceKm={distanceKm}
                isFavorite={favoriteIds.includes(venue.businessId)}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        </>
      )}

      {/* Manual City Selector Modal */}
      {cityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md border border-white/20 bg-qc-charcoal p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-qc-lime" />
                <h3 className="font-display text-2xl text-qc-white">Select Location</h3>
              </div>
              <button
                onClick={() => setCityModalOpen(false)}
                className="text-white/60 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-qc-muted mb-4">
              Choose a city to view accurate distances and nearby grounds:
            </p>

            <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
              {PRESET_CITIES.map((city) => (
                <button
                  key={city.id}
                  onClick={() => handleSelectCity(city)}
                  className="flex flex-col items-start border border-white/10 bg-qc-panel p-3 text-left transition hover:border-qc-lime hover:bg-white/5"
                >
                  <span className="text-sm font-semibold text-qc-white">{city.name}</span>
                  <span className="text-[11px] text-qc-muted">{city.state}</span>
                </button>
              ))}
            </div>

            <div className="mt-5 pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setCityModalOpen(false)}
                className="border border-white/15 px-4 py-1.5 text-xs text-white/70 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlayerDiscoverPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-qc-lime" />
        </div>
      }
    >
      <DiscoverContent />
    </Suspense>
  );
}
