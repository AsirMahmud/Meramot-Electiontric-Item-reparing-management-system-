"use client";

import { Check, LocateFixed, X } from "lucide-react";
import { useState } from "react";
import MapPicker from "./MapPicker";
import type { StoredLocation } from "./types";
import { forwardGeocode, reverseGeocode } from "./location-utils";

type LocationPickerModalProps = {
  selectedLocation: StoredLocation | null;
  onClose: () => void;
  onConfirm: (location: StoredLocation) => Promise<unknown>;
};

export default function LocationPickerModal({
  selectedLocation,
  onClose,
  onConfirm,
}: LocationPickerModalProps) {
  const [draftLocation, setDraftLocation] = useState<StoredLocation | null>(selectedLocation);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationSaving, setLocationSaving] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLocationLoading(true);
    setLocationError("");

    try {
      const resolved = await forwardGeocode(searchQuery.trim());
      if (resolved) {
        setDraftLocation({ ...resolved, source: "map" });
      } else {
        setLocationError("Could not find that location. Try a different search term.");
      }
    } catch {
      setLocationError("Search failed. Try again.");
    } finally {
      setLocationLoading(false);
    }
  }

  async function useGpsLocation() {
    if (!navigator.geolocation) {
      setLocationError("GPS is not available in this browser.");
      return;
    }

    setLocationLoading(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const resolved = await reverseGeocode(lat, lng);
        setDraftLocation({ ...resolved, source: "gps" });
        setLocationLoading(false);
      },
      () => {
        setLocationError("Location permission denied. You can still click the map to pin your address.");
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function confirmLocation() {
    if (!draftLocation) {
      setLocationError("Choose a point on the map first.");
      return;
    }

    setLocationSaving(true);
    setLocationError("");

    try {
      await onConfirm(draftLocation);
      onClose();
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : "Could not save location.");
    } finally {
      setLocationSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center sm:px-4 sm:py-6">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-[121] flex max-h-[100vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl sm:max-h-[90vh] sm:rounded-[2rem]">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-2 sm:items-start sm:gap-4 sm:p-5">
          <div>
            <h2 className="text-base font-bold text-[var(--foreground)] sm:text-2xl">Choose your location</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[var(--mint-100)] p-2 text-[var(--foreground)] transition hover:bg-[var(--mint-200)]"
            aria-label="Close location picker"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid min-h-0 min-w-0 flex-1 gap-2 overflow-y-auto overflow-x-hidden p-2 sm:gap-4 sm:p-5 lg:grid-cols-[1fr_280px]">
          <MapPicker
            selectedLocation={selectedLocation}
            draftLocation={draftLocation}
            onDraftChange={(location) => {
              setLocationError("");
              setDraftLocation(location);
            }}
            onLoadingChange={setLocationLoading}
            onError={setLocationError}
          />

          <div className="flex min-w-0 flex-col gap-2 sm:gap-3">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Search location (e.g. Dhaka)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-accent-dark dark:bg-[#1f2923] sm:rounded-2xl sm:px-4 sm:py-3"
              />
              <button
                type="submit"
                disabled={locationLoading || !searchQuery.trim()}
                className="shrink-0 rounded-xl bg-[var(--accent-dark)] px-3 py-2 text-sm font-bold text-[var(--accent-foreground)] transition hover:opacity-95 disabled:opacity-60 sm:rounded-2xl sm:px-4 sm:py-3"
              >
                Search
              </button>
            </form>

            <div className="hidden items-center gap-3 sm:flex">
              <div className="h-px flex-1 bg-[var(--border)]" />
              <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">or</span>
              <div className="h-px flex-1 bg-[var(--border)]" />
            </div>

            <button
              type="button"
              onClick={useGpsLocation}
              disabled={locationLoading || locationSaving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-dark)] px-3 py-2 text-sm font-bold text-[var(--accent-foreground)] transition hover:opacity-95 disabled:opacity-60 sm:rounded-2xl sm:px-4 sm:py-3"
            >
              <LocateFixed size={18} className={locationLoading ? "animate-spin" : ""} />
              {locationLoading ? "Detecting..." : "Use GPS location"}
            </button>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--mint-50)] p-3 sm:rounded-2xl sm:p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)] sm:text-xs">
                Selected address
              </p>
              <p className="mt-1 text-sm font-semibold leading-5 text-[var(--foreground)]">
                {draftLocation?.address || "No location selected yet."}
              </p>
              {(draftLocation?.area || draftLocation?.city) && (
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {[draftLocation.area, draftLocation.city].filter(Boolean).join(", ")}
                </p>
              )}
            </div>

            {locationError && (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {locationError}
              </div>
            )}

            <button
              type="button"
              onClick={confirmLocation}
              disabled={locationSaving || !draftLocation}
              className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-dark)] px-3 py-2 text-sm font-bold text-[var(--accent-foreground)] transition hover:opacity-95 disabled:opacity-60 sm:rounded-2xl sm:px-4 sm:py-3"
            >
              <Check size={18} />
              {locationSaving ? "Saving..." : "Confirm location"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
