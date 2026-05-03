import { LOCATION_STORAGE_KEY, type StoredLocation } from "./types";

const REVERSE_GEOCODE_ENDPOINT = "https://nominatim.openstreetmap.org/reverse";

export function buildLocationLabel(location: StoredLocation | null) {
  if (!location) return "Choose your location";

  const area = location.area?.trim();
  const city = location.city?.trim();
  const address = location.address?.trim();

  if (area && city) return `${area}, ${city}`;
  if (area) return area;
  if (city) return city;
  if (address) return address.length > 34 ? `${address.slice(0, 34)}...` : address;

  if (typeof location.lat === "number" && typeof location.lng === "number") {
    return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
  }

  return "Choose your location";
}

export function parseStoredLocation() {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredLocation;
    if (!parsed || typeof parsed !== "object") return null;

    return parsed;
  } catch {
    localStorage.removeItem(LOCATION_STORAGE_KEY);
    return null;
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<StoredLocation> {
  try {
    const res = await fetch(
      `${REVERSE_GEOCODE_ENDPOINT}?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
    );

    if (!res.ok) throw new Error("Reverse geocode failed");

    const data = (await res.json()) as {
      display_name?: string;
      address?: {
        city?: string;
        town?: string;
        suburb?: string;
        neighbourhood?: string;
        quarter?: string;
        road?: string;
        state_district?: string;
        county?: string;
      };
    };

    const addressParts = data.address ?? {};
    const city =
      addressParts.city ||
      addressParts.town ||
      addressParts.state_district ||
      addressParts.county ||
      "";

    const area =
      addressParts.suburb ||
      addressParts.neighbourhood ||
      addressParts.quarter ||
      addressParts.road ||
      "";

    return {
      address: data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      city,
      area,
      lat,
      lng,
      source: "map",
    };
  } catch {
    return {
      address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      city: "",
      area: "",
      lat,
      lng,
      source: "map",
    };
  }
}
