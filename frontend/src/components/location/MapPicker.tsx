"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_COORDS, type StoredLocation } from "./types";
import { reverseGeocode } from "./location-utils";

type MapPickerProps = {
  selectedLocation: StoredLocation | null;
  draftLocation: StoredLocation | null;
  onDraftChange: (location: StoredLocation) => void;
  onLoadingChange?: (loading: boolean) => void;
  onError?: (message: string) => void;
};

type LeafletModule = typeof import("leaflet");

export default function MapPicker({
  selectedLocation,
  draftLocation,
  onDraftChange,
  onLoadingChange,
  onError,
}: MapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const leafletModuleRef = useRef<LeafletModule | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false;

    async function setupMap() {
      const leafletModule = await import("leaflet");
      if (disposed || !mapContainerRef.current || mapRef.current) return;

      const L = leafletModule.default;
      leafletModuleRef.current = leafletModule;

      const startLat = draftLocation?.lat ?? selectedLocation?.lat ?? DEFAULT_COORDS[0];
      const startLng = draftLocation?.lng ?? selectedLocation?.lng ?? DEFAULT_COORDS[1];

      const map = L.map(mapContainerRef.current, {
        center: [startLat, startLng],
        zoom: selectedLocation?.lat || draftLocation?.lat ? 14 : 12,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      mapRef.current = map;

      const pinIcon = L.divIcon({
        className: "",
        html: `<div style="position:relative;width:28px;height:38px;">
          <div style="position:absolute;top:0;left:50%;width:28px;height:28px;background:#244229;border:3px solid #ffffff;border-radius:999px;transform:translateX(-50%);box-shadow:0 4px 10px rgba(15,23,42,.28);"></div>
          <div style="position:absolute;bottom:1px;left:50%;width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:12px solid #244229;transform:translateX(-50%);"></div>
        </div>`,
        iconSize: [28, 38],
        iconAnchor: [14, 38],
      });

      function setMapMarker(lat: number, lng: number) {
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
          return;
        }

        markerRef.current = L.marker([lat, lng], { icon: pinIcon }).addTo(map);
      }

      setMapMarker(startLat, startLng);

      map.on("click", async (event: import("leaflet").LeafletMouseEvent) => {
        const lat = event.latlng.lat;
        const lng = event.latlng.lng;
        setMapMarker(lat, lng);
        onLoadingChange?.(true);
        const resolved = await reverseGeocode(lat, lng);
        onDraftChange({ ...resolved, source: "map" });
        onLoadingChange?.(false);
      });

      setReady(true);
      setTimeout(() => map.invalidateSize(), 100);
    }

    setupMap().catch(() => onError?.("Map could not be loaded. Please try again."));

    return () => {
      disposed = true;
      markerRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      leafletModuleRef.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || !draftLocation?.lat || !draftLocation?.lng) return;

    mapRef.current.flyTo([draftLocation.lat, draftLocation.lng], 15, { duration: 0.6 });
    markerRef.current?.setLatLng([draftLocation.lat, draftLocation.lng]);
  }, [draftLocation?.lat, draftLocation?.lng, ready]);

  return (
    <div className="relative min-h-[380px] overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--mint-50)]">
      <div ref={mapContainerRef} className="h-[420px] min-h-[380px] w-full" />
      <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-[var(--accent-dark)] shadow-sm">
        OpenStreetMap + Leaflet
      </div>
    </div>
  );
}
