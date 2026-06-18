export type StoredLocation = {
  address: string;
  city?: string | null;
  area?: string | null;
  lat?: number | null;
  lng?: number | null;
  source?: "profile" | "manual" | "gps" | "map";
};

export const LOCATION_STORAGE_KEY = "meramot.selectedLocation";
export const DEFAULT_COORDS: [number, number] = [23.8103, 90.4125];
