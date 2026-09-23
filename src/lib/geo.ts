import type { BusinessLocation } from "@/types";

/**
 * Calculates great-circle distance between two points on the Earth (Haversine formula).
 * @returns Distance in kilometers
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    typeof lat1 !== "number" ||
    typeof lon1 !== "number" ||
    typeof lat2 !== "number" ||
    typeof lon2 !== "number" ||
    isNaN(lat1) ||
    isNaN(lon1) ||
    isNaN(lat2) ||
    isNaN(lon2)
  ) {
    return 0;
  }

  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Formats a kilometer distance for player-friendly display (e.g. "2.4 km away", "< 1 km away")
 */
export function formatDistance(km: number | null | undefined): string {
  if (km === null || km === undefined || isNaN(km)) {
    return "";
  }
  if (km < 1) {
    return "< 1 km away";
  }
  return `${km.toFixed(1)} km away`;
}

/**
 * Generates an accurate Google Maps link (either coordinates navigation or search fallback)
 */
export function getGoogleMapsDirectionsUrl(
  location?: BusinessLocation,
  businessName?: string
): string {
  if (!location) {
    return businessName
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(businessName)}`
      : "https://maps.google.com";
  }

  // 1. If explicit directions URL exists
  if (location.googleMaps?.directionsUrl) {
    return location.googleMaps.directionsUrl;
  }

  // 2. If explicit map URL exists
  if (location.googleMaps?.mapsUrl) {
    return location.googleMaps.mapsUrl;
  }

  // 3. If coordinates are present, construct standard directions link
  const lat = location.coordinates?.latitude;
  const lng = location.coordinates?.longitude;
  if (typeof lat === "number" && typeof lng === "number" && (lat !== 0 || lng !== 0)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }

  // 4. Fallback to location address query
  const query = [businessName, location.address, location.city, location.state, location.pinCode]
    .filter(Boolean)
    .join(" ");

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || "Sports Venue")}`;
}

export interface PresetCity {
  id: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
}

export const PRESET_CITIES: PresetCity[] = [
  { id: "ahmedabad", name: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714 },
  { id: "mumbai", name: "Mumbai", state: "Maharashtra", lat: 19.076, lng: 72.8777 },
  { id: "bengaluru", name: "Bengaluru", state: "Karnataka", lat: 12.9716, lng: 77.5946 },
  { id: "delhi", name: "Delhi NCR", state: "Delhi", lat: 28.6139, lng: 77.209 },
  { id: "hyderabad", name: "Hyderabad", state: "Telangana", lat: 17.385, lng: 78.4867 },
  { id: "pune", name: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567 },
  { id: "chennai", name: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707 },
  { id: "kolkata", name: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639 },
  { id: "surat", name: "Surat", state: "Gujarat", lat: 21.1702, lng: 72.8311 },
  { id: "jaipur", name: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873 },
];
