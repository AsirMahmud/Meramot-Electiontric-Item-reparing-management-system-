"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "@/components/home/Navbar";
import { createRepairRequest, uploadImages } from "@/lib/api";
import { LOCATION_STORAGE_KEY, type StoredLocation } from "@/components/location/types";
import { buildLocationLabel, parseStoredLocation } from "@/components/location/location-utils";
import { pushLocalNotification } from "@/lib/notifications";
import DeviceAiMatch from "@/components/requests/DeviceAiMatch";
import { Sparkles, Loader2 } from "lucide-react";

const DEVICE_TYPES = [
  "Laptop",
  "Desktop",
  "Mobile Phone",
  "Tablet",
  "Smartwatch",
  "Fitness Tracker",
  "Headphones/Earbuds",
  "Smart TV",
  "Monitor",
  "Speaker",
  "Printer",
  "Scanner",
  "Camera",
  "Action Camera",
  "Game Console",
  "VR Headset",
  "Router/Modem",
  "Drone",
  "Projector",
  "Power Bank",
  "UPS",
  "E-Reader",
  "External Storage",
  "Keyboard",
  "Streaming Device",
  "Dash Cam",
  "GPS Device",
  "Smart Home Device",
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

function NewRequestPageInner() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const shopSlug = searchParams.get("shop") || "";

  const [selectedLocation, setSelectedLocation] = useState<StoredLocation | null>(null);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [modelSuggestions, setModelSuggestions] = useState<{brand: string; model: string; specs: string}[]>([]);
  const [checkingModel, setCheckingModel] = useState(false);
  const [deeperSearch, setDeeperSearch] = useState(false);
  const [isAppliance, setIsAppliance] = useState(false);
  const [isRubbish, setIsRubbish] = useState(false);
  const [activeField, setActiveField] = useState<"brand" | "model" | null>(null);
  const suggestAbortController = useRef<AbortController | null>(null);
  const skipNextSuggest = useRef(false);
  const issueClassified = useRef(false);
  const [classifyingIssue, setClassifyingIssue] = useState(false);
  const [issueCategories, setIssueCategories] = useState<string[]>(ISSUE_CATEGORIES);
  const [deviceTypes, setDeviceTypes] = useState<string[]>(DEVICE_TYPES);

  const [form, setForm] = useState({
    title: "",
    deviceType: "Laptop",
    brand: "",
    model: "",
    displaySize: "",
    chipset: "",
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

  useEffect(() => {
    const handler = setTimeout(async () => {
      const brand = form.brand.trim();
      const model = form.model.trim();
      
      if (brand.length > 2 || model.length > 2) {
        // Skip if this was triggered by selecting a suggestion
        if (skipNextSuggest.current) {
          skipNextSuggest.current = false;
          return;
        }
        setCheckingModel(true);
        // Reset flags when searching again
        setIsAppliance(false);
        setIsRubbish(false);

        // Cancel previous request if still pending
        if (suggestAbortController.current) {
          suggestAbortController.current.abort();
        }
        suggestAbortController.current = new AbortController();

        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ai/suggest-model`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ brand, model, deeperSearch }),
            signal: suggestAbortController.current.signal
          });
          const data = await res.json();
          if (data.ok) {
            setIsAppliance(!!data.isAppliance);
            setIsRubbish(!!data.isRubbish);
            
            if (data.isAppliance || data.isRubbish) {
              setModelSuggestions([]);
              return;
            }
            
            if (data.suggestions && data.suggestions.length > 0) {
              // Check if first suggestion is literally what they typed for both brand and model
              const first = data.suggestions[0];
              const lowerSugModel = first.model.toLowerCase();
              const lowerMod = model.toLowerCase();
              const lowerSugBrand = first.brand.toLowerCase();
              const lowerBrand = brand.toLowerCase();
              
              if (lowerSugModel === lowerMod && lowerSugBrand === lowerBrand && data.suggestions.length === 1 && !deeperSearch) {
                setModelSuggestions([]);
              } else {
                setModelSuggestions(data.suggestions);
              }
            } else {
              setModelSuggestions([]);
            }
          } else {
            setModelSuggestions([]);
          }
        } catch (err: any) {
          if (err.name === 'AbortError') {
            return; // Ignore aborted requests
          }
          setModelSuggestions([]);
        } finally {
          setCheckingModel(false);
        }
      } else {
        setModelSuggestions([]);
        setIsAppliance(false);
        setIsRubbish(false);
      }
    }, 1200);

    return () => clearTimeout(handler);
  }, [form.brand, form.model, deeperSearch]);

  // Auto-classify issue category from problem description (6s debounce)
  useEffect(() => {
    const problem = form.problem.trim();
    if (problem.length < 10) return;
    issueClassified.current = false;

    const handler = setTimeout(async () => {
      try {
        setClassifyingIssue(true);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ai/classify-issue`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ problem })
        });
        const data = await res.json();
        if (data.ok && data.issueCategory) {
          // If AI created a new category, add it to the dropdown
          if (data.isNew && !issueCategories.includes(data.issueCategory)) {
            setIssueCategories(prev => {
              const otherIdx = prev.indexOf("Other");
              const newList = [...prev];
              newList.splice(otherIdx >= 0 ? otherIdx : newList.length, 0, data.issueCategory);
              return newList;
            });
          }
          setForm(prev => ({ ...prev, issueCategory: data.issueCategory }));
          issueClassified.current = true;
        }
      } catch { /* ignore */ }
      finally { setClassifyingIssue(false); }
    }, 6000);

    return () => clearTimeout(handler);
  }, [form.problem]);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Navbar isLoggedIn={!!session?.user} firstName={session?.user?.name?.split(" ")[0]} />

      {toast && (
       <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center px-4">
         <div className="rounded-2xl bg-[var(--accent-dark)] px-5 py-3 text-sm font-medium text-[var(--accent-foreground)] shadow-xl">
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

                // If AI didn't classify yet, fire it in background
                const shouldClassifyAfter = !issueClassified.current && form.problem.trim().length >= 10;

                type CreateRepairRequestResult = {
                  matchedShop?: {
                    name?: string;
                  } | null;
                  delivery?: unknown | null;
                };

                let uploadedImageUrls: string[] = [];
                if (files.length > 0) {
                  const uploadResult = await uploadImages(files, token);
                  uploadedImageUrls = uploadResult.imageUrls;
                }
                
                const result = (await createRepairRequest(
                  {
                    title: form.title,
                    description: "",
                    deviceType: form.deviceType,
                    brand: form.brand,
                    model: [
                      form.model,
                      form.deviceType === "Laptop" && form.displaySize.trim() ? `(${form.displaySize})` : "",
                      form.deviceType === "Mobile Phone" && form.brand.toLowerCase() === "samsung" && form.chipset.trim() ? `(${form.chipset})` : ""
                    ].filter(Boolean).join(" "),
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
                    imageUrls: uploadedImageUrls,
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

                // Fire-and-forget: classify issue in background if AI didn't get to it
                if (shouldClassifyAfter) {
                  fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ai/classify-issue`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ problem: form.problem.trim() })
                  }).then(r => r.json()).then(data => {
                    if (data.ok && data.issueCategory) {
                      // Update the request's issue category on the server
                      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/repair-requests/update-category`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ problem: form.problem.trim(), issueCategory: data.issueCategory })
                      }).catch(() => {});
                    }
                  }).catch(() => {});
                }
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
              {deviceTypes.map((device) => (
                <option key={device} value={device}>
                  {device}
                </option>
              ))}
            </select>

            <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
              <div className="relative">
                <input
                  value={form.brand}
                  onFocus={() => setActiveField("brand")}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, brand: e.target.value }));
                    setDeeperSearch(false);
                    setActiveField("brand");
                  }}
                  className={`w-full rounded-2xl border ${modelSuggestions.length > 0 && activeField === "brand" ? 'border-[var(--accent-dark)]' : 'border-[var(--border)]'} bg-[var(--card)] px-4 py-3 outline-none focus:border-[var(--accent-dark)]`}
                  placeholder="Brand"
                />
                {checkingModel && activeField === "brand" && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[var(--muted-foreground)]">
                    checking...
                  </span>
                )}
              </div>

              <div className="relative">
                <input
                  value={form.model}
                  onFocus={() => setActiveField("model")}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, model: e.target.value }));
                    setDeeperSearch(false);
                    setActiveField("model");
                  }}
                  className={`w-full rounded-2xl border ${modelSuggestions.length > 0 && activeField === "model" ? 'border-[var(--accent-dark)]' : 'border-[var(--border)]'} bg-[var(--card)] px-4 py-3 outline-none focus:border-[var(--accent-dark)]`}
                  placeholder="Model"
                />
                {checkingModel && activeField === "model" && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[var(--muted-foreground)]">
                    checking...
                  </span>
                )}
              </div>

              {form.deviceType === "Laptop" && (
                <div className="relative md:col-span-2">
                  <input
                    value={form.displaySize}
                    onChange={(e) => setForm((prev) => ({ ...prev, displaySize: e.target.value }))}
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 outline-none focus:border-[var(--accent-dark)]"
                    placeholder="Display Size (e.g. 15.6&quot;)"
                  />
                </div>
              )}

              {form.deviceType === "Mobile Phone" && form.brand.toLowerCase() === "samsung" && (
                <div className="relative md:col-span-2">
                  <input
                    value={form.chipset}
                    onChange={(e) => setForm((prev) => ({ ...prev, chipset: e.target.value }))}
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 outline-none focus:border-[var(--accent-dark)]"
                    placeholder="Chipset (e.g. Snapdragon, Exynos)"
                  />
                </div>
              )}

              {/* AI Assistant Suggestions spanning both columns */}
              <div className="md:col-span-2">
                <DeviceAiMatch 
                  checkingModel={checkingModel}
                  activeField={activeField}
                  isAppliance={isAppliance}
                  isRubbish={isRubbish}
                  modelSuggestions={modelSuggestions}
                  deeperSearch={deeperSearch}
                  onSelectSuggestion={(brand, model, deviceType) => {
                    skipNextSuggest.current = true;
                    // If AI returned a new device type not in the list, add it dynamically
                    if (deviceType && !deviceTypes.includes(deviceType)) {
                      setDeviceTypes(prev => {
                        const otherIdx = prev.indexOf("Other");
                        const newList = [...prev];
                        newList.splice(otherIdx >= 0 ? otherIdx : newList.length, 0, deviceType);
                        return newList;
                      });
                    }
                    setForm(prev => ({
                      ...prev, 
                      brand, 
                      model,
                      ...(deviceType ? { deviceType } : {})
                    }));
                    setModelSuggestions([]);
                    setCheckingModel(false);
                  }}
                  onSearchDeeper={() => setDeeperSearch(true)}
                />
              </div>
            </div>

            <div className="relative">
              <select
                required
                value={form.issueCategory}
                onChange={(e) => { setForm((prev) => ({ ...prev, issueCategory: e.target.value })); issueClassified.current = true; }}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
              >
                {issueCategories.map((issue) => (
                  <option key={issue} value={issue}>
                    {issue}
                  </option>
                ))}
              </select>
              {classifyingIssue && (
                <span className="absolute right-10 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--accent-dark)] animate-pulse">
                  AI selecting...
                </span>
              )}
            </div>

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
              <label className="mb-2 block text-sm font-semibold text-[var(--foreground)]">
                Upload Images (Max 4)
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files) {
                    const selected = Array.from(e.target.files).slice(0, 4);
                    setFiles(selected);
                  }
                }}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 file:mr-4 file:rounded-full file:border-0 file:bg-[var(--accent-dark)] file:px-4 file:py-2 file:text-sm file:font-bold file:text-[var(--accent-foreground)] hover:file:opacity-90"
              />
              {files.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2 text-sm text-[var(--muted-foreground)]">
                  {files.map((f, i) => (
                    <span key={i} className="inline-block rounded border border-[var(--border)] bg-[var(--card)] px-2 py-1 font-medium">
                      {f.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <button
                disabled={isSubmitting}
                className="rounded-full bg-[var(--accent-dark)] px-6 py-3 text-sm font-semibold text-[var(--accent-foreground)] disabled:opacity-60"
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

import { Suspense } from "react";

export default function NewRequestPage() {
  return (
    <Suspense fallback={<div>Loading page...</div>}>
      <NewRequestPageInner />
    </Suspense>
  );
}