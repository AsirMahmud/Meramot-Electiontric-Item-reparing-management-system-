"use client";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { MapPin, ImagePlus, Loader2, X } from "lucide-react";
import { completeVendorShopSetup, getVendorApplicationStatus, getShops } from "@/lib/api";
import { useUploadThing } from "@/lib/uploadthing";
import { validateBDPhone } from "@/lib/validate-phone";
import LocationPickerModal from "@/components/location/LocationPickerModal";
import type { StoredLocation } from "@/components/location/types";
import { forwardGeocode } from "@/components/location/location-utils";

type VendorStatusPayload = {
  application?: {
    id: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    ownerName: string;
    businessEmail: string;
    shopName: string;
    phone: string;
    address: string;
    city: string;
    area: string;
    notes?: string | null;
    logoUrl?: string | null;
    specialties: string[];
    courierPickup: boolean;
    inShopRepair: boolean;
    spareParts: boolean;
    rejectionReason?: string | null;
    rejectionVisibleUntil?: string | null;
    createdAt: string;
    setupComplete?: boolean;
    isPublic?: boolean;
    inspectionFee?: number | null;
    baseLaborFee?: number | null;
    pickupFee?: number | null;
    expressFee?: number | null;
    lat?: number | null;
    lng?: number | null;
  };
  message?: string;
};

const PRESET_SKILL_TAGS = [
  "Apple products",
  "Android phones",
  "Laptop motherboard",
  "Gaming PC",
  "Printer repair",
  "Phone screen",
  "MacBook repair",
  "Desktop servicing",
  "Custom build PC",
  "Battery replacement",
] as const;

export default function VendorSetupShopPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const role = (session?.user as { role?: string; accessToken?: string } | undefined)?.role;
  const token = (session?.user as { accessToken?: string } | undefined)?.accessToken;

  const [shopName, setShopName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [loadingPrefill, setLoadingPrefill] = useState(true);

  const [courierPickup, setCourierPickup] = useState(false);
  const [inShopRepair, setInShopRepair] = useState(true);
  const [spareParts, setSpareParts] = useState(false);

  const [inspectionFee, setInspectionFee] = useState("");
  const [baseLaborFee, setBaseLaborFee] = useState("");
  const [pickupFee, setPickupFee] = useState("");
  const [expressFee, setExpressFee] = useState("");

  const [services, setServices] = useState<{name: string, price: string}[]>([]);
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  const { startUpload } = useUploadThing("shopLogoUploader");

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    setFormError("");
    try {
      const res = await startUpload([file]);
      if (res?.[0]?.ufsUrl) {
        setLogoUrl(res[0].ufsUrl);
      }
    } catch (err) {
      setFormError(`Logo upload failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLogoUploading(false);
    }
  };
   useEffect(() => {
    if (status === "loading") return;

    async function loadPrefill() {
      if (!session?.user) {
        router.replace("/login");
        return;
      }

      if (role !== "VENDOR") {
        router.replace("/");
        return;
      }

      try {
        if (!token) {
          setLoadingPrefill(false);
          return;
        }

        const result = (await getVendorApplicationStatus(token)) as VendorStatusPayload;
        const app = result?.application;

if (app) {
    setIsEditMode(Boolean(app.setupComplete));

    setShopName(app.shopName || "");
    setLogoUrl(app.logoUrl || "");
    setDescription(app.notes || "");
    setPhone(app.phone || "");
    setAddress(app.address || "");
    setCity(app.city || "");
    setArea(app.area || "");
    setLat(app.lat ?? null);
    setLng(app.lng ?? null);

    setCourierPickup(Boolean(app.courierPickup));
    setInShopRepair(Boolean(app.inShopRepair));
    setSpareParts(Boolean(app.spareParts));

    setInspectionFee(
    app.inspectionFee !== null && app.inspectionFee !== undefined
      ? String(app.inspectionFee)
      : ""
  );
  setBaseLaborFee(
    app.baseLaborFee !== null && app.baseLaborFee !== undefined
      ? String(app.baseLaborFee)
      : ""
  );
  setPickupFee(
    app.pickupFee !== null && app.pickupFee !== undefined
      ? String(app.pickupFee)
      : ""
  );
  setExpressFee(
    app.expressFee !== null && app.expressFee !== undefined
      ? String(app.expressFee)
      : ""
  );
          const loadedServices: {name: string, price: string}[] = [];
          for (const rawTag of app.specialties || []) {
            const normalized = rawTag.trim();
            if (!normalized) continue;

            if (normalized.includes("|")) {
              const parts = normalized.split("|");
              loadedServices.push({ name: parts[0], price: parts[1] });
            } else {
              loadedServices.push({ name: normalized, price: "" });
            }
          }

          setServices(loadedServices);

          // Fetch suggestions
          getShops({ take: 100 }).then(data => {
            const allSpecialties = new Set<string>([...PRESET_SKILL_TAGS]);
            data.forEach(shop => {
              (shop.specialties || []).forEach(spec => {
                const name = spec.includes("|") ? spec.split("|")[0] : spec;
                allSpecialties.add(name);
              });
            });
            setSuggestions(Array.from(allSpecialties));
          }).catch(console.error);

        }
      } catch {
        // keep empty defaults for now
      } finally {
        setLoadingPrefill(false);
      }
    }

    loadPrefill();
  }, [session, status, role, router, token]);

  const allSkillTags = useMemo(
    () => services.map(s => s.price ? `${s.name}|${s.price}` : s.name),
    [services]
  );

  function addService() {
    const normalizedName = serviceName.trim();
    if (!normalizedName) return;

    const alreadyExists = services.some(
      (s) => s.name.toLowerCase() === normalizedName.toLowerCase()
    );

    if (alreadyExists) {
      setServiceName("");
      setServicePrice("");
      return;
    }

    setServices((prev) => [...prev, { name: normalizedName, price: servicePrice.trim() }]);
    setServiceName("");
    setServicePrice("");
    setShowSuggestions(false);
  }

  function removeService(nameToRemove: string) {
    setServices((prev) => prev.filter((s) => s.name !== nameToRemove));
  }

  function togglePresetTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    );
  }

  function addCustomTag() {
    const normalized = customTagInput.trim();
    if (!normalized) return;

    const alreadyExists = [...selectedTags, ...customTags].some(
      (tag) => tag.toLowerCase() === normalized.toLowerCase()
    );

    if (alreadyExists) {
      setCustomTagInput("");
      return;
    }

    setCustomTags((prev) => [...prev, normalized]);
    setCustomTagInput("");
  }

  function removeCustomTag(tagToRemove: string) {
    setCustomTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  }

    function validateForm() {
    if (!shopName.trim()) return "Shop name is required";
    const phoneError = validateBDPhone(phone);
    if (phoneError) return phoneError;
    if (!address.trim()) return "Address is required";
    if (!courierPickup && !inShopRepair && !spareParts) {
      return "Select at least one service option";
    }
    if (!inspectionFee || Number(inspectionFee) < 0) {
      return "Inspection / diagnosis fee is required";
    }
    if (!baseLaborFee || Number(baseLaborFee) < 0) {
      return "Base labor fee is required";
    }
    if (allSkillTags.length === 0) {
      return "Add at least one skill tag";
    }
    return "";
  }
 async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  setFormError("");

  const validationError = validateForm();
  if (validationError) {
    setFormError(validationError);
    return;
  }

  if (!token) {
    setFormError("You are not logged in");
    return;
  }

  try {
    setSubmitting(true);

    await completeVendorShopSetup(token, {
      shopName: shopName.trim(),
      logoUrl: logoUrl || undefined,
      description: description.trim() || "",
      phone: phone.trim(),
      address: address.trim(),
      city: city.trim() || "",
      area: area.trim() || "",
      courierPickup,
      inShopRepair,
      spareParts,
      inspectionFee: Number(inspectionFee),
      baseLaborFee: Number(baseLaborFee),
      pickupFee: pickupFee ? Number(pickupFee) : null,
      expressFee: expressFee ? Number(expressFee) : null,
      skillTags: allSkillTags,
      lat,
      lng,
    });

    router.push("/");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save shop setup";
    setFormError(message);
  } finally {
    setSubmitting(false);
  }
}

  if (status === "loading" || loadingPrefill) {
    return (
      <main className="grid min-h-screen place-items-center">
        <p className="text-sm text-slate-600">Loading shop setup...</p>
      </main>
    );
  }

  if (!session?.user || role !== "VENDOR") {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-mint-300 via-mint-200 to-mint-50 px-4 py-10">
      <div className="mx-auto max-w-5xl rounded-[2rem] border border-white/60 bg-white/90 p-6 shadow-2xl backdrop-blur md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#58725f]">
          Vendor
        </p>

      <h1 className="mt-2 text-2xl font-bold text-accent-dark md:text-3xl">
        {isEditMode ? "Edit vendor details" : "Set up your shop"}
        </h1>
       <p className="mt-3 max-w-3xl text-sm text-slate-600">
  {isEditMode
    ? "Update your shop information, services, pricing, and skill tags here."
    : "Complete your shop profile before you start operating as a vendor. Your shop should only go live after you set your own pricing, services, skill tags, and business details."}
</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        {formError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {formError}
            </div>
        ) : null}
          <section className="rounded-3xl bg-[#f6faf4] p-5">
            <h2 className="text-lg font-semibold text-accent-dark">
              Shop identity
            </h2>

            <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row md:gap-5">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[1.5rem] border-2 border-dashed border-border bg-[var(--mint-50)] transition-colors hover:border-accent-dark dark:bg-[#1a2e22] md:h-28 md:w-28">
                {logoUrl ? (
                  <>
                    <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setLogoUrl("")}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white backdrop-blur-sm transition-colors hover:bg-red-500"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : logoUploading ? (
                  <div className="flex h-full w-full flex-col items-center justify-center text-accent-dark">
                    <Loader2 size={24} className="mb-1 animate-spin" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Uploading…</span>
                  </div>
                ) : (
                  <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center text-muted-foreground transition-colors hover:text-accent-dark">
                    <ImagePlus size={24} className="mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Logo</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                  </label>
                )}
              </div>
              <div className="text-center sm:text-left">
                <p className="text-sm font-medium text-slate-700 md:text-lg">Shop Logo (Optional)</p>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500 md:text-sm">
                  Upload an optional logo or photo to make your shop stand out. A square image works best.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Shop name
                </span>
                <input
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="Enter your shop name"
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent-dark"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Contact phone
                </span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent-dark"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Shop description
                </span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell customers what your shop specializes in"
                  rows={4}
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent-dark"
                />
              </label>
            </div>
          </section>

          <section className="rounded-3xl bg-[#f6faf4] p-5">
            <h2 className="text-lg font-semibold text-accent-dark">
              Shop location
            </h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Address
                </span>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Full shop address"
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent-dark"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  City
                </span>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Dhaka"
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent-dark"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Area
                </span>
                <input
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="Bashundhara / Dhanmondi / Uttara"
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent-dark"
                />
              </label>

              <div className="md:col-span-2 flex justify-end">
                <button
                  type="button"
                  disabled={isGeocoding}
                  onClick={async () => {
                    if (!lat && !lng && (address || city || area)) {
                      setIsGeocoding(true);
                      const query = [address, area, city].filter(Boolean).join(", ");
                      const result = await forwardGeocode(query);
                      setIsGeocoding(false);
                      if (result) {
                        setLat(result.lat ?? null);
                        setLng(result.lng ?? null);
                      }
                    }
                    setMapModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#e4fcd5] px-4 py-3 text-sm font-bold text-[#1f3a2d] transition hover:bg-[#c8e7c5] disabled:opacity-50"
                >
                  <MapPin size={18} className={isGeocoding ? "animate-pulse" : ""} />
                  {isGeocoding ? "Locating..." : lat && lng ? "Update location on map" : "Pin exact location on map"}
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-[#f6faf4] p-5">
            <h2 className="text-lg font-semibold text-accent-dark">
              Services offered
            </h2>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <label className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={courierPickup}
                  onChange={(e) => setCourierPickup(e.target.checked)}
                />
                Courier pickup
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={inShopRepair}
                  onChange={(e) => setInShopRepair(e.target.checked)}
                />
                In-shop repair
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={spareParts}
                  onChange={(e) => setSpareParts(e.target.checked)}
                />
                Spare parts available
              </label>
            </div>
          </section>

          <section className="rounded-3xl bg-[#f6faf4] p-5">
            <h2 className="text-lg font-semibold text-accent-dark">
              Your pricing
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Set your own business rates here. Shops should not go public with
              fake default pricing.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Inspection / diagnosis fee
                </span>
                <input
                  type="number"
                  min="0"
                  value={inspectionFee}
                  onChange={(e) => setInspectionFee(e.target.value)}
                  placeholder="e.g. 300"
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent-dark"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Base labor fee
                </span>
                <input
                  type="number"
                  min="0"
                  value={baseLaborFee}
                  onChange={(e) => setBaseLaborFee(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent-dark"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Pickup fee
                </span>
                <input
                  type="number"
                  min="0"
                  value={pickupFee}
                  onChange={(e) => setPickupFee(e.target.value)}
                  placeholder="e.g. 120"
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent-dark"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Express service fee
                </span>
                <input
                  type="number"
                  min="0"
                  value={expressFee}
                  onChange={(e) => setExpressFee(e.target.value)}
                  placeholder="e.g. 250"
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent-dark"
                />
              </label>
            </div>
          </section>

          <section className="rounded-3xl bg-[#f6faf4] p-5">
            <h2 className="text-lg font-semibold text-accent-dark">
              Available services
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              List the services your shop provides and set a base price or starting estimate for each.
            </p>

            <div className="mt-5 relative flex flex-col gap-3 md:flex-row md:items-start">
              <div className="relative flex-1">
                <input
                  value={serviceName}
                  onChange={(e) => {
                    setServiceName(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="e.g. Logic board repair"
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent-dark"
                />
                
                {showSuggestions && serviceName && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-xl border border-border bg-white p-1 shadow-lg">
                    {suggestions
                      .filter((s) => s.toLowerCase().includes(serviceName.toLowerCase()) && !services.some((existing) => existing.name.toLowerCase() === s.toLowerCase()))
                      .map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setServiceName(suggestion);
                            setShowSuggestions(false);
                          }}
                          className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-mint-50 focus:bg-mint-50"
                        >
                          {suggestion}
                        </button>
                      ))}
                    {suggestions.filter((s) => s.toLowerCase().includes(serviceName.toLowerCase()) && !services.some((existing) => existing.name.toLowerCase() === s.toLowerCase())).length === 0 && (
                      <div className="px-3 py-2 text-xs text-slate-500">No suggestions, hit + to add as new.</div>
                    )}
                  </div>
                )}
              </div>

              <div className="relative w-full md:w-32 shrink-0">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">৳</span>
                <input
                  type="number"
                  min="0"
                  value={servicePrice}
                  onChange={(e) => setServicePrice(e.target.value)}
                  placeholder="Price"
                  className="w-full rounded-2xl border border-border bg-white py-3 pl-7 pr-4 text-sm outline-none transition focus:border-accent-dark"
                />
              </div>

              <button
                type="button"
                onClick={addService}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-dark text-white transition hover:bg-[#1a2e22]"
              >
                <span className="text-2xl font-light leading-none">+</span>
              </button>
            </div>

            {services.length > 0 && (
              <div className="mt-5 flex flex-col gap-2">
                {services.map((svc) => (
                  <div key={svc.name} className="flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3 shadow-sm">
                    <span className="text-sm font-medium text-slate-800 capitalize">{svc.name}</span>
                    <div className="flex items-center gap-4">
                      {svc.price ? (
                        <span className="text-sm font-bold text-accent-dark">৳{Number(svc.price).toLocaleString("en-BD")}</span>
                      ) : (
                        <span className="text-xs italic text-slate-400">No price set</span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeService(svc.name)}
                        className="text-slate-400 transition hover:text-red-500"
                        title="Remove service"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
            <button
            type="button"
            onClick={() => router.push("/profile")}
            className="rounded-2xl border border-border px-5 py-3 text-sm font-semibold text-slate-700"
            >
            Back to profile
            </button>

           <button
            type="submit"
            disabled={submitting}
            className="rounded-2xl bg-accent-dark px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
            {submitting
                ? isEditMode
                ? "Saving vendor details..."
                : "Saving..."
                : isEditMode
                ? "Save vendor details"
                : "Save shop setup"}
            </button>
          </div>
        </form>
      </div>

      {mapModalOpen && (
        <LocationPickerModal
          selectedLocation={lat && lng ? { lat, lng, address, city, area, source: "map" } : null}
          onClose={() => setMapModalOpen(false)}
          onConfirm={async (loc) => {
            setLat(loc.lat ?? null);
            setLng(loc.lng ?? null);
            if (loc.address && !address) setAddress(loc.address);
            if (loc.city && !city) setCity(loc.city);
            if (loc.area && !area) setArea(loc.area);
          }}
        />
      )}
    </main>
  );
}