"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import {
  createVendorApplication,
  getVendorApplicationStatus,
  updateVendorApplication,
} from "@/lib/api";
import CreatableSelect from "react-select/creatable";
import { PasswordInput } from "@/components/ui/PasswordInput";
import Link from "next/link";
import { ImagePlus, MapPin, Upload, X } from "lucide-react";
import { validateEmail } from "@/lib/validate-email";
import { UploadDropzone } from "@/lib/uploadthing";
import type { StoredLocation } from "@/components/location/types";

const LocationPickerModal = dynamic(
  () => import("@/components/location/LocationPickerModal"),
  { ssr: false }
);

const SPECIALTY_OPTIONS = [
  { value: "Smartphone Repair", label: "Smartphone Repair" },
  { value: "Laptop Repair", label: "Laptop Repair" },
  { value: "Desktop Repair", label: "Desktop Repair" },
  { value: "Tablet Repair", label: "Tablet Repair" },
  { value: "Smartwatch Repair", label: "Smartwatch Repair" },
  { value: "Console Repair", label: "Console Repair" },
  { value: "TV Repair", label: "TV Repair" },
  { value: "Audio Equipment Repair", label: "Audio Equipment Repair" },
  { value: "Camera Repair", label: "Camera Repair" },
  { value: "Drone Repair", label: "Drone Repair" },
  { value: "Appliance Repair", label: "Appliance Repair" },
  { value: "Micro-soldering", label: "Micro-soldering" },
  { value: "Data Recovery", label: "Data Recovery" },
  { value: "Screen Replacement", label: "Screen Replacement" },
  { value: "Battery Replacement", label: "Battery Replacement" },
  { value: "Water Damage Repair", label: "Water Damage Repair" },
];

type ExistingVendorApplication = {
  status?: "PENDING" | "APPROVED" | "REJECTED";
  setupComplete?: boolean;
  ownerName?: string;
  businessEmail?: string;
  phone?: string;
  shopName?: string;
  tradeLicenseNo?: string | null;
  address?: string;
  city?: string | null;
  area?: string | null;
  lat?: number | null;
  lng?: number | null;
  specialties?: string[];
  courierPickup?: boolean;
  inShopRepair?: boolean;
  spareParts?: boolean;
  notes?: string | null;
  logoUrl?: string | null;
};

const emptyVendorApplicationForm = {
  ownerName: "",
  businessEmail: "",
  phone: "",
  password: "",
  confirmPassword: "",
  shopName: "",
  tradeLicenseNo: "",
  address: "",
  city: "",
  area: "",
  specialties: [] as string[],
  courierPickup: false,
  inShopRepair: true,
  spareParts: false,
  notes: "",
  logoUrl: "",
};

type VendorApplicationFormState = typeof emptyVendorApplicationForm;
type SessionUser = {
  role?: string | null;
  accessToken?: string | null;
};

export default function VendorApplyForm() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const sessionUser = session?.user as SessionUser | undefined;
  const role = sessionUser?.role ?? null;
  const token = sessionUser?.accessToken;

  const [form, setForm] = useState<VendorApplicationFormState>({
    ...emptyVendorApplicationForm,
  });
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [error, setError] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [mapDraft, setMapDraft] = useState<StoredLocation | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);

  const handleMapConfirm = useCallback(async (location: StoredLocation) => {
    setMapDraft(location);
    // Auto-fill city and area from map, but NOT the shop address text
    setForm((prev) => ({
      ...prev,
      city: location.city || prev.city,
      area: location.area || prev.area,
    }));
  }, []);

  const passwordsMismatch =
    form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

  // Build options list: merge predefined options with any DB-stored values
  // that aren't in the predefined list (prevents silent data loss on update)
  const mergedOptions = [
    ...SPECIALTY_OPTIONS,
    ...form.specialties
      .filter((s) => !SPECIALTY_OPTIONS.some((o) => o.value === s))
      .map((s) => ({ value: s, label: s })),
  ];

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    async function loadExisting() {
      setError("");

      if (!token || role !== "VENDOR") {
        setForm({ ...emptyVendorApplicationForm });
        setIsEditMode(false);
        setLoadingExisting(false);
        return;
      }

      setLoadingExisting(true);

      try {
        const result = await getVendorApplicationStatus(token);
        const app = result.application as ExistingVendorApplication | undefined;

        if (!app) {
          setForm({ ...emptyVendorApplicationForm });
          setIsEditMode(false);
          return;
        }

        if (app.status === "APPROVED") {
          if (app.setupComplete) {
            router.replace("/vendor/dashboard");
          } else {
            router.replace("/vendor/setup-shop");
          }
          return;
        }

        setForm({
          ...emptyVendorApplicationForm,
          ownerName: app.ownerName || "",
          businessEmail: app.businessEmail || "",
          phone: app.phone || "",
          shopName: app.shopName || "",
          tradeLicenseNo: app.tradeLicenseNo || "",
          address: app.address || "",
          city: app.city || "",
          area: app.area || "",
          specialties: Array.isArray(app.specialties)
            ? app.specialties
            : [],
          courierPickup: Boolean(app.courierPickup),
          inShopRepair:
            typeof app.inShopRepair === "boolean" ? app.inShopRepair : true,
          spareParts: Boolean(app.spareParts),
          notes: app.notes || "",
          logoUrl: app.logoUrl || "",
        });

        // Restore map pin if lat/lng exist
        if (app.lat && app.lng) {
          setMapDraft({
            address: app.address || "",
            city: app.city || "",
            area: app.area || "",
            lat: app.lat,
            lng: app.lng,
            source: "map",
          });
        }

        setIsEditMode(app.status === "REJECTED" || app.status === "PENDING");
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingExisting(false);
      }
    }

    void loadExisting();
  }, [status, token, role, router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!form.ownerName.trim()) {
        throw new Error("Owner name is required.");
      }

      if (!form.businessEmail.trim()) {
        throw new Error("Business email is required.");
      }

      const emailError = validateEmail(form.businessEmail);
      if (emailError) throw new Error(emailError);

      if (!form.phone.trim()) {
        throw new Error("Phone is required.");
      }

      if (!form.shopName.trim()) {
        throw new Error("Shop name is required.");
      }

      // Map location is mandatory
      if (!mapDraft?.lat || !mapDraft?.lng) {
        throw new Error("Please pick your shop location on the map.");
      }

      if (isEditMode) {
        if (!token) {
          throw new Error("Please sign in first.");
        }

        await updateVendorApplication(token, {
          ownerName: form.ownerName.trim(),
          businessEmail: form.businessEmail.trim(),
          phone: form.phone.trim(),
          shopName: form.shopName.trim(),
          tradeLicenseNo: form.tradeLicenseNo.trim() || undefined,
          address: form.address.trim() || undefined,
          city: form.city.trim() || undefined,
          area: form.area.trim() || undefined,
          lat: mapDraft?.lat ?? undefined,
          lng: mapDraft?.lng ?? undefined,
          specialties: form.specialties,
          courierPickup: form.courierPickup,
          inShopRepair: form.inShopRepair,
          spareParts: form.spareParts,
          notes: form.notes.trim() || undefined,
          logoUrl: form.logoUrl || undefined,
        });

        router.push("/vendor/status");
        router.refresh();
        return;
      }

      if (!isEditMode && !token) {
        if (!form.password) {
          throw new Error("Password is required.");
        }

        if (form.password.length < 8) {
          throw new Error("Password must be at least 8 characters.");
        }

        if (form.password !== form.confirmPassword) {
          throw new Error("Passwords do not match.");
        }
      }

      const result = await createVendorApplication({
        ownerName: form.ownerName.trim(),
        businessEmail: form.businessEmail.trim(),
        phone: form.phone.trim(),
        password: form.password || undefined as any,
        confirmPassword: form.confirmPassword || undefined as any,
        shopName: form.shopName.trim(),
        tradeLicenseNo: form.tradeLicenseNo.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        area: form.area.trim() || undefined,
        lat: mapDraft?.lat ?? undefined,
        lng: mapDraft?.lng ?? undefined,
        specialties: form.specialties,
        courierPickup: form.courierPickup,
        inShopRepair: form.inShopRepair,
        spareParts: form.spareParts,
        notes: form.notes.trim() || undefined,
        logoUrl: form.logoUrl || undefined,
      }, token || undefined);

      router.push(
        `/vendor/apply/success?id=${encodeURIComponent(result.application.id)}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit application.");
    } finally {
      setLoading(false);
    }
  }



  if (status === "loading" || loadingExisting) {
    return (
      <div className="w-full max-w-4xl rounded-[1.5rem] border border-white/60 bg-white/90 p-5 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-[#1C251F]/95 md:rounded-[2rem] md:p-8">
        <p className="text-sm text-muted-foreground">Loading vendor application...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl rounded-[1.5rem] border border-white/60 bg-white/90 p-5 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-[#1C251F]/95 md:rounded-[2rem] md:p-8">
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl font-bold text-accent-dark dark:text-[#A8D5A2] md:text-3xl">
          {isEditMode ? "Edit Vendor Application" : "Vendor Application"}
        </h1>
        <p className="mt-1.5 text-xs text-muted-foreground md:mt-2 md:text-sm">
          {isEditMode
            ? "Update your submitted vendor information below."
            : "Apply as a repair shop partner. Your application will be reviewed by the admin team."}
        </p>
      </div>

      {isEditMode ? (
        <div className="mb-4 rounded-2xl border border-yellow-200 bg-yellow-50 px-3 py-2.5 text-xs text-yellow-800 dark:border-yellow-700/40 dark:bg-yellow-900/20 dark:text-yellow-300 md:px-4 md:py-3 md:text-sm">
          Update your previous vendor application and submit again. It will go back to pending review.
        </div>
      ) : null}

      <form className="space-y-4 md:space-y-5" onSubmit={handleSubmit} autoComplete="off">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 dark:border-white/5 dark:bg-[#15201A] sm:flex-row md:gap-5 md:p-5">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[1.5rem] border-2 border-dashed border-[var(--border)] bg-[var(--mint-50)] transition-colors hover:border-[var(--accent-dark)] dark:bg-[#1a2e22] md:h-28 md:w-28">
            {form.logoUrl ? (
              <>
                <img src={form.logoUrl} alt="Logo" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, logoUrl: "" }))}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white backdrop-blur-sm transition-colors hover:bg-red-500"
                >
                  <X size={14} />
                </button>
              </>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center text-[var(--muted-foreground)]">
                <ImagePlus size={24} className="mb-1" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Logo</span>
              </div>
            )}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-sm font-bold text-[var(--foreground)] md:text-lg">Shop Logo</p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-[var(--muted-foreground)] md:text-sm">
              Upload an optional logo or photo to make your shop stand out. A square image works best.
            </p>
            {!form.logoUrl && (
              <div className="mt-3">
                <UploadDropzone
                  endpoint="shopLogoUploader"
                  onClientUploadComplete={(res) => {
                    if (res?.[0]?.ufsUrl) {
                      setForm((prev) => ({ ...prev, logoUrl: res[0].ufsUrl }));
                    }
                  }}
                  onUploadError={(err) => {
                    setError(`Logo upload failed: ${err.message}`);
                  }}
                  config={{ mode: "auto" }}
                  appearance={{
                    container: "border-2 border-dashed border-[var(--border)] rounded-2xl bg-[var(--mint-50)] p-3 dark:bg-[#1a2e22] cursor-pointer hover:border-[var(--accent-dark)] transition",
                    label: "text-xs font-semibold text-[var(--accent-dark)]",
                    allowedContent: "text-[10px] text-muted-foreground",
                    button: "bg-[var(--accent-dark)] text-white text-xs font-bold rounded-xl px-3 py-1.5 ut-uploading:bg-[var(--accent-dark)]/60",
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-3 md:gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="vendorOwnerName" className="text-xs font-medium text-slate-600 pl-1 dark:text-slate-400">Owner name</label>
            <input
              id="vendorOwnerName"
              className="rounded-2xl border border-border bg-white px-3.5 py-2.5 text-sm text-[var(--foreground)] dark:border-white/10 dark:bg-[#15201A] md:px-4 md:py-3"
              placeholder="Owner name"
              name="vendorOwnerName"
              autoComplete="off"
              value={form.ownerName}
              onChange={(e) => setForm((prev) => ({ ...prev, ownerName: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="vendorBusinessEmail" className="text-xs font-medium text-slate-600 pl-1 dark:text-slate-400">Business email</label>
            <input
              id="vendorBusinessEmail"
              className="rounded-2xl border border-border bg-white px-3.5 py-2.5 text-sm text-[var(--foreground)] dark:border-white/10 dark:bg-[#15201A] md:px-4 md:py-3"
              placeholder="Business email"
              type="email"
              name="vendorBusinessEmail"
              autoComplete="off"
              value={form.businessEmail}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, businessEmail: e.target.value }))
              }
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="vendorPhone" className="text-xs font-medium text-slate-600 pl-1 dark:text-slate-400">Phone</label>
            <input
              id="vendorPhone"
              className="rounded-2xl border border-border bg-white px-3.5 py-2.5 text-sm text-[var(--foreground)] dark:border-white/10 dark:bg-[#15201A] md:px-4 md:py-3"
              placeholder="01XXXXXXXXX"
              type="tel"
              pattern="^(?:\+?8801|01)[3-9]\d{8}$"
              title="Enter a valid Bangladeshi phone number (e.g. 01712345678)"
              name="vendorPhone"
              autoComplete="off"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="vendorShopName" className="text-xs font-medium text-slate-600 pl-1 dark:text-slate-400">Shop name</label>
            <input
              id="vendorShopName"
              className="rounded-2xl border border-border bg-white px-3.5 py-2.5 text-sm text-[var(--foreground)] dark:border-white/10 dark:bg-[#15201A] md:px-4 md:py-3"
              placeholder="Shop name"
              name="vendorShopName"
              autoComplete="off"
              value={form.shopName}
              onChange={(e) => setForm((prev) => ({ ...prev, shopName: e.target.value }))}
            />
          </div>

          {!isEditMode && !token ? (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600 pl-1 dark:text-slate-400">Password</label>
                <PasswordInput
                  showStrength={true}
                  className="rounded-2xl border border-border bg-white px-3.5 py-2.5 text-sm text-[var(--foreground)] dark:border-white/10 dark:bg-[#15201A] md:px-4 md:py-3"
                  placeholder="Password"
                  name="vendorPassword"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 pl-1 dark:text-slate-400">Confirm password</label>
                <PasswordInput
                  className="rounded-2xl border border-border bg-white px-3.5 py-2.5 text-sm text-[var(--foreground)] dark:border-white/10 dark:bg-[#15201A] md:px-4 md:py-3"
                  placeholder="Confirm password"
                  name="vendorConfirmPassword"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                  }
                />
                {passwordsMismatch ? (
                  <p className="mt-1 pl-1 text-xs font-medium text-red-500">Passwords do not match.</p>
                ) : null}
              </div>
            </>
          ) : null}

          <div className="flex flex-col gap-1 md:col-span-2">
            <label htmlFor="vendorTradeLicenseNo" className="text-xs font-medium text-slate-600 pl-1 dark:text-slate-400">Trade license number (optional)</label>
            <input
              id="vendorTradeLicenseNo"
              className="rounded-2xl border border-border bg-white px-3.5 py-2.5 text-sm text-[var(--foreground)] dark:border-white/10 dark:bg-[#15201A] md:px-4 md:py-3"
              placeholder="Trade license number (optional)"
              name="vendorTradeLicenseNo"
              autoComplete="off"
              value={form.tradeLicenseNo}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, tradeLicenseNo: e.target.value }))
              }
            />
          </div>

          {/* ── 1. Map Location (MANDATORY) ── */}
          <div className="flex flex-col gap-2 md:col-span-2">
            <div className="flex items-center gap-2">
              <MapPin size={15} className="text-[var(--accent-dark)]" />
              <label className="text-xs font-semibold text-[var(--accent-dark)] dark:text-[#A8D5A2]">Map Location <span className="text-red-500">*</span></label>
            </div>
            <p className="pl-1 text-[11px] leading-relaxed text-muted-foreground">
              Pin your shop's approximate location on the map. This is used for distance calculations, sorting, and ETA — it won't be shown publicly on your shop profile.
            </p>

            {mapDraft?.lat && mapDraft?.lng ? (
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-green-200 bg-green-50 px-3 py-2.5 dark:border-green-700/40 dark:bg-green-900/20 sm:px-4 sm:py-3">
                <div className="flex items-center gap-2 text-xs font-medium text-green-700 dark:text-green-300">
                  <MapPin size={14} />
                  <span>📍 Location pinned — {mapDraft.area && mapDraft.city ? `${mapDraft.area}, ${mapDraft.city}` : `${mapDraft.lat.toFixed(4)}, ${mapDraft.lng.toFixed(4)}`}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMapModal(true)}
                  className="shrink-0 rounded-xl bg-green-100 px-2.5 py-1 text-[11px] font-semibold text-green-800 transition hover:bg-green-200 dark:bg-green-800/30 dark:text-green-200"
                >
                  Change
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowMapModal(true)}
                className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--mint-50)] px-4 py-4 text-sm font-semibold text-[var(--accent-dark)] transition hover:border-[var(--accent-dark)] hover:bg-[var(--mint-100)] dark:bg-[#1a2e22] dark:text-[#A8D5A2] sm:py-5"
              >
                <MapPin size={18} />
                Pick shop location on map
              </button>
            )}

            {showMapModal && (
              <LocationPickerModal
                selectedLocation={mapDraft}
                onClose={() => setShowMapModal(false)}
                onConfirm={handleMapConfirm}
              />
            )}
          </div>

          {/* ── 2. Shop Address (OPTIONAL at this stage) ── */}
          <div className="flex flex-col gap-2 md:col-span-2">
            <label htmlFor="vendorBusinessAddress" className="text-xs font-medium text-slate-600 pl-1 dark:text-slate-400">Shop Address <span className="text-[10px] font-normal text-muted-foreground">(optional — required at shop setup)</span></label>
            <p className="pl-1 text-[11px] leading-relaxed text-muted-foreground">
              Detailed address shown on your public shop profile. If provided, our AI will auto-format it for you.
            </p>
            <input
              id="vendorBusinessAddress"
              className="rounded-2xl border border-border bg-white px-3.5 py-2.5 text-sm text-[var(--foreground)] dark:border-white/10 dark:bg-[#15201A] md:px-4 md:py-3"
              placeholder="e.g. Shop 12, Level 3, Multiplan Center, Mirpur 10"
              name="vendorBusinessAddress"
              autoComplete="off"
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="vendorCity" className="text-xs font-medium text-slate-600 pl-1 dark:text-slate-400">City</label>
            <input
              id="vendorCity"
              className="rounded-2xl border border-border bg-white px-3.5 py-2.5 text-sm text-[var(--foreground)] dark:border-white/10 dark:bg-[#15201A] md:px-4 md:py-3"
              placeholder="City"
              name="vendorCity"
              autoComplete="off"
              value={form.city}
              onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="vendorArea" className="text-xs font-medium text-slate-600 pl-1 dark:text-slate-400">Area</label>
            <input
              id="vendorArea"
              className="rounded-2xl border border-border bg-white px-3.5 py-2.5 text-sm text-[var(--foreground)] dark:border-white/10 dark:bg-[#15201A] md:px-4 md:py-3"
              placeholder="Area"
              name="vendorArea"
              autoComplete="off"
              value={form.area}
              onChange={(e) => setForm((prev) => ({ ...prev, area: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600 pl-1 dark:text-slate-400">Specialties</label>
          <CreatableSelect
            isMulti
            options={mergedOptions}
            value={mergedOptions.filter((option) =>
              form.specialties.includes(option.value)
            )}
            onChange={(selected) =>
              setForm((prev) => ({
                ...prev,
                specialties: selected ? selected.map((s) => s.value) : [],
              }))
            }
            placeholder="Select or create specialties..."
            formatCreateLabel={(inputValue) => `Add "${inputValue}"`}
            className="text-sm"
            styles={{
              control: (base) => ({
                ...base,
                borderRadius: "1rem",
                borderColor: "var(--border, hsl(var(--border)))",
                backgroundColor: "var(--vendor-select-bg, white)",
                padding: "0.25rem",
                boxShadow: "none",
                "&:hover": {
                  borderColor: "var(--border, hsl(var(--border)))",
                },
              }),
              menu: (base) => ({
                ...base,
                backgroundColor: "var(--vendor-select-bg, white)",
                borderRadius: "0.75rem",
                border: "1px solid var(--border, hsl(var(--border)))",
              }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isFocused ? "var(--vendor-select-hover, #f0fdf4)" : "transparent",
                color: "var(--foreground, #1a1a1a)",
                fontSize: "0.875rem",
              }),
              multiValue: (base) => ({
                ...base,
                backgroundColor: "var(--vendor-select-tag, #dcfce7)",
                borderRadius: "0.5rem",
                display: "flex",
                alignItems: "center",
                margin: "2px 4px 2px 0",
              }),
              multiValueLabel: (base) => ({
                ...base,
                color: "var(--vendor-select-tag-text, #166534)",
                fontSize: "0.8rem",
                padding: "3px 4px 3px 8px",
                lineHeight: "1.2",
              }),
              multiValueRemove: (base) => ({
                ...base,
                color: "var(--vendor-select-tag-text, #166534)",
                padding: "3px 6px",
                display: "flex",
                alignItems: "center",
                borderRadius: "0 0.5rem 0.5rem 0",
                ":hover": { backgroundColor: "var(--vendor-select-tag-remove-hover, #bbf7d0)", color: "#166534" },
              }),
              input: (base) => ({
                ...base,
                color: "var(--foreground, #1a1a1a)",
              }),
              placeholder: (base) => ({
                ...base,
                color: "var(--muted-foreground, #6b7280)",
              }),
              singleValue: (base) => ({
                ...base,
                color: "var(--foreground, #1a1a1a)",
              }),
            }}
          />
        </div>

        <textarea
          className="min-h-[100px] w-full rounded-2xl border border-border bg-white px-3.5 py-2.5 text-sm text-[var(--foreground)] dark:border-white/10 dark:bg-[#15201A] md:min-h-[120px] md:px-4 md:py-3"
          placeholder="Additional notes (optional)"
          name="vendorNotes"
          autoComplete="off"
          value={form.notes}
          onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
        />

        <div className="grid gap-2 md:gap-3 md:grid-cols-3">
          <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
            <input
              type="checkbox"
              checked={form.courierPickup}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, courierPickup: e.target.checked }))
              }
              className="h-4 w-4 rounded accent-[var(--accent-dark)]"
            />
            Courier pickup
          </label>

          <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
            <input
              type="checkbox"
              checked={form.inShopRepair}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, inShopRepair: e.target.checked }))
              }
              className="h-4 w-4 rounded accent-[var(--accent-dark)]"
            />
            In-shop repair
          </label>

          <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
            <input
              type="checkbox"
              checked={form.spareParts}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, spareParts: e.target.checked }))
              }
              className="h-4 w-4 rounded accent-[var(--accent-dark)]"
            />
            Spare parts
          </label>
        </div>

        {error ? (
          error.toLowerCase().includes("already exists") || error.toLowerCase().includes("sign in") ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300 md:px-4 md:py-3 md:text-sm">
              <p>{error}</p>
              <Link
                href="/login"
                className="mt-2 inline-block rounded-xl bg-accent-dark px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
              >
                Go to Sign in
              </Link>
            </div>
          ) : (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )
        ) : null}

        <button
          type="submit"
          disabled={loading || (!isEditMode && passwordsMismatch)}
          className="w-full rounded-2xl bg-accent-dark px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
        >
          {loading
            ? isEditMode
              ? "Updating..."
              : "Submitting..."
            : isEditMode
              ? "Update submitted information"
              : "Submit vendor application"}
        </button>
      </form>
    </div>
  );
}
