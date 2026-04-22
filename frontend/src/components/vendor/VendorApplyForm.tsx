"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  createVendorApplication,
  getVendorApplicationStatus,
  updateVendorApplication,
} from "@/lib/api";

export default function VendorApplyForm() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const token = (session?.user as { accessToken?: string } | undefined)?.accessToken;

  const [form, setForm] = useState({
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
    specialties: "",
    courierPickup: false,
    inShopRepair: true,
    spareParts: false,
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);

  const passwordsMismatch =
    form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

 useEffect(() => {
  if (status === "loading") return;

  async function loadExisting() {
    try {
      if (!token) return;

      const result = await getVendorApplicationStatus(token);
      const app = result.application;

      if (!app) return;

      setForm((prev) => ({
        ...prev,
        ownerName: app.ownerName || "",
        businessEmail: app.businessEmail || "",
        phone: app.phone || "",
        shopName: app.shopName || "",
        tradeLicenseNo: app.tradeLicenseNo || "",
        address: app.address || "",
        city: app.city || "",
        area: app.area || "",
        specialties: Array.isArray(app.specialties)
          ? app.specialties.join(", ")
          : "",
        courierPickup: Boolean(app.courierPickup),
        inShopRepair:
          typeof app.inShopRepair === "boolean" ? app.inShopRepair : true,
        spareParts: Boolean(app.spareParts),
        notes: app.notes || "",
      }));

      if (app.status === "REJECTED" || app.status === "PENDING") {
        setIsEditMode(true);
      }
    } catch {
      // no existing application yet
    }
  }

  loadExisting();
}, [status, token]);

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

      if (!form.phone.trim()) {
        throw new Error("Phone is required.");
      }

      if (!form.shopName.trim()) {
        throw new Error("Shop name is required.");
      }

      if (!form.address.trim()) {
        throw new Error("Business address is required.");
      }

     if (isEditMode) {
  if (!token) {
    throw new Error("Please log in first.");
  }

  await updateVendorApplication(token, {
    ownerName: form.ownerName,
    businessEmail: form.businessEmail,
    phone: form.phone,
    shopName: form.shopName,
    tradeLicenseNo: form.tradeLicenseNo || undefined,
    address: form.address,
    city: form.city || undefined,
    area: form.area || undefined,
    specialties: form.specialties,
    courierPickup: form.courierPickup,
    inShopRepair: form.inShopRepair,
    spareParts: form.spareParts,
    notes: form.notes || undefined,
  });

  router.push("/vendor/status");
  router.refresh();
  return;
}

      if (!form.password) {
        throw new Error("Password is required.");
      }

      if (form.password.length < 8) {
        throw new Error("Password must be at least 8 characters.");
      }

      if (form.password !== form.confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      const result = await createVendorApplication({
        ownerName: form.ownerName,
        businessEmail: form.businessEmail,
        phone: form.phone,
        password: form.password,
        confirmPassword: form.confirmPassword,
        shopName: form.shopName,
        tradeLicenseNo: form.tradeLicenseNo || undefined,
        address: form.address,
        city: form.city || undefined,
        area: form.area || undefined,
        specialties: form.specialties,
        courierPickup: form.courierPickup,
        inShopRepair: form.inShopRepair,
        spareParts: form.spareParts,
        notes: form.notes || undefined,
      });

      router.push(
        `/vendor/apply/success?id=${encodeURIComponent(result.application.id)}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit application.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-4xl rounded-[2rem] border border-white/60 bg-white/90 p-8 shadow-2xl backdrop-blur">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-accent-dark">
          {isEditMode ? "Edit Vendor Application" : "Vendor Application"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isEditMode
            ? "Update your submitted vendor information below."
            : "Apply as a repair shop partner. Your application will be reviewed by the admin team."}
        </p>
      </div>
      {isEditMode && (
      <div className="mb-4 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
        Update your previous vendor application and submit again. It will go back to pending review.
      </div>
    )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <input
            className="rounded-2xl border border-border px-4 py-3 text-sm"
            placeholder="Owner name"
            value={form.ownerName}
            onChange={(e) => setForm((prev) => ({ ...prev, ownerName: e.target.value }))}
          />

          <input
            className="rounded-2xl border border-border px-4 py-3 text-sm"
            placeholder="Business email"
            type="email"
            value={form.businessEmail}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, businessEmail: e.target.value }))
            }
          />

          <input
            className="rounded-2xl border border-border px-4 py-3 text-sm"
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
          />

          <input
            className="rounded-2xl border border-border px-4 py-3 text-sm"
            placeholder="Shop name"
            value={form.shopName}
            onChange={(e) => setForm((prev) => ({ ...prev, shopName: e.target.value }))}
          />

          {!isEditMode && (
            <>
              <input
                className="rounded-2xl border border-border px-4 py-3 text-sm"
                placeholder="Password"
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, password: e.target.value }))
                }
              />

              <input
                className="rounded-2xl border border-border px-4 py-3 text-sm"
                placeholder="Confirm password"
                type="password"
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                }
              />
            </>
          )}

          <input
            className="rounded-2xl border border-border px-4 py-3 text-sm md:col-span-2"
            placeholder="Trade license number (optional)"
            value={form.tradeLicenseNo}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, tradeLicenseNo: e.target.value }))
            }
          />

          <input
            className="rounded-2xl border border-border px-4 py-3 text-sm md:col-span-2"
            placeholder="Business address"
            value={form.address}
            onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
          />

          <input
            className="rounded-2xl border border-border px-4 py-3 text-sm"
            placeholder="City"
            value={form.city}
            onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
          />

          <input
            className="rounded-2xl border border-border px-4 py-3 text-sm"
            placeholder="Area"
            value={form.area}
            onChange={(e) => setForm((prev) => ({ ...prev, area: e.target.value }))}
          />
        </div>

        {!isEditMode && passwordsMismatch ? (
          <p className="text-sm text-red-600">Passwords do not match.</p>
        ) : null}

        <input
          className="w-full rounded-2xl border border-border px-4 py-3 text-sm"
          placeholder="Specialties (comma separated, e.g. Apple, Samsung, Laptop Repair)"
          value={form.specialties}
          onChange={(e) => setForm((prev) => ({ ...prev, specialties: e.target.value }))}
        />

        <textarea
          className="min-h-[120px] w-full rounded-2xl border border-border px-4 py-3 text-sm"
          placeholder="Additional notes (optional)"
          value={form.notes}
          onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
        />

        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.courierPickup}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, courierPickup: e.target.checked }))
              }
            />
            Courier pickup
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.inShopRepair}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, inShopRepair: e.target.checked }))
              }
            />
            In-shop repair
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.spareParts}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, spareParts: e.target.checked }))
              }
            />
            Spare parts
          </label>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={loading || (!isEditMode && passwordsMismatch)}
          className="w-full rounded-2xl bg-accent-dark px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
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