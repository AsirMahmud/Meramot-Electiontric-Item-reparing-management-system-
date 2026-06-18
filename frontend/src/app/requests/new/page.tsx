"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

function NewRequestPageContent() {
  const router = useRouter();
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
    issueCategory: "Screen or display",
    problem: "",
    mode: shopSlug ? "DIRECT_REPAIR" : "CHECKUP_AND_REPAIR",
    biddingMode: false,
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

      <div className="mx-auto max-w-5xl px-3 sm:px-4 py-6 md:py-8">
        <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-5 md:p-8 shadow-sm">
          <p className="text-[11px] sm:text-sm uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            Create request
          </p>

          <h1 className="mt-1 sm:mt-2 text-2xl md:text-3xl font-bold">{flowTitle}</h1>

          <p className="mt-2 text-sm md:text-base text-[var(--muted-foreground)]">
            Tell us what needs fixing. We will match your request with a suitable vendor and
            schedule pickup if selected.
          </p>

          <form
            className="mt-6 md:mt-8 flex flex-col gap-6 md:gap-8"
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
                    biddingMode: form.biddingMode,
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

                setTimeout(() => router.push("/orders"), 1500);
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "Failed to submit request.");
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            {/* Section 1: Device Details */}
            <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-5 md:p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3 border-b border-[var(--border)] pb-4">

                <h2 className="text-xl font-bold text-[var(--foreground)]">Device Details</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1.5 md:col-span-2">
                  <span className="text-sm font-semibold text-[var(--foreground)]">Request Title</span>
                  <input
                    required
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--accent-dark)]"
                    placeholder="e.g., Broken screen on my MacBook"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-[var(--foreground)]">Device Type</span>
                  <select
                    required
                    value={form.deviceType}
                    onChange={(e) => setForm((prev) => ({ ...prev, deviceType: e.target.value }))}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--accent-dark)]"
                  >
                    {DEVICE_TYPES.map((device) => (
                      <option key={device} value={device}>
                        {device}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-[var(--foreground)]">Brand (Optional)</span>
                  <input
                    value={form.brand}
                    onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--accent-dark)]"
                    placeholder="e.g., Apple, Samsung"
                  />
                </label>

                <label className="flex flex-col gap-1.5 md:col-span-2">
                  <span className="text-sm font-semibold text-[var(--foreground)]">Model (Optional)</span>
                  <input
                    value={form.model}
                    onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--accent-dark)]"
                    placeholder="e.g., MacBook Pro 2021 M1"
                  />
                </label>
              </div>
            </div>

            {/* Section 2: Issue Details */}
            <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-5 md:p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3 border-b border-[var(--border)] pb-4">

                <h2 className="text-xl font-bold text-[var(--foreground)]">Issue Details</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-[var(--foreground)]">Issue Category</span>
                  <select
                    required
                    value={form.issueCategory}
                    onChange={(e) => setForm((prev) => ({ ...prev, issueCategory: e.target.value }))}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--accent-dark)]"
                  >
                    {ISSUE_CATEGORIES.map((issue) => (
                      <option key={issue} value={issue}>
                        {issue}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-[var(--foreground)]">Service Mode</span>
                  <select
                    value={form.mode}
                    onChange={(e) => setForm((prev) => ({ ...prev, mode: e.target.value }))}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--accent-dark)]"
                  >
                    <option value="CHECKUP_ONLY">Checkup only</option>
                    <option value="DIRECT_REPAIR">Direct repair</option>
                    <option value="CHECKUP_AND_REPAIR">Checkup and repair</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1.5 md:col-span-2">
                  <span className="text-sm font-semibold text-[var(--foreground)]">Problem Description</span>
                  <textarea
                    required
                    value={form.problem}
                    onChange={(e) => setForm((prev) => ({ ...prev, problem: e.target.value }))}
                    rows={4}
                    className="resize-none rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--accent-dark)]"
                    placeholder="Describe exactly what's wrong with the device..."
                  />
                </label>
              </div>
            </div>

            {!shopSlug && (
              <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-5 md:p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3 border-b border-[var(--border)] pb-4">
                  <h2 className="text-xl font-bold text-[var(--foreground)]">Fulfillment Method</h2>
                </div>
                <div className="flex gap-4 flex-col md:flex-row">
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="radio"
                      name="biddingMode"
                      checked={!form.biddingMode}
                      onChange={() => setForm(prev => ({ ...prev, biddingMode: false }))}
                      className="peer sr-only"
                    />
                    <div className="h-full rounded-2xl border-2 border-[var(--border)] p-4 peer-checked:border-[var(--accent-dark)] peer-checked:bg-[var(--accent-dark)]/5 transition-all">
                      <p className="font-semibold text-base mb-1">Quick Match (Auto)</p>
                      <p className="text-sm text-[var(--muted-foreground)]">System instantly assigns the best shop for your device and issue.</p>
                    </div>
                  </label>
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="radio"
                      name="biddingMode"
                      checked={form.biddingMode}
                      onChange={() => setForm(prev => ({ ...prev, biddingMode: true }))}
                      className="peer sr-only"
                    />
                    <div className="h-full rounded-2xl border-2 border-[var(--border)] p-4 peer-checked:border-[var(--accent-dark)] peer-checked:bg-[var(--accent-dark)]/5 transition-all">
                      <p className="font-semibold text-base mb-1">Get Quotes (Bidding)</p>
                      <p className="text-sm text-[var(--muted-foreground)]">Local shops review your request and submit competitive bids for you to choose from.</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Section 3: Logistics & Pickup */}
            <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-5 md:p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3 border-b border-[var(--border)] pb-4">

                <h2 className="text-xl font-bold text-[var(--foreground)]">Logistics & Pickup</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-[var(--foreground)]">Delivery Speed</span>
                  <select
                    value={form.deliveryType}
                    onChange={(e) => setForm((prev) => ({ ...prev, deliveryType: e.target.value }))}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--accent-dark)]"
                  >
                    <option value="REGULAR">Regular delivery</option>
                    <option value="EXPRESS">Express delivery</option>
                  </select>
                </label>

                <label className="mt-auto flex h-[50px] items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3">
                  <input
                    type="checkbox"
                    checked={form.preferredPickup}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, preferredPickup: e.target.checked }))
                    }
                    className="h-4 w-4 accent-[var(--accent-dark)]"
                  />
                  <span className="text-sm font-semibold text-[var(--foreground)]">Schedule pickup delivery</span>
                </label>

                {form.preferredPickup && (
                  <>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-sm font-semibold text-[var(--foreground)]">Pickup Time</span>
                      <select
                        value={form.scheduleType}
                        onChange={(e) => setForm((prev) => ({ ...prev, scheduleType: e.target.value }))}
                        className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--accent-dark)]"
                      >
                        <option value="NOW">Pickup as soon as possible</option>
                        <option value="LATER">Schedule pickup time</option>
                      </select>
                    </label>

                    {form.scheduleType === "LATER" ? (
                      <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-semibold text-[var(--foreground)]">Date & Time</span>
                        <input
                          type="datetime-local"
                          value={form.scheduledAt}
                          onChange={(e) => setForm((prev) => ({ ...prev, scheduledAt: e.target.value }))}
                          className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--accent-dark)]"
                        />
                      </label>
                    ) : (
                      <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-semibold text-[var(--foreground)]">Contact Phone</span>
                        <input
                          value={form.contactPhone}
                          onChange={(e) => setForm((prev) => ({ ...prev, contactPhone: e.target.value }))}
                          className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--accent-dark)]"
                          placeholder="e.g., 01700000000"
                        />
                      </label>
                    )}

                    {form.scheduleType === "LATER" && (
                      <label className="md:col-span-2 flex flex-col gap-1.5">
                        <span className="text-sm font-semibold text-[var(--foreground)]">Contact Phone</span>
                        <input
                          value={form.contactPhone}
                          onChange={(e) => setForm((prev) => ({ ...prev, contactPhone: e.target.value }))}
                          className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--accent-dark)]"
                          placeholder="e.g., 01700000000"
                        />
                      </label>
                    )}

                    <div className="md:col-span-2 mt-4 rounded-[1.5rem] border border-[var(--border)] bg-[var(--background)] p-4 md:p-5">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-[10px] md:text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                            Pickup location
                          </p>
                          <h3 className="mt-1 text-lg font-bold">Where should we pick it up?</h3>
                        </div>

                        {selectedLocation ? (
                          <div className="rounded-full bg-[var(--mint-100)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-dark)] md:text-sm md:px-4 md:py-2">
                            {buildLocationLabel(selectedLocation)}
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
                        <button
                          type="button"
                          onClick={useSavedMapLocation}
                          className={`rounded-[1.2rem] border px-3 py-2.5 text-left transition sm:px-4 sm:py-3 ${form.addressMode === "MAP"
                            ? "border-[var(--accent-dark)] bg-[var(--mint-50)]"
                            : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent-dark)]/50"
                            }`}
                        >
                          <div className="text-sm font-bold sm:text-base">Use map location</div>
                          <div className="mt-0.5 text-xs text-[var(--muted-foreground)] sm:mt-1 sm:text-sm">
                            Your Current Location
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, addressMode: "MANUAL" }))}
                          className={`rounded-[1.2rem] border px-3 py-2.5 text-left transition sm:px-4 sm:py-3 ${form.addressMode === "MANUAL"
                            ? "border-[var(--accent-dark)] bg-[var(--mint-50)]"
                            : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent-dark)]/50"
                            }`}
                        >
                          <div className="text-sm font-bold sm:text-base">Manual address</div>
                          <div className="mt-0.5 text-xs text-[var(--muted-foreground)] sm:mt-1 sm:text-sm">
                            Type address
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, addressMode: "PROFILE" }))}
                          className={`rounded-[1.2rem] border px-3 py-2.5 text-left transition sm:px-4 sm:py-3 ${form.addressMode === "PROFILE"
                            ? "border-[var(--accent-dark)] bg-[var(--mint-50)]"
                            : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent-dark)]/50"
                            }`}
                        >
                          <div className="text-sm font-bold sm:text-base">Profile address</div>
                          <div className="mt-0.5 text-xs text-[var(--muted-foreground)] sm:mt-1 sm:text-sm">
                            Saved info
                          </div>
                        </button>
                      </div>

                      {selectedLocation ? (
                        <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--mint-50)] p-4">
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                            Selected from map
                          </p>
                          <p className="mt-2 text-sm font-semibold leading-relaxed">
                            {selectedLocation.address || buildLocationLabel(selectedLocation)}
                          </p>
                          {(selectedLocation.area || selectedLocation.city) && (
                            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                              {[selectedLocation.area, selectedLocation.city].filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="mt-4 rounded-2xl border border-dashed border-[var(--border)] p-4 text-xs font-semibold text-[var(--muted-foreground)]">
                          No map location selected yet. Use the location button in the navbar to pin one.
                        </div>
                      )}

                      {form.addressMode !== "PROFILE" ? (
                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                          <label className="md:col-span-2 flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-[var(--foreground)]">Pickup Address</span>
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
                              rows={2}
                              placeholder="House, road, block, landmark"
                              className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent-dark)]"
                            />
                          </label>

                          <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-[var(--foreground)]">City</span>
                            <input
                              value={form.pickupCity}
                              onChange={(e) =>
                                setForm((prev) => ({ ...prev, pickupCity: e.target.value }))
                              }
                              placeholder="Dhaka"
                              className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent-dark)]"
                            />
                          </label>

                          <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-[var(--foreground)]">Area</span>
                            <input
                              value={form.pickupArea}
                              onChange={(e) =>
                                setForm((prev) => ({ ...prev, pickupArea: e.target.value }))
                              }
                              placeholder="Banani, Dhanmondi..."
                              className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent-dark)]"
                            />
                          </label>
                        </div>
                      ) : (
                        <p className="mt-4 rounded-2xl bg-[var(--mint-50)] px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)]">
                          We will use the address saved in your profile.
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div>
              <button
                disabled={isSubmitting}
                className="w-full md:w-auto rounded-full bg-[var(--accent-dark)] px-8 py-4 text-base font-bold text-white transition hover:opacity-95 disabled:opacity-60 shadow-sm"
              >
                {isSubmitting ? "Submitting Request..." : "Submit Repair Request"}
              </button>
            </div>
          </form>

          {message && <p className="mt-4 text-sm text-[var(--accent-dark)]">{message}</p>}
        </div>
      </div>
    </main>
  );
}

export default function NewRequestPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
      <NewRequestPageContent />
    </Suspense>
  );
}