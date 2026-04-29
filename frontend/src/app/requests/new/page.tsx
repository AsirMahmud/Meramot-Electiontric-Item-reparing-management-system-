"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "@/components/home/Navbar";
import { createRepairRequest } from "@/lib/api";
import { LOCATION_STORAGE_KEY, type StoredLocation } from "@/components/location/types";
import { buildLocationLabel, parseStoredLocation } from "@/components/location/location-utils";
import { pushLocalNotification } from "@/lib/notifications";

const DEVICE_TYPES = [
  "Laptop",
  "Desktop",
  "Mobile Phone",
  "Tablet",
  "Printer",
  "Camera",
  "Game Console",
  "Other",
];

const ISSUE_CATEGORIES = [
  "Screen or display",
  "Battery or charging",
  "Keyboard or touchpad",
  "Performance or overheating",
  "Water damage",
  "Speaker or microphone",
  "Camera issue",
  "Software or OS",
  "Network or connectivity",
  "Data recovery",
  "Parts replacement",
  "Other",
];

type CreateRepairRequestResult = {
  matchedShop?: {
    name?: string;
  } | null;
  delivery?: unknown | null;
};

export default function NewRequestPage() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const shopSlug = searchParams.get("shop") || "";

  const [selectedLocation, setSelectedLocation] = useState<StoredLocation | null>(null);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    deviceType: "Laptop",
    brand: "",
    model: "",
    issueCategory: "Checkup and diagnosis",
    problem: "",
    mode: shopSlug ? "DIRECT_REPAIR" : "CHECKUP_AND_REPAIR",
    preferredPickup: true,
    deliveryType: "REGULAR",
    scheduleType: "NOW",
    scheduledAt: "",
    addressMode: "MANUAL",
    pickupAddress: "",
    pickupCity: "",
    pickupArea: "",
    pickupLat: "",
    pickupLng: "",
    contactPhone: "",
  });

  const token = (session?.user as { accessToken?: string } | undefined)?.accessToken;

  const flowTitle = useMemo(
    () => (shopSlug ? `Direct order with ${shopSlug}` : "Market flow request"),
    [shopSlug]
  );

  function applySelectedLocation(location: StoredLocation | null) {
    setSelectedLocation(location);

    if (!location) return;

    setForm((prev) => ({
      ...prev,
      addressMode: "MAP",
      pickupAddress: location.address || buildLocationLabel(location),
      pickupCity: location.city || "",
      pickupArea: location.area || "",
      pickupLat: typeof location.lat === "number" ? String(location.lat) : "",
      pickupLng: typeof location.lng === "number" ? String(location.lng) : "",
    }));
  }

  useEffect(() => {
    applySelectedLocation(parseStoredLocation());

    function handleLocationChange(event: Event) {
      const customEvent = event as CustomEvent<StoredLocation>;
      applySelectedLocation(customEvent.detail || parseStoredLocation());
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === LOCATION_STORAGE_KEY) {
        applySelectedLocation(parseStoredLocation());
      }
    }

    window.addEventListener("meramot-location-changed", handleLocationChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("meramot-location-changed", handleLocationChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  function useSavedMapLocation() {
    const storedLocation = parseStoredLocation();

    if (!storedLocation) {
      setMessage("Choose your location from the navbar first, then return to this request.");
      return;
    }

    applySelectedLocation(storedLocation);
    setToast("Map location attached to this request.");
  }

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(timeout);
  }, [toast]);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Navbar isLoggedIn={!!session?.user} firstName={session?.user?.name?.split(" ")[0]} />

      {toast && (
       <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center px-4">
         <div className="rounded-2xl bg-[var(--accent-dark)] px-5 py-3 text-sm font-medium text-white shadow-xl">
           {toast}
         </div>
       </div>
      )}

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            Create request
          </p>

          <h1 className="mt-2 text-3xl font-bold">{flowTitle}</h1>

          <p className="mt-2 text-[var(--muted-foreground)]">
            Tell us what needs fixing. We will match your request with a suitable vendor and
            schedule pickup if selected.
          </p>

          <form
            className="mt-8 grid gap-4 md:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              setMessage("");

              if (!session?.user) {
                setMessage("Please log in first.");
                return;
              }

              if (!token) {
                setMessage("Your session token is missing. Please sign out and sign in again.");
                return;
              }

              if (form.preferredPickup && form.addressMode !== "PROFILE" && !form.pickupAddress.trim()) {
                setMessage("Please add a pickup location.");
                return;
              }

              try {
                setIsSubmitting(true);

                type CreateRepairRequestResult = {
                  matchedShop?: {
                    name?: string;
                  } | null;
                  delivery?: unknown | null;
                };
                
                const result = (await createRepairRequest(
                  {
                    title: form.title,
                    description: "",
                    deviceType: form.deviceType,
                    brand: form.brand,
                    model: form.model,
                    issueCategory: form.issueCategory,
                    problem: form.problem,
                    mode: form.mode,
                    preferredPickup: form.preferredPickup,
                    deliveryType: form.deliveryType,
                    scheduleType: form.scheduleType,
                    scheduledAt: form.scheduledAt || undefined,
                    addressMode: form.addressMode,
                    address: form.pickupAddress,
                    city: form.pickupCity,
                    area: form.pickupArea,
                    pickupLat: form.pickupLat,
                    pickupLng: form.pickupLng,
                    contactPhone: form.contactPhone,
                    shopSlug: shopSlug || undefined,
                  },
                  token
                )) as CreateRepairRequestResult;
                
                const matchedShop = result.matchedShop?.name
                  ? ` Matched with ${result.matchedShop.name}.`
                  : "";
                
                const delivery = result.delivery ? " Pickup delivery has been scheduled." : "";

                const messageText = `Request submitted successfully.${matchedShop}${delivery}`;

                setToast(messageText);

                pushLocalNotification({
                  title: "Request submitted",
                  message: messageText,
                  type: "request",
                  href: "/orders",
                });
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "Failed to submit request.");
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            <input
              required
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
              placeholder="Request title"
            />

            <select
              required
              value={form.deviceType}
              onChange={(e) => setForm((prev) => ({ ...prev, deviceType: e.target.value }))}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
            >
              {DEVICE_TYPES.map((device) => (
                <option key={device} value={device}>
                  {device}
                </option>
              ))}
            </select>

            <input
              value={form.brand}
              onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
              placeholder="Brand"
            />

            <input
              value={form.model}
              onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
              placeholder="Model"
            />

            <select
              required
              value={form.issueCategory}
              onChange={(e) => setForm((prev) => ({ ...prev, issueCategory: e.target.value }))}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
            >
              {ISSUE_CATEGORIES.map((issue) => (
                <option key={issue} value={issue}>
                  {issue}
                </option>
              ))}
            </select>

            <select
              value={form.mode}
              onChange={(e) => setForm((prev) => ({ ...prev, mode: e.target.value }))}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
            >
              <option value="CHECKUP_ONLY">Checkup only</option>
              <option value="DIRECT_REPAIR">Direct repair</option>
              <option value="CHECKUP_AND_REPAIR">Checkup and repair</option>
            </select>

            <select
              value={form.deliveryType}
              onChange={(e) => setForm((prev) => ({ ...prev, deliveryType: e.target.value }))}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
            >
              <option value="REGULAR">Regular delivery</option>
              <option value="EXPRESS">Express delivery</option>
            </select>

            <label className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
              <input
                type="checkbox"
                checked={form.preferredPickup}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, preferredPickup: e.target.checked }))
                }
                className="h-4 w-4 accent-[var(--accent-dark)]"
              />
              Schedule pickup delivery
            </label>

            {form.preferredPickup && (
              <>
                <select
                  value={form.scheduleType}
                  onChange={(e) => setForm((prev) => ({ ...prev, scheduleType: e.target.value }))}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
                >
                  <option value="NOW">Pickup as soon as possible</option>
                  <option value="LATER">Schedule pickup time</option>
                </select>

                <input
                  value={form.contactPhone}
                  onChange={(e) => setForm((prev) => ({ ...prev, contactPhone: e.target.value }))}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
                  placeholder="Contact phone"
                />

                {form.scheduleType === "LATER" && (
                  <input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(e) => setForm((prev) => ({ ...prev, scheduledAt: e.target.value }))}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
                  />
                )}

                <div className="md:col-span-2 rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                        Pickup location
                      </p>
                      <h2 className="mt-1 text-2xl font-bold">Where should we pick it up?</h2>
                    </div>

                    {selectedLocation ? (
                      <div className="rounded-full bg-[var(--mint-100)] px-4 py-2 text-sm font-semibold text-[var(--accent-dark)]">
                        {buildLocationLabel(selectedLocation)}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <button
                      type="button"
                      onClick={useSavedMapLocation}
                      className={`rounded-[1.35rem] border px-4 py-3 text-left transition ${
                        form.addressMode === "MAP"
                          ? "border-[var(--accent-dark)] bg-[var(--mint-50)]"
                          : "border-[var(--border)] bg-[var(--card)]"
                      }`}
                    >
                      <div className="font-bold">Use map location</div>
                      <div className="mt-1 text-sm text-[var(--muted-foreground)]">
            
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, addressMode: "MANUAL" }))}
                      className={`rounded-[1.35rem] border px-4 py-3 text-left transition ${
                        form.addressMode === "MANUAL"
                          ? "border-[var(--accent-dark)] bg-[var(--mint-50)]"
                          : "border-[var(--border)] bg-[var(--card)]"
                      }`}
                    >
                      <div className="font-bold">Manual address</div>
                      <div className="mt-1 text-sm text-[var(--muted-foreground)]">
                        Type a pickup address.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, addressMode: "PROFILE" }))}
                      className={`rounded-[1.35rem] border px-4 py-3 text-left transition ${
                        form.addressMode === "PROFILE"
                          ? "border-[var(--accent-dark)] bg-[var(--mint-50)]"
                          : "border-[var(--border)] bg-[var(--card)]"
                      }`}
                    >
                      <div className="font-bold">Profile address</div>
                      <div className="mt-1 text-sm text-[var(--muted-foreground)]">
                        Use saved account info.
                      </div>
                    </button>
                  </div>

                  {selectedLocation ? (
                    <div className="mt-4 rounded-[1.4rem] border border-[var(--border)] bg-[var(--mint-50)] p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                        Selected from map
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-6">
                        {selectedLocation.address || buildLocationLabel(selectedLocation)}
                      </p>
                      {(selectedLocation.area || selectedLocation.city) && (
                        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                          {[selectedLocation.area, selectedLocation.city].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-[1.4rem] border border-dashed border-[var(--border)] bg-[var(--background)] p-4 text-sm font-semibold text-[var(--muted-foreground)]">
                      No map location selected yet. Use the location button in the navbar to pin one.
                    </div>
                  )}

                  {form.addressMode !== "PROFILE" ? (
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <label className="md:col-span-2">
                        <span className="text-sm font-semibold">Pickup address</span>
                        <textarea
                          value={form.pickupAddress}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              addressMode: "MANUAL",
                              pickupAddress: e.target.value,
                              pickupLat: "",
                              pickupLng: "",
                            }))
                          }
                          rows={3}
                          placeholder="House, road, block, landmark"
                          className="mt-2 w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--accent-dark)]"
                        />
                      </label>

                      <label>
                        <span className="text-sm font-semibold">City</span>
                        <input
                          value={form.pickupCity}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, pickupCity: e.target.value }))
                          }
                          placeholder="Dhaka"
                          className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--accent-dark)]"
                        />
                      </label>

                      <label>
                        <span className="text-sm font-semibold">Area</span>
                        <input
                          value={form.pickupArea}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, pickupArea: e.target.value }))
                          }
                          placeholder="Banani, Dhanmondi, Mirpur..."
                          className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--accent-dark)]"
                        />
                      </label>
                    </div>
                  ) : (
                    <p className="mt-5 rounded-2xl bg-[var(--mint-50)] px-4 py-3 text-sm font-semibold text-[var(--muted-foreground)]">
                      We will use the address saved in your profile. Use map/manual mode if this
                      request needs a different pickup point.
                    </p>
                  )}
                </div>
              </>
            )}

            <textarea
              required
              value={form.problem}
              onChange={(e) => setForm((prev) => ({ ...prev, problem: e.target.value }))}
              rows={5}
              className="md:col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
              placeholder="Describe the problem"
            />

            <div className="md:col-span-2">
              <button
                disabled={isSubmitting}
                className="rounded-full bg-[var(--accent-dark)] px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isSubmitting ? "Submitting..." : "Submit request"}
              </button>
            </div>
          </form>

          {message && <p className="mt-4 text-sm text-[var(--accent-dark)]">{message}</p>}
        </div>
      </div>
    </main>
  );
}