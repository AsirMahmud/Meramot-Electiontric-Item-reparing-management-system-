"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { getVendorApplicationStatus } from "@/lib/api";

type NavbarProps = {
  isLoggedIn?: boolean;
  firstName?: string;
  language?: "en" | "bn";
  onLanguageChange?: (lang: "en" | "bn") => void;
};

type VendorNavbarStatus = {
  application?: {
    status: "PENDING" | "APPROVED" | "REJECTED";
    setupComplete?: boolean;
  };
  message?: string;
};

const categoryTabs = [
  { label: "Courier Pickup", value: "COURIER_PICKUP" },
  { label: "In-shop Repair", value: "IN_SHOP_REPAIR" },
  { label: "Spare Parts", value: "SPARE_PARTS" },
] as const;

function NavbarContent({
  isLoggedIn,
  firstName,
  language = "en",
  onLanguageChange,
}: NavbarProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [vendorStatus, setVendorStatus] = useState<VendorNavbarStatus | null>(null);

  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeCategory =
    pathname === "/shops" ? searchParams.get("category") ?? "" : "";

  const resolvedIsLoggedIn = isLoggedIn ?? !!session?.user;

  const resolvedFirstName = useMemo(() => {
    if (firstName?.trim()) return firstName.trim();

    const sessionName =
      session?.user?.name?.trim()?.split(" ")[0] ||
      (session?.user as { username?: string } | undefined)?.username
        ?.trim()
        ?.split(" ")[0];

    return sessionName || "User";
  }, [firstName, session]);

  const displayName = resolvedFirstName;

  const userRole =
    (session?.user as { role?: string; accessToken?: string } | undefined)?.role ?? null;

  const token =
    (session?.user as { accessToken?: string } | undefined)?.accessToken;

  useEffect(() => {
    async function loadVendorStatus() {
      if (userRole !== "VENDOR" || !token) {
        setVendorStatus(null);
        return;
      }

      try {
        const result = (await getVendorApplicationStatus(token)) as VendorNavbarStatus;
        setVendorStatus(result);
      } catch {
        setVendorStatus(null);
      }
    }

    loadVendorStatus();
  }, [userRole, token]);

  const confirmLogout = async () => {
    setIsUserMenuOpen(false);
    setShowLogoutConfirm(false);
    setVendorStatus(null);

    try {
      const result = await signOut({
        redirect: false,
        callbackUrl: "/",
      });
      router.replace(result?.url || "/");
    } catch {
      router.replace("/");
    } finally {
      router.refresh();
    }
  };

  const vendorApplication = vendorStatus?.application;

  const isVendorSetupComplete =
    userRole === "VENDOR" &&
    vendorApplication?.status === "APPROVED" &&
    vendorApplication?.setupComplete === true;

  const isVendorSetupIncomplete =
    userRole === "VENDOR" &&
    vendorApplication?.status === "APPROVED" &&
    vendorApplication?.setupComplete !== true;

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    router.push(`/shops?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <>
      <header className="w-full border-b border-[#c7ddc8] bg-[#d5ead8]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Link href="/" className="inline-flex items-center group">
              <Image
                src="/images/meramot.svg"
                alt="Meramot"
                width={280}
                height={100}
                className="h-16 w-auto object-contain md:h-20 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-105 group-hover:-translate-y-0.5"
                priority
              />
            </Link>

            <div className="flex flex-wrap items-center gap-3 md:justify-end">
              {!resolvedIsLoggedIn ? (
                <Link
                  href="/login"
                  className="rounded-full bg-[#214c34] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#183625]"
                >
                  Sign in / Sign up
                </Link>
              ) : (
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen((prev) => !prev);
                      setIsLangMenuOpen(false);
                    }}
                    className="rounded-full border border-[#214c34] bg-white px-5 py-2.5 text-sm font-semibold text-[#214c34]"
                  >
                    Hi, {displayName} ▼
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 z-30 mt-2 w-64 rounded-2xl border border-[#d9e5d5] bg-white p-2 shadow-lg">
                      {userRole === "VENDOR" ? (
                        <>
                          {isVendorSetupComplete ? (
                            <>
                              <Link
                                href="/vendor/dashboard"
                                className="block rounded-2xl px-4 py-3 text-sm font-semibold text-[#234733] transition hover:bg-[#eef5ea]"
                                onClick={() => setIsUserMenuOpen(false)}
                              >
                                Vendor dashboard
                              </Link>

                              <Link
                                href="/vendor/analytics"
                                className="block rounded-2xl px-4 py-3 text-sm text-[#234733] transition hover:bg-[#eef5ea]"
                                onClick={() => setIsUserMenuOpen(false)}
                              >
                                Shop analytics
                              </Link>

                              <Link
                                href="/profile"
                                className="block rounded-2xl px-4 py-3 text-sm text-[#234733] transition hover:bg-[#eef5ea]"
                                onClick={() => setIsUserMenuOpen(false)}
                              >
                                View profile
                              </Link>
                            </>
                          ) : isVendorSetupIncomplete ? (
                            <>
                              <Link
                                href="/vendor/setup-shop"
                                className="block rounded-2xl px-4 py-3 text-sm font-semibold text-[#234733] transition hover:bg-[#eef5ea]"
                                onClick={() => setIsUserMenuOpen(false)}
                              >
                                Set up your shop
                              </Link>
                            </>
                          ) : (
                            <Link
                              href="/vendor/onboarding"
                              className="block rounded-2xl px-4 py-3 text-sm text-[#234733] transition hover:bg-[#eef5ea]"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              Vendor onboarding
                            </Link>
                          )}
                        </>
                      ) : (
                        <>
                          <Link
                            href="/profile"
                            className="block rounded-2xl px-4 py-3 text-sm text-[#234733] transition hover:bg-[#eef5ea]"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            View profile
                          </Link>

                          <Link
                            href="/orders"
                            className="block rounded-2xl px-4 py-3 text-sm text-[#234733] transition hover:bg-[#eef5ea]"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            Requests history
                          </Link>


                          {userRole === "ADMIN" && (
                            <Link
                              href="/admin/vendors"
                              className="block rounded-2xl px-4 py-3 text-sm font-semibold text-[#234733] transition hover:bg-[#eef5ea]"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              Admin dashboard
                            </Link>
                          )}
                        </>
                      )}

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setShowLogoutConfirm(true);
                        }}
                        className="block w-full rounded-2xl px-4 py-3 text-left text-sm text-[#234733] transition hover:bg-[#eef5ea]"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="relative">
                <button
                  onClick={() => {
                    setIsLangMenuOpen((prev) => !prev);
                    setIsUserMenuOpen(false);
                  }}
                  className="rounded-full bg-[#c8ddb4] px-5 py-2.5 text-sm font-medium text-[#1d3528]"
                >
                  {language === "bn" ? "বাংলা" : "English"} ▼
                </button>

                {isLangMenuOpen && (
                  <div className="absolute right-0 z-30 mt-2 w-40 rounded-2xl border border-[#d9e5d5] bg-white p-2 shadow-lg">
                    <button
                      onClick={() => {
                        onLanguageChange?.("en");
                        setIsLangMenuOpen(false);
                      }}
                      className="block w-full rounded-xl px-3 py-2 text-left text-sm text-[#234733] hover:bg-[#eef5ea]"
                    >
                      English
                    </button>
                    <button
                      onClick={() => {
                        onLanguageChange?.("bn");
                        setIsLangMenuOpen(false);
                      }}
                      className="block w-full rounded-xl px-3 py-2 text-left text-sm text-[#234733] hover:bg-[#eef5ea]"
                    >
                      বাংলা
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-col gap-3 md:flex-row md:items-center"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shops, devices, or services..."
              className="w-full rounded-full border border-[#b9ceb7] bg-white px-5 py-3 text-sm outline-none placeholder:text-[#70836d] md:flex-1"
            />
            <button
              type="submit"
              className="rounded-full bg-[#214c34] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#183625]"
            >
              Search
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (resolvedIsLoggedIn) {
                  router.push("/requests/new");
                } else {
                  setShowLoginModal(true);
                }
              }}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                pathname === "/requests/new"
                  ? "bg-[#214c34] text-white"
                  : "border border-[#b9ceb7] bg-white text-[#214c34]"
              }`}
            >
              Repair Request
            </button>
            {categoryTabs.map((tab) => {
              const isActive = activeCategory === tab.value;

              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    const params = new URLSearchParams(searchParams.toString());

                    if (pathname !== "/shops") {
                      params.set("category", tab.value);
                      router.push(`/shops?${params.toString()}`);
                      return;
                    }

                    if (isActive) {
                      params.delete("category");
                    } else {
                      params.set("category", tab.value);
                    }

                    router.push(`/shops?${params.toString()}`);
                  }}
                  className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                    isActive
                      ? "bg-[#214c34] text-white"
                      : "border border-[#b9ceb7] bg-white text-[#214c34]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="text-xl font-bold text-[#173726]">Sign out?</h3>
            <p className="mt-2 text-sm text-[#5b7262]">
              You will need to sign in again to access your account.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 rounded-full border border-[#214c34] bg-white px-5 py-3 text-sm font-semibold text-[#214c34]"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 rounded-full bg-[#214c34] px-5 py-3 text-sm font-semibold text-white"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="text-xl font-bold text-[#173726]">Sign in required</h3>
            <p className="mt-2 text-sm text-[#5b7262]">
              You need to sign in to make a repair request.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowLoginModal(false)}
                className="flex-1 rounded-full border border-[#214c34] bg-white px-5 py-3 text-sm font-semibold text-[#214c34]"
              >
                Cancel
              </button>
              <Link
                href="/login"
                className="flex flex-1 items-center justify-center rounded-full bg-[#214c34] px-5 py-3 text-sm font-semibold text-white"
                onClick={() => setShowLoginModal(false)}
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function Navbar(props: NavbarProps) {
  return (
    <Suspense fallback={<div className="h-20 w-full border-b border-[#c7ddc8] bg-[#d5ead8]" />}>
      <NavbarContent {...props} />
    </Suspense>
  );
}