"use client";

import { useEffect, useMemo, useState } from "react";
import { Navigation2, RefreshCw } from "lucide-react";
import { fetchDeliveryDeliveries, patchDeliveryLocation } from "@/lib/api";
import { useDeliveryAuth } from "@/lib/delivery-auth-context";

export default function MapPage() {
  const { token, me, refreshMe } = useDeliveryAuth();
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [deliveryCount, setDeliveryCount] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    fetchDeliveryDeliveries(token)
      .then((data) => {
        setDeliveryCount(
          data.deliveries.filter((d) => !["DELIVERED", "FAILED", "CANCELLED"].includes(d.status)).length,
        );
      })
      .catch(() => setDeliveryCount(0));
  }, [token]);

  const coordsText = useMemo(() => {
    if (typeof me?.currentLat !== "number" || typeof me?.currentLng !== "number") {
      return "Location not set";
    }
    return `${me.currentLat.toFixed(5)}, ${me.currentLng.toFixed(5)}`;
  }, [me?.currentLat, me?.currentLng]);

  async function updateMyLocation() {
    if (!token || !navigator.geolocation) return;
    setUpdatingLocation(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await patchDeliveryLocation(token, position.coords.latitude, position.coords.longitude);
          await refreshMe();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to update location");
        } finally {
          setUpdatingLocation(false);
        }
      },
      () => {
        setError("Location permission denied");
        setUpdatingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col rounded-3xl border border-[#d9e5d5] bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#163625]">Live Map</h1>
        <button
          type="button"
          onClick={updateMyLocation}
          disabled={updatingLocation}
          className="inline-flex items-center gap-2 rounded-xl bg-[#163625] px-4 py-2 text-sm font-bold text-[#E4FCD5] disabled:opacity-60"
        >
          <RefreshCw size={16} className={updatingLocation ? "animate-spin" : ""} />
          {updatingLocation ? "Updating..." : "Update my location"}
        </button>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-[#d9e5d5] bg-[#eef4ea] p-4">
          <p className="text-xs font-semibold text-[#163625]/70">Current coordinates</p>
          <p className="mt-1 text-sm font-bold text-[#163625]">{coordsText}</p>
        </div>
        <div className="rounded-2xl border border-[#d9e5d5] bg-[#eef4ea] p-4">
          <p className="text-xs font-semibold text-[#163625]/70">Active deliveries</p>
          <p className="mt-1 text-sm font-bold text-[#163625]">{deliveryCount}</p>
        </div>
        <div className="rounded-2xl border border-[#d9e5d5] bg-[#eef4ea] p-4">
          <p className="text-xs font-semibold text-[#163625]/70">Rider status</p>
          <p className="mt-1 text-sm font-bold text-[#163625]">{me?.status ?? "UNKNOWN"}</p>
        </div>
      </div>

      <div className="relative flex-1 rounded-2xl bg-[#163625] text-[#E4FCD5] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-full bg-[#E4FCD5]/15 p-5">
            <Navigation2 size={32} />
          </div>
          <p className="text-sm font-semibold">Backend location sync is active</p>
          <p className="text-xs text-[#E4FCD5]/70">Use "Update my location" to push real coordinates.</p>
          {error ? <p className="text-xs text-red-200">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
