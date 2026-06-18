"use client";

import { Check, LocateFixed, X } from "lucide-react";
import { useState } from "react";
import MapPicker from "./MapPicker";
import type { StoredLocation } from "./types";
import { reverseGeocode } from "./location-utils";

type LocationPickerModalProps = {
  selectedLocation: StoredLocation | null;
  onClose: () => void;
  onConfirm: (location: StoredLocation) => Promise<void>;
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
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-[121] flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--card)] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--muted-foreground)]">
              Delivery location
            </p>
            <h2 className="mt-1 text-2xl font-bold text-[var(--foreground)]">Choose your location</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Click the map to pin an address or use GPS to detect your current location.
            </p>
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

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 lg:grid-cols-[1fr_280px]">
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

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={useGpsLocation}
              disabled={locationLoading || locationSaving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--accent-dark)] px-4 py-3 text-sm font-bold text-white transition hover:opacity-95 disabled:opacity-60"
            >
              <LocateFixed size={18} className={locationLoading ? "animate-spin" : ""} />
              {locationLoading ? "Detecting..." : "Use GPS location"}
            </button>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--mint-50)] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                Selected address
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--foreground)]">
                {draftLocation?.address || "No location selected yet."}
              </p>
              {(draftLocation?.area || draftLocation?.city) && (
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
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
              className="mt-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--accent-dark)] px-4 py-3 text-sm font-bold text-white transition hover:opacity-95 disabled:opacity-60"
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
