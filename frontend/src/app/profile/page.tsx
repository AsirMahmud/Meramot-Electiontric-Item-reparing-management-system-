"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
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

function ProfilePageInner() {
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
      <main className="min-h-screen bg-[var(--background)] px-4 py-8">
        <div className="mx-auto max-w-4xl text-[var(--foreground)]">Loading profile...</div>
      </main>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-3 py-4 md:px-4 md:py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:mb-6">
          <Link
            href="/"
            className="inline-block transition-transform hover:scale-105"
          >
            <Image
              src="/images/meramot.svg"
              alt="Meramot"
              width={240}
              height={80}
              className="h-12 w-auto object-contain md:h-16 lg:h-20"
              priority
            />
          </Link>

          <Link
            href="/"
            className="rounded-full border border-[var(--border)] bg-[var(--card)] px-5 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--mint-50)]"
          >
            Back to home
          </Link>
        </div>

        <div className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm md:rounded-[2rem] md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)] md:text-sm">
                Profile
              </p>
              <h1 className="mt-1 text-xl font-bold text-[var(--foreground)] md:mt-2 md:text-3xl">Hi, {firstName}</h1>
              <p className="mt-1 text-xs text-[var(--muted-foreground)] md:mt-2 md:text-sm">
                Manage your account details here.
              </p>
            </div>

            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[var(--mint-200)] text-2xl font-bold text-[var(--accent-dark)] md:h-20 md:w-20 md:rounded-3xl md:text-3xl">
              {firstName.charAt(0).toUpperCase()}
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:mt-8 md:grid-cols-2 md:gap-4">
            {[
              ["Full name", "name"],
              ["Username", "username"],
              ["Email", "email"],
              ["Phone", "phone"],
              ["Address", "address"],
              ["City", "city"],
              ["Area", "area"],
            ].map(([label, key]) => (
              <div key={key} className="rounded-2xl bg-[var(--mint-50)] p-4 md:rounded-3xl md:p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)] md:text-xs">
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
                    className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--foreground)] md:rounded-2xl md:px-4 md:py-3 md:text-base"
                  />
                ) : (
                  <p className="mt-2 text-sm font-medium text-[var(--foreground)] md:text-base">
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

          <div className="mt-6 flex flex-wrap gap-3 md:mt-8">
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="w-full rounded-full bg-[var(--accent-dark)] px-6 py-3 text-sm font-semibold text-[var(--accent-foreground)] sm:w-auto"
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
                  className="w-full rounded-full bg-[var(--accent-dark)] px-6 py-3 text-sm font-semibold text-[var(--accent-foreground)] sm:w-auto"
                >
                  Save changes
                </button>

                <button
                  onClick={() => {
                    setDraft(profile || {});
                    setEditing(false);
                    setMessage("");
                  }}
                  className="w-full rounded-full border border-[var(--border)] bg-[var(--card)] px-6 py-3 text-sm font-semibold text-[var(--foreground)] sm:w-auto"
                >
                  Cancel
                </button>
              </>
            )}

            <Link
              href="/orders"
              className="w-full rounded-full border border-[var(--border)] bg-[var(--card)] px-6 py-3 text-center text-sm font-semibold text-[var(--foreground)] sm:w-auto"
            >
              My orders
            </Link>
          </div>

          {message && <p className="mt-4 text-sm text-[var(--accent-dark)]">{message}</p>}

         {role === "VENDOR" ? (
  <section className="mt-6 rounded-2xl bg-[var(--mint-50)] p-4 md:mt-8 md:rounded-3xl md:p-5">
    <h2 className="text-base font-semibold text-[var(--accent-dark)] md:text-lg">Vendor details</h2>

    {loadingVendorData ? (
      <p className="mt-3 text-sm text-[var(--muted-foreground)]">Loading vendor details...</p>
    ) : (
      <>
        <div className="mt-3 grid gap-2 text-sm text-[var(--muted-foreground)] md:mt-4 md:grid-cols-2 md:gap-3">
          <div>
            <span className="font-semibold text-[var(--foreground)]">
              Application status:
            </span>{" "}
            {vendorApp?.status || "—"}
          </div>

          <div>
            <span className="font-semibold text-[var(--foreground)]">
              Shop setup:
            </span>{" "}
            {vendorApp?.setupComplete ? "Completed" : "Incomplete"}
          </div>

          <div>
            <span className="font-semibold text-[var(--foreground)]">
              Shop visibility:
            </span>{" "}
            {vendorApp?.isPublic ? "Public" : "Hidden"}
          </div>

          <div>
            <span className="font-semibold text-[var(--foreground)]">
              Business email:
            </span>{" "}
            {vendorApp?.businessEmail || "—"}
          </div>

          <div>
            <span className="font-semibold text-[var(--foreground)]">Shop name:</span>{" "}
            {vendorApp?.shopName || "—"}
          </div>

          <div>
            <span className="font-semibold text-[var(--foreground)]">
              Trade license:
            </span>{" "}
            {vendorApp?.tradeLicenseNo || "—"}
          </div>

          <div className="md:col-span-2">
            <span className="font-semibold text-[var(--foreground)]">Address:</span>{" "}
            {vendorApp?.address || "—"}
          </div>

          <div>
            <span className="font-semibold text-[var(--foreground)]">City:</span>{" "}
            {vendorApp?.city || "—"}
          </div>

          <div>
            <span className="font-semibold text-[var(--foreground)]">Area:</span>{" "}
            {vendorApp?.area || "—"}
          </div>

          <div className="md:col-span-2">
            <span className="font-semibold text-[var(--foreground)]">Services:</span>{" "}
            {[
              vendorApp?.courierPickup ? "Courier pickup" : null,
              vendorApp?.inShopRepair ? "In-shop repair" : null,
              vendorApp?.spareParts ? "Spare parts" : null,
            ]
              .filter(Boolean)
              .join(", ") || "—"}
          </div>

          <div className="md:col-span-2">
            <span className="font-semibold text-[var(--foreground)]">Skill tags:</span>{" "}
            {vendorApp?.specialties?.length
              ? vendorApp.specialties.join(", ")
              : "—"}
          </div>

          {vendorApp?.rejectionReason ? (
            <div className="md:col-span-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              {vendorApp.rejectionReason}
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-3 md:mt-5">
          <Link
            href="/vendor/setup-shop"
            className="w-full rounded-full bg-[var(--accent-dark)] px-5 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] sm:w-auto"
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

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center"><p>Loading profile...</p></div>}>
      <ProfilePageInner />
    </Suspense>
  );
}