"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getProfile, updateProfile } from "@/lib/api";
import { LOCATION_STORAGE_KEY, type StoredLocation } from "./types";
import { buildLocationLabel, parseStoredLocation } from "./location-utils";

export function useSelectedLocation(isLoggedIn: boolean) {
  const [selectedLocation, setSelectedLocation] = useState<StoredLocation | null>(null);
  const [loadingProfileLocation, setLoadingProfileLocation] = useState(false);

  useEffect(() => {
    const localLocation = parseStoredLocation();
    if (localLocation) {
      setSelectedLocation(localLocation);
      return;
    }

    if (!isLoggedIn) return;

    const token = localStorage.getItem("meramot.token") || "";
    if (!token) return;

    setLoadingProfileLocation(true);

    getProfile(token)
      .then((profile: any) => {
        const profileLocation: StoredLocation = {
          address: profile?.address || "",
          city: profile?.city || "",
          area: profile?.area || "",
          lat: typeof profile?.lat === "number" ? profile.lat : null,
          lng: typeof profile?.lng === "number" ? profile.lng : null,
          source: "profile",
        };

        const hasProfileLocation =
          profileLocation.address ||
          profileLocation.city ||
          profileLocation.area ||
          (typeof profileLocation.lat === "number" && typeof profileLocation.lng === "number");

        if (hasProfileLocation) {
          setSelectedLocation(profileLocation);
          localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(profileLocation));
        }
      })
      .catch(() => null)
      .finally(() => setLoadingProfileLocation(false));
  }, [isLoggedIn]);

  const saveLocation = useCallback(
    async (nextLocation: StoredLocation) => {
      const normalized: StoredLocation = {
        address: nextLocation.address || "",
        city: nextLocation.city || "",
        area: nextLocation.area || "",
        lat: typeof nextLocation.lat === "number" ? nextLocation.lat : null,
        lng: typeof nextLocation.lng === "number" ? nextLocation.lng : null,
        source: nextLocation.source || "map",
      };

      const token = localStorage.getItem("meramot.token") || "";

      if (isLoggedIn && token) {
        await updateProfile(token, {
          address: normalized.address,
          city: normalized.city,
          area: normalized.area,
          lat: normalized.lat,
          lng: normalized.lng,
        });
      }

      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(normalized));
      window.dispatchEvent(new CustomEvent("meramot-location-changed", { detail: normalized }));
      setSelectedLocation(normalized);

      return normalized;
    },
    [isLoggedIn],
  );

  const locationLabel = useMemo(() => buildLocationLabel(selectedLocation), [selectedLocation]);

  return {
    selectedLocation,
    setSelectedLocation,
    locationLabel,
    loadingProfileLocation,
    saveLocation,
  };
}
