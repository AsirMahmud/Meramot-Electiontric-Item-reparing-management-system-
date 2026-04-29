"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { fetchDeliveryDeliveries, patchDeliveryLocation, type DeliveryWithJob } from "@/lib/api";
import { useDeliveryAuth } from "@/lib/delivery-auth-context";

type LeafletModule = typeof import("leaflet");
type MapPoint = {
  key: string;
  deliveryId: string;
  lat: number;
  lng: number;
  label: string;
  address?: string;
  kind: "CUSTOMER_PICKUP" | "SHOP_PICKUP" | "SHOP_DELIVERY" | "CUSTOMER_DELIVERY";
};

const GEOCODE_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const OSRM_ROUTE_ENDPOINT = "https://router.project-osrm.org/route/v1/driving";

export default function MapPage() {
  const { token, me, refreshMe } = useDeliveryAuth();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Layer | null>(null);
  const deliveryMarkersRef = useRef<import("leaflet").LayerGroup | null>(null);
  const routeLineRef = useRef<import("leaflet").Polyline | null>(null);
  const leafletModuleRef = useRef<LeafletModule | null>(null);
  const geocodeCacheRef = useRef<Map<string, [number, number]>>(new Map());
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [deliveryCount, setDeliveryCount] = useState(0);
  const [deliveries, setDeliveries] = useState<DeliveryWithJob[]>([]);
  const [directionFilter, setDirectionFilter] = useState<"ALL" | "TO_SHOP" | "TO_CUSTOMER">("ALL");
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([]);
  const [selectedPointKey, setSelectedPointKey] = useState("");
  const [error, setError] = useState("");
  const riderLat = me?.currentLat ?? me?.lat;
  const riderLng = me?.currentLng ?? me?.lng;

  useEffect(() => {
    if (!token) return;
    fetchDeliveryDeliveries(token)
      .then((data) => {
        const active = data.deliveries.filter((d) => !["DELIVERED", "FAILED", "CANCELLED"].includes(d.status));
        setDeliveries(active);
        setDeliveryCount(active.length);
      })
      .catch(() => {
        setDeliveries([]);
        setDeliveryCount(0);
      });
  }, [token]);

  const coordsText = useMemo(() => {
    if (typeof riderLat !== "number" || typeof riderLng !== "number") {
      return "Location not set";
    }
    return `${riderLat.toFixed(5)}, ${riderLng.toFixed(5)}`;
  }, [riderLat, riderLng]);

  const filteredDeliveries = useMemo(() => {
    if (directionFilter === "ALL") return deliveries;
    return deliveries.filter((d) => d.direction === directionFilter);
  }, [deliveries, directionFilter]);

  const selectedPoint = useMemo(
    () => mapPoints.find((point) => point.key === selectedPointKey) ?? null,
    [mapPoints, selectedPointKey],
  );

  async function geocodeAddress(address: string): Promise<[number, number] | null> {
    const key = address.trim().toLowerCase();
    if (!key) return null;
    const cached = geocodeCacheRef.current.get(key);
    if (cached) return cached;
    try {
      const res = await fetch(`${GEOCODE_ENDPOINT}?q=${encodeURIComponent(address)}&format=json&limit=1`);
      if (!res.ok) return null;
      const data = (await res.json()) as { lat: string; lon: string }[];
      const first = data?.[0];
      if (!first) return null;
      const lat = Number(first.lat);
      const lng = Number(first.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      geocodeCacheRef.current.set(key, [lat, lng]);
      return [lat, lng];
    } catch {
      return null;
    }
  }

  useEffect(() => {
    let disposed = false;

    async function resolveMapPoints() {
      const points: MapPoint[] = [];
      for (const delivery of filteredDeliveries) {
        const customerLat = delivery.repairJob?.repairRequest?.user?.lat;
        const customerLng = delivery.repairJob?.repairRequest?.user?.lng;
        const shopLat = delivery.repairJob?.shop?.lat;
        const shopLng = delivery.repairJob?.shop?.lng;
        const isToShop = delivery.direction === "TO_SHOP";

        let pickupLat: number | null = null;
        let pickupLng: number | null = null;
        let pickupLabel = "";
        let pickupAddress = delivery.pickupAddress;
        let pickupKind: MapPoint["kind"] = "CUSTOMER_PICKUP";

        if (isToShop) {
          pickupLabel = "Customer Pickup";
          pickupKind = "CUSTOMER_PICKUP";
          if (typeof customerLat === "number" && typeof customerLng === "number") {
            pickupLat = customerLat;
            pickupLng = customerLng;
          }
        } else {
          pickupLabel = "Shop Pickup";
          pickupKind = "SHOP_PICKUP";
          if (typeof shopLat === "number" && typeof shopLng === "number") {
            pickupLat = shopLat;
            pickupLng = shopLng;
          }
        }

        if (pickupLat === null || pickupLng === null) {
          const geocoded = await geocodeAddress(delivery.pickupAddress);
          if (geocoded) {
            pickupLat = geocoded[0];
            pickupLng = geocoded[1];
          }
        }

        let dropLat: number | null = null;
        let dropLng: number | null = null;
        let dropLabel = "";
        let dropAddress = delivery.dropAddress;
        let dropKind: MapPoint["kind"] = "SHOP_DELIVERY";

        if (isToShop) {
          dropLabel = "Shop Delivery";
          dropKind = "SHOP_DELIVERY";
          if (typeof shopLat === "number" && typeof shopLng === "number") {
            dropLat = shopLat;
            dropLng = shopLng;
          }
        } else {
          dropLabel = "Customer Delivery";
          dropKind = "CUSTOMER_DELIVERY";
          if (typeof customerLat === "number" && typeof customerLng === "number") {
            dropLat = customerLat;
            dropLng = customerLng;
          }
        }

        if (dropLat === null || dropLng === null) {
          const geocoded = await geocodeAddress(delivery.dropAddress);
          if (geocoded) {
            dropLat = geocoded[0];
            dropLng = geocoded[1];
          }
        }

        if (pickupLat !== null && pickupLng !== null) {
          points.push({
            key: `${delivery.id}-pickup`,
            deliveryId: delivery.id,
            lat: pickupLat,
            lng: pickupLng,
            label: pickupLabel,
            address: pickupAddress,
            kind: pickupKind,
          });
        }
        if (dropLat !== null && dropLng !== null) {
          points.push({
            key: `${delivery.id}-drop`,
            deliveryId: delivery.id,
            lat: dropLat,
            lng: dropLng,
            label: dropLabel,
            address: dropAddress,
            kind: dropKind,
          });
        }
      }

      if (!disposed) {
        setMapPoints(points);
      }
    }

    resolveMapPoints().catch(() => {
      if (!disposed) setMapPoints([]);
    });

    return () => {
      disposed = true;
    };
  }, [filteredDeliveries]);

  useEffect(() => {
    if (!mapRef.current || !leafletModuleRef.current) return;
    const L = leafletModuleRef.current.default;
    const map = mapRef.current;

    if (!deliveryMarkersRef.current) {
      deliveryMarkersRef.current = L.layerGroup().addTo(map);
    } else {
      deliveryMarkersRef.current.clearLayers();
    }

    const boundsPoints: [number, number][] = [];

    if (typeof riderLat === "number" && typeof riderLng === "number") {
      boundsPoints.push([riderLat, riderLng]);
    }

    const customerPickupIcon = L.divIcon({
      className: "",
      html: `<div style="width:18px;height:18px;border-radius:999px;background:#2563eb;border:2px solid #ffffff;box-shadow:0 2px 5px rgba(15,23,42,.25);"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    const shopPickupIcon = L.divIcon({
      className: "",
      html: `<div style="width:18px;height:18px;border-radius:999px;background:#16a34a;border:2px solid #ffffff;box-shadow:0 2px 5px rgba(15,23,42,.25);"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    const shopDeliveryIcon = L.divIcon({
      className: "",
      html: `<div style="width:18px;height:18px;border-radius:4px;background:#14532d;border:2px solid #ffffff;box-shadow:0 2px 5px rgba(15,23,42,.25);"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    const customerDeliveryIcon = L.divIcon({
      className: "",
      html: `<div style="width:18px;height:18px;border-radius:4px;background:#1e40af;border:2px solid #ffffff;box-shadow:0 2px 5px rgba(15,23,42,.25);"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    mapPoints.forEach((point) => {
      if (!deliveryMarkersRef.current) return;
      boundsPoints.push([point.lat, point.lng]);
      const icon =
        point.kind === "CUSTOMER_PICKUP"
          ? customerPickupIcon
          : point.kind === "SHOP_PICKUP"
            ? shopPickupIcon
            : point.kind === "SHOP_DELIVERY"
              ? shopDeliveryIcon
              : customerDeliveryIcon;
      L.marker([point.lat, point.lng], { icon })
        .on("click", () => setSelectedPointKey(point.key))
        .bindPopup(
          `<div style="font-family:system-ui,sans-serif;color:#0f172a;min-width:210px;">
            <strong>${point.label}</strong><br/>
            <span style="font-size:12px;">${point.address ?? "Address unavailable"}</span><br/>
            <span style="font-size:11px;color:#334155;">Tap marker to set route</span>
          </div>`,
        )
        .addTo(deliveryMarkersRef.current);
    });

    if (boundsPoints.length > 1) {
      map.fitBounds(boundsPoints, { padding: [40, 40] });
    } else if (boundsPoints.length === 1) {
      map.flyTo(boundsPoints[0], 14, { duration: 1 });
    }
  }, [mapPoints, riderLat, riderLng]);

  useEffect(() => {
    if (!mapRef.current || !leafletModuleRef.current) return;
    const L = leafletModuleRef.current.default;

    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    if (!selectedPoint || typeof riderLat !== "number" || typeof riderLng !== "number") return;

    let disposed = false;
    async function drawRoadRoute() {
      try {
        const url = `${OSRM_ROUTE_ENDPOINT}/${riderLng},${riderLat};${selectedPoint.lng},${selectedPoint.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Route service unavailable");
        const data = (await res.json()) as {
          routes?: Array<{ geometry?: { coordinates?: [number, number][] } }>;
        };
        const coords = data.routes?.[0]?.geometry?.coordinates ?? [];
        if (coords.length < 2) throw new Error("No road route found");
        const latLngs: [number, number][] = coords.map(([lng, lat]) => [lat, lng]);
        if (disposed) return;
        routeLineRef.current = L.polyline(latLngs, {
          color: "#163625",
          weight: 5,
          opacity: 0.92,
        }).addTo(mapRef.current!);
      } catch {
        if (disposed) return;
        routeLineRef.current = L.polyline(
          [
            [riderLat, riderLng],
            [selectedPoint.lat, selectedPoint.lng],
          ],
          { color: "#163625", weight: 4, opacity: 0.85, dashArray: "8,6" },
        ).addTo(mapRef.current!);
      }
    }
    drawRoadRoute().catch(() => null);
    return () => {
      disposed = true;
    };
  }, [selectedPoint, riderLat, riderLng]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    let isDisposed = false;

    async function setupMap() {
      const leafletModule = await import("leaflet");
      if (isDisposed || !mapContainerRef.current) return;

      const L = leafletModule.default;
      leafletModuleRef.current = leafletModule;

      const map = L.map(mapContainerRef.current, {
        center: [23.8103, 90.4125],
        zoom: 11,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      mapRef.current = map;
    }

    setupMap().catch((mapError) => {
      console.error("Delivery map init failed:", mapError);
    });

    return () => {
      isDisposed = true;
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      if (routeLineRef.current) {
        routeLineRef.current.remove();
        routeLineRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      leafletModuleRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !leafletModuleRef.current) return;
    if (typeof riderLat !== "number" || typeof riderLng !== "number") return;

    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    const L = leafletModuleRef.current.default;
    const riderMarkerIcon = L.divIcon({
      className: "",
      html: `<div style="position:relative;width:24px;height:32px;">
        <div style="position:absolute;top:0;left:50%;width:24px;height:24px;background:#163625;border:2px solid #ffffff;border-radius:999px;transform:translateX(-50%);box-shadow:0 2px 6px rgba(15,23,42,.35);"></div>
        <div style="position:absolute;bottom:0;left:50%;width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:10px solid #163625;transform:translateX(-50%);"></div>
      </div>`,
      iconSize: [24, 32],
      iconAnchor: [12, 32],
      popupAnchor: [0, -30],
    });
    markerRef.current = L.marker([riderLat, riderLng], {
      icon: riderMarkerIcon,
    })
      .bindPopup(
        `<div style="font-family:system-ui,sans-serif;color:#0f172a;">
          <strong>Your current location</strong><br/>
          <span>${riderLat.toFixed(5)}, ${riderLng.toFixed(5)}</span>
        </div>`,
      )
      .addTo(mapRef.current);

    mapRef.current.flyTo([riderLat, riderLng], 14, { duration: 1 });
  }, [riderLat, riderLng]);

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
      <div className="mb-4 flex items-center justify-between rounded-2xl border border-[#d9e5d5] bg-[#eef4ea] p-3">
        <p className="text-xs font-semibold text-[#163625]/80">Direction view</p>
        <select
          value={directionFilter}
          onChange={(e) => setDirectionFilter(e.target.value as "ALL" | "TO_SHOP" | "TO_CUSTOMER")}
          className="rounded-lg border border-[#d9e5d5] bg-white px-3 py-2 text-xs font-bold text-[#163625]"
        >
          <option value="ALL">All directions</option>
          <option value="TO_SHOP">To Shop</option>
          <option value="TO_CUSTOMER">To Customer</option>
        </select>
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d9e5d5] bg-[#eef4ea] p-3">
        <p className="text-xs font-semibold text-[#163625]/80">
          {selectedPoint
            ? `Selected: ${selectedPoint.label} (${selectedPoint.lat.toFixed(5)}, ${selectedPoint.lng.toFixed(5)})`
            : "Select a pickup point marker to draw route"}
        </p>
        <button
          type="button"
          disabled={!selectedPoint || typeof riderLat !== "number" || typeof riderLng !== "number"}
          onClick={() => {
            if (!selectedPoint || typeof riderLat !== "number" || typeof riderLng !== "number") return;
            const url = `https://www.google.com/maps/dir/?api=1&origin=${riderLat},${riderLng}&destination=${selectedPoint.lat},${selectedPoint.lng}&travelmode=driving`;
            window.open(url, "_blank", "noopener,noreferrer");
          }}
          className="rounded-lg bg-[#163625] px-3 py-2 text-xs font-bold text-[#E4FCD5] disabled:opacity-50"
        >
          Navigate to selected point
        </button>
      </div>

      <div className="relative flex-1 rounded-2xl border border-[#d9e5d5] bg-white p-2">
        <div ref={mapContainerRef} className="h-full min-h-[360px] w-full rounded-xl" />
        <div className="pointer-events-none absolute right-4 top-4 rounded-lg bg-white/90 px-2 py-1 text-[11px] font-semibold text-[#163625]">
          OpenStreetMap + Leaflet
        </div>
        <div className="pointer-events-none absolute left-4 top-4 rounded-lg bg-white/90 px-3 py-2 text-[11px] font-semibold text-[#163625]">
          <span className="mr-3 inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#2563eb]" /> Customer pickup
          </span>
          <span className="mr-3 inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#16a34a]" /> Shop pickup
          </span>
          <span className="mr-3 inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-[#14532d]" /> Shop delivery
          </span>
          <span className="mr-3 inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-[#1e40af]" /> Customer delivery
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#163625]" /> Rider
          </span>
        </div>
        {error ? (
          <div className="absolute bottom-4 left-4 rounded-lg bg-red-100 px-3 py-2 text-xs font-semibold text-red-700">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
