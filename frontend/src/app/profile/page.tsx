"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  getProfile,
  updateProfile,
  getVendorApplicationStatus,
  type Profile,
} from "@/lib/api";

type VendorProfileStatusPayload = {
  application?: {
    id: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    ownerName: string;
    businessEmail: string;
    phone: string;
    shopName: string;
    tradeLicenseNo?: string | null;
    address: string;
    city?: string | null;
    area?: string | null;
    specialties?: string[];
    courierPickup?: boolean;
    inShopRepair?: boolean;
    spareParts?: boolean;
    notes?: string | null;
    setupComplete?: boolean;
    isPublic?: boolean;
    rejectionReason?: string | null;
    createdAt?: string;
  };
  message?: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const token = (session?.user as { accessToken?: string } | undefined)?.accessToken;
  const role = (session?.user as { role?: string } | undefined)?.role;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [draft, setDraft] = useState<Partial<Profile>>({});
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");

  const [vendorData, setVendorData] = useState<VendorProfileStatusPayload | null>(null);
  const [loadingVendorData, setLoadingVendorData] = useState(false);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.replace("/login");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (!token) return;

    getProfile(token)
      .then((data: Profile) => {
        setProfile(data);
        setDraft(data);

        const forceComplete = searchParams.get("complete") === "1";
        const missingPhone = !data.phone?.trim();

        if (forceComplete || missingPhone) {
          setEditing(true);
          setMessage("Please complete your profile before continuing.");
        }
      })
      .catch(() => setMessage("Could not load profile."));
  }, [token, searchParams]);

  useEffect(() => {
    async function loadVendorData() {
      if (role !== "VENDOR" || !token) {
        setVendorData(null);
        return;
      }

      try {
        setLoadingVendorData(true);
        const result = (await getVendorApplicationStatus(
          token
        )) as VendorProfileStatusPayload;
        setVendorData(result);
      } catch {
        setVendorData(null);
      } finally {
        setLoadingVendorData(false);
      }
    }

    loadVendorData();
  }, [role, token]);

  const firstName = useMemo(() => {
    const sessionUser = session?.user as
      | { name?: string; username?: string }
      | undefined;

    return (
      profile?.name?.trim()?.split(" ")[0] ||
      sessionUser?.name?.trim()?.split(" ")[0] ||
      sessionUser?.username?.trim()?.split(" ")[0] ||
      "User"
    );
  }, [profile, session]);

  const vendorApp = vendorData?.application;

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-[#E4FCD5] px-4 py-8">
        <div className="mx-auto max-w-4xl text-[#173726]">Loading profile...</div>
      </main>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#E4FCD5] px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-[#214c34] hover:opacity-90"
          >
            <Image
              src="/images/meramot.svg"
              alt="Meramot"
              width={150}
              height={48}
              className="h-10 w-auto object-contain"
              priority
            />
          </Link>

          <Link
            href="/"
            className="rounded-full border border-[#214c34] bg-white px-5 py-2 text-sm font-semibold text-[#214c34]"
          >
            Back to home
          </Link>
        </div>

        <div className="rounded-[2rem] border border-[#d9e5d5] bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#58725f]">
                Profile
              </p>
              <h1 className="mt-2 text-3xl font-bold text-[#173726]">Hi, {firstName}</h1>
              <p className="mt-2 text-sm text-[#5b7262]">
                Manage your account details here.
              </p>
            </div>

            <div className="grid h-20 w-20 place-items-center rounded-3xl bg-[#d5ead8] text-3xl font-bold text-[#214c34]">
              {firstName.charAt(0).toUpperCase()}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[
              ["Full name", "name"],
              ["Username", "username"],
              ["Email", "email"],
              ["Phone", "phone"],
              ["Address", "address"],
              ["City", "city"],
              ["Area", "area"],
            ].map(([label, key]) => (
              <div key={key} className="rounded-3xl bg-[#f6faf4] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b8270]">
                  {label}
                </p>

                {editing && !["username", "email"].includes(key) ? (
                  <input
                    value={String(draft[key as keyof Profile] ?? "")}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-[#cfe0c6] px-4 py-3 text-base font-medium text-[#173726]"
                  />
                ) : (
                  <p className="mt-2 text-base font-medium text-[#173726]">
                    {(() => {
                      const sessionUser = session?.user as
                        | { name?: string; email?: string; username?: string }
                        | undefined;

                      const profileValue = String(
                        profile?.[key as keyof Profile] ?? ""
                      ).trim();

                      if (profileValue) return profileValue;

                      if (key === "name") {
                        return sessionUser?.name?.trim() || "Not provided";
                      }

                      if (key === "email") {
                        return sessionUser?.email?.trim() || "Not provided";
                      }

                      if (key === "username") {
                        return sessionUser?.username?.trim() || "Not provided";
                      }

                      return "Not provided";
                    })()}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="rounded-full bg-[#214c34] px-6 py-3 text-sm font-semibold text-white"
              >
                Edit profile
              </button>
            ) : (
              <>
                <button
                  onClick={async () => {
                    if (!token) return;

                    if (!String(draft.phone ?? "").trim()) {
                      setMessage("Phone number is required.");
                      return;
                    }

                    try {
                      const updated: { user: Profile } = await updateProfile(token, {
                        ...draft,
                        phone: String(draft.phone ?? "").trim(),
                        name: String(draft.name ?? "").trim() || null,
                        address: String(draft.address ?? "").trim() || null,
                        city: String(draft.city ?? "").trim() || null,
                        area: String(draft.area ?? "").trim() || null,
                      });

                      setProfile(updated.user);
                      setDraft(updated.user);
                      setEditing(false);
                      setMessage("Profile updated.");
                      router.replace("/profile");
                    } catch (error) {
                      setMessage(
                        error instanceof Error
                          ? error.message
                          : "Could not update profile."
                      );
                    }
                  }}
                  className="rounded-full bg-[#214c34] px-6 py-3 text-sm font-semibold text-white"
                >
                  Save changes
                </button>

                <button
                  onClick={() => {
                    setDraft(profile || {});
                    setEditing(false);
                    setMessage("");
                  }}
                  className="rounded-full border border-[#214c34] bg-white px-6 py-3 text-sm font-semibold text-[#214c34]"
                >
                  Cancel
                </button>
              </>
            )}

            <Link
              href="/orders"
              className="rounded-full border border-[#214c34] bg-white px-6 py-3 text-sm font-semibold text-[#214c34]"
            >
              My orders
            </Link>
          </div>

          {message && <p className="mt-4 text-sm text-[#214c34]">{message}</p>}

         {role === "VENDOR" ? (
  <section className="mt-8 rounded-3xl bg-[#f6faf4] p-5">
    <h2 className="text-lg font-semibold text-accent-dark">Vendor details</h2>

    {loadingVendorData ? (
      <p className="mt-3 text-sm text-slate-600">Loading vendor details...</p>
    ) : (
      <>
        <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
          <div>
            <span className="font-semibold text-slate-900">
              Application status:
            </span>{" "}
            {vendorApp?.status || "—"}
          </div>

          <div>
            <span className="font-semibold text-slate-900">
              Shop setup:
            </span>{" "}
            {vendorApp?.setupComplete ? "Completed" : "Incomplete"}
          </div>

          <div>
            <span className="font-semibold text-slate-900">
              Shop visibility:
            </span>{" "}
            {vendorApp?.isPublic ? "Public" : "Hidden"}
          </div>

          <div>
            <span className="font-semibold text-slate-900">
              Business email:
            </span>{" "}
            {vendorApp?.businessEmail || "—"}
          </div>

          <div>
            <span className="font-semibold text-slate-900">Shop name:</span>{" "}
            {vendorApp?.shopName || "—"}
          </div>

          <div>
            <span className="font-semibold text-slate-900">
              Trade license:
            </span>{" "}
            {vendorApp?.tradeLicenseNo || "—"}
          </div>

          <div className="md:col-span-2">
            <span className="font-semibold text-slate-900">Address:</span>{" "}
            {vendorApp?.address || "—"}
          </div>

          <div>
            <span className="font-semibold text-slate-900">City:</span>{" "}
            {vendorApp?.city || "—"}
          </div>

          <div>
            <span className="font-semibold text-slate-900">Area:</span>{" "}
            {vendorApp?.area || "—"}
          </div>

          <div className="md:col-span-2">
            <span className="font-semibold text-slate-900">Services:</span>{" "}
            {[
              vendorApp?.courierPickup ? "Courier pickup" : null,
              vendorApp?.inShopRepair ? "In-shop repair" : null,
              vendorApp?.spareParts ? "Spare parts" : null,
            ]
              .filter(Boolean)
              .join(", ") || "—"}
          </div>

          <div className="md:col-span-2">
            <span className="font-semibold text-slate-900">Skill tags:</span>{" "}
            {vendorApp?.specialties?.length
              ? vendorApp.specialties.join(", ")
              : "—"}
          </div>

          {vendorApp?.rejectionReason ? (
            <div className="md:col-span-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {vendorApp.rejectionReason}
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/vendor/setup-shop"
            className="rounded-full bg-[#214c34] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Edit vendor details
          </Link>
        </div>
      </>
    )}
  </section>
) : null}

           
        </div>
      </div>
    </main>
  );
}