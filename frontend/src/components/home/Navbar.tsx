"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, FormEvent, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { MapPin } from "lucide-react";
import ThemeToggle from "@/components/theme/ThemeToggle";
import NavbarLocationButton from "@/components/location/NavbarLocationButton";
import LocationPickerModal from "@/components/location/LocationPickerModal";
import { useSelectedLocation } from "@/components/location/useSelectedLocation";
import NotificationBell from "@/components/notifications/NotificationBell";
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

export function NavbarInner({
  isLoggedIn = false,
  firstName = "User",
  language = "en",
  onLanguageChange,
}: NavbarProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileUserMenuOpen, setMobileUserMenuOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const {
    selectedLocation,
    locationLabel,
    saveLocation,
  } = useSelectedLocation(isLoggedIn);

  const activeCategory =
    pathname === "/shops" ? searchParams.get("category") ?? "" : "";

  const { data: session, status } = useSession();

  const userRole = (session?.user as { role?: string } | undefined)?.role;
  const token = (session?.user as { accessToken?: string } | undefined)?.accessToken;

  const [vendorStatus, setVendorStatus] = useState<VendorNavbarStatus | null>(null);

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

  const vendorApplication = vendorStatus?.application;
  const isVendorSetupComplete =
    userRole === "VENDOR" &&
    vendorApplication?.status === "APPROVED" &&
    vendorApplication?.setupComplete === true;

  const isVendorSetupIncomplete =
    userRole === "VENDOR" &&
    vendorApplication?.status === "APPROVED" &&
    vendorApplication?.setupComplete !== true;

  const displayName = useMemo(() => {
    return firstName?.trim() || session?.user?.name?.split(" ")[0] || "User";
  }, [firstName, session]);

  const confirmLogout = async () => {
    setIsUserMenuOpen(false);
    setShowLogoutConfirm(false);
    setMobileMenuOpen(false);

    if (typeof window !== "undefined") {
      localStorage.removeItem("meramot.user");
      localStorage.removeItem("meramot.token");
      window.dispatchEvent(new Event("meramot-auth-changed"));
    }

    await signOut({ callbackUrl: "/" });
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();

    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    router.push(`/shops?q=${encodeURIComponent(trimmed)}`);
  };

  function openLocationModal() {
    setLocationModalOpen(true);
    setIsUserMenuOpen(false);
    setIsLangMenuOpen(false);
    setMobileMenuOpen(false);
  }

  return (
    <>
      <header className="w-full border-b border-[var(--border)] bg-[var(--mint-100)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-3 py-6 md:gap-4 md:px-6 md:py-5">
          {/* ── Row 1: Logo + hamburger (mobile) / Logo + location + actions (desktop) ── */}
          <div className="flex items-center justify-between gap-3 md:grid md:grid-cols-[auto_minmax(280px,1fr)_auto] md:items-center md:gap-4">
            {/* Hamburger — mobile only */}
              <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--card)] text-xl text-[var(--foreground)] shadow-sm md:hidden"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>

            <div className="flex flex-1 justify-center md:justify-start">
              <Link href="/" className="inline-flex items-center">
                <Image
                  src="/images/meramot.svg"
                  alt="Meramot"
                  width={280}
                  height={100}
                  className="h-32 w-auto scale-[1.75] object-contain md:h-[6rem] md:scale-100 lg:h-32"
                  priority
                />
              </Link>
            </div>

            {/* Desktop-only: location + actions */}
            <div className="hidden md:flex md:justify-center">
              <NavbarLocationButton label={locationLabel} onClick={openLocationModal} />
            </div>

            {/* Right side icons — always visible */}
            <div className="flex shrink-0 items-center gap-2 md:gap-3">
              <NotificationBell />
              {isLoggedIn ? (
                <button
                  onClick={() => {
                    setIsUserMenuOpen((prev) => !prev);
                    setIsLangMenuOpen(false);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-dark)] text-sm font-bold text-[var(--accent-foreground)] shadow-sm md:hidden"
                >
                  {displayName.charAt(0).toUpperCase()}
                </button>
              ) : null}
              {/* Desktop: full action bar */}
              <div className="hidden md:flex md:items-center md:gap-3">
                <ThemeToggle />
                {!isLoggedIn ? (
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center text-center rounded-full bg-[var(--accent-dark)] px-6 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] shadow-sm transition hover:opacity-90"
                  >
                    Sign in/Sign up
                  </Link>
                ) : (
                  <div className="relative">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen((prev) => !prev);
                        setIsLangMenuOpen(false);
                      }}
                      className="inline-flex items-center justify-center text-center rounded-full bg-[var(--accent-dark)] px-6 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] shadow-sm"
                    >
                      {displayName} ▼
                    </button>

                    {isUserMenuOpen && (
                      <div className="absolute right-0 z-30 mt-2 w-56 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-lg">
                        <Link
                          href="/profile"
                          className="block rounded-2xl px-4 py-3 text-sm text-[var(--foreground)] transition hover:bg-[var(--mint-50)]"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          View profile
                        </Link>

                        <Link
                          href="/orders"
                          className="block rounded-2xl px-4 py-3 text-sm text-[var(--foreground)] transition hover:bg-[var(--mint-50)]"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          Requests history
                        </Link>

                        {userRole === "ADMIN" && (
                          <Link
                            href="/admin"
                            className="block rounded-2xl px-4 py-3 text-sm font-semibold text-[var(--accent-dark)] transition hover:bg-[var(--mint-50)]"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            Admin dashboard
                          </Link>
                        )}

                        {userRole === "VENDOR" ? (
                          <>
                            {isVendorSetupComplete ? (
                              <>
                                <Link
                                  href="/vendor/dashboard"
                                  className="block rounded-2xl px-4 py-3 text-sm font-semibold text-[var(--accent-dark)] transition hover:bg-[var(--mint-50)]"
                                  onClick={() => setIsUserMenuOpen(false)}
                                >
                                  Vendor dashboard
                                </Link>
                                <Link
                                  href="/vendor/analytics"
                                  className="block rounded-2xl px-4 py-3 text-sm text-[var(--foreground)] transition hover:bg-[var(--mint-50)]"
                                  onClick={() => setIsUserMenuOpen(false)}
                                >
                                  Shop analytics
                                </Link>
                              </>
                            ) : isVendorSetupIncomplete ? (
                              <Link
                                href="/vendor/setup-shop"
                                className="block rounded-2xl px-4 py-3 text-sm font-semibold text-[var(--accent-dark)] transition hover:bg-[var(--mint-50)]"
                                onClick={() => setIsUserMenuOpen(false)}
                              >
                                Set up your shop
                              </Link>
                            ) : (
                              <Link
                                href="/vendor/onboarding"
                                className="block rounded-2xl px-4 py-3 text-sm text-[var(--foreground)] transition hover:bg-[var(--mint-50)]"
                                onClick={() => setIsUserMenuOpen(false)}
                              >
                                Vendor onboarding
                              </Link>
                            )}
                          </>
                        ) : null}

                        {userRole === "VENDOR" ? (
                          <Link
                            href="/vendor/my-bids"
                            className="block rounded-2xl px-4 py-3 text-sm text-[var(--foreground)] transition hover:bg-[var(--mint-50)]"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            My Offers
                          </Link>
                        ) : (
                          <Link
                            href="/requests/new"
                            className="block rounded-2xl px-4 py-3 text-sm text-[var(--foreground)] transition hover:bg-[var(--mint-50)]"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            Make Repair Request
                          </Link>
                        )}

                        <Link
                          href="/cart"
                          className="block rounded-2xl px-4 py-3 text-sm text-[var(--foreground)] transition hover:bg-[var(--mint-50)]"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          View cart
                        </Link>

                        <Link
                          href="/ai-chat"
                          className="block rounded-2xl px-4 py-3 text-sm text-[var(--foreground)] transition hover:bg-[var(--mint-50)]"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          AI help chat
                        </Link>

                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setShowLogoutConfirm(true);
                          }}
                          className="block w-full rounded-2xl px-4 py-3 text-left text-sm text-[var(--foreground)] transition hover:bg-[var(--mint-50)]"
                        >
                          Log out
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
                    className="rounded-full bg-[var(--mint-200)] px-5 py-2.5 text-sm font-medium text-[var(--foreground)]"
                  >
                    {language === "bn" ? "বাংলা" : "English"} ▼
                  </button>

                  {isLangMenuOpen && (
                    <div className="absolute right-0 z-30 mt-2 w-40 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2 shadow-lg">
                      <button
                        onClick={() => {
                          onLanguageChange?.("en");
                          setIsLangMenuOpen(false);
                        }}
                        className="block w-full rounded-xl px-4 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--mint-50)]"
                      >
                        English
                      </button>

                      <button
                        onClick={() => {
                          onLanguageChange?.("bn");
                          setIsLangMenuOpen(false);
                        }}
                        className="block w-full rounded-xl px-4 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--mint-50)]"
                      >
                        বাংলা
                      </button>
                    </div>
                  )}
                </div>
                <Link
                  href="/cart"
                  className="flex items-center justify-center rounded-full bg-[var(--mint-100)] p-2 transition hover:scale-105 hover:bg-[var(--mint-300)]"
                >
                  <Image
                    src="/images/cart.svg"
                    alt="Cart"
                    width={80}
                    height={80}
                    className="h-[45px] w-[45px]"
                  />
                </Link>
              </div>
            </div>
          </div>

          {/* ── Row 2: Mobile location button ── */}
          <div className="mt-4 md:mt-0 md:hidden">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openLocationModal}
                className="shrink-0 p-1.5 text-[var(--accent-dark)] md:hidden"
                aria-label="Change location"
              >
                <MapPin size={24} />
              </button>
              <form onSubmit={handleSearchSubmit} className="flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search shops, parts..."
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--mint-300)] px-4 py-2.5 text-[0.9rem] text-[var(--foreground)] shadow-sm outline-none placeholder:text-[var(--muted-foreground)]"
                />
              </form>
            </div>
          </div>

          {/* ── Row 3: Category tabs + search (desktop) ── */}
          <div className="mt-2 flex flex-col gap-2 md:mt-0 md:flex-row md:items-center md:justify-between md:gap-4">
            <div className="flex items-end gap-3 overflow-x-auto whitespace-nowrap text-xs font-semibold text-[var(--foreground)] md:gap-6 md:text-base">
              {categoryTabs.map((tab) => {
                const active = activeCategory === tab.value;
                const params = new URLSearchParams(searchParams.toString());
                params.set("category", tab.value);

                return (
                  <Link
                    key={tab.value}
                    href={`/shops?${params.toString()}`}
                    className={`inline-flex border-b-[3px] pb-1 transition ${
                      active
                        ? "border-[var(--accent-dark)] text-[var(--accent-dark)]"
                        : "border-transparent text-[var(--foreground)] hover:border-[var(--accent-dark)]/40"
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>

            <form onSubmit={handleSearchSubmit} className="hidden w-full md:block md:w-[520px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search shops, parts, devices, or repair types"
                className="w-full rounded-xl border-2 border-[var(--border)] bg-[var(--mint-300)] px-5 py-3 text-sm text-[var(--foreground)] shadow-sm outline-none placeholder:text-[var(--muted-foreground)]"
              />
            </form>
          </div>
        </div>
      </header>

      {/* ── Mobile hamburger drawer ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[110] md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileMenuOpen(false)}
            className="mobile-sidebar-backdrop"
          />

          <aside className="mobile-sidebar-panel">
            <div className="mb-4 flex items-center justify-between">
              <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                <Image
                  src="/images/meramot.svg"
                  alt="Meramot"
                  width={240}
                  height={80}
                  className="h-14 w-auto object-contain"
                />
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--mint-100)] text-sm font-bold text-[var(--accent-dark)]"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 flex items-center gap-4">
              <ThemeToggle />
              <Link
                href="/cart"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center rounded-full bg-[var(--mint-100)] p-2 transition hover:scale-105"
              >
                <Image src="/images/cart.svg" alt="Cart" width={24} height={24} className="h-6 w-6" />
              </Link>
            </div>

            <nav className="space-y-1">
              {!isLoggedIn ? (
                <>
                  <Link
                    href="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-xl px-4 py-3 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--mint-50)]"
                  >
                    🏠 Home
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-xl px-4 py-3 text-sm font-semibold text-[var(--accent-dark)] transition hover:bg-[var(--mint-50)]"
                  >
                    🔑 Sign in / Sign up
                  </Link>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setMobileUserMenuOpen((prev) => !prev)}
                    className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-bold text-[var(--accent-dark)] transition hover:bg-[var(--mint-50)]"
                  >
                    <span className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-dark)] text-xs text-[var(--accent-foreground)]">
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                      {displayName}
                    </span>
                    <span className={`text-xs transition-transform ${mobileUserMenuOpen ? 'rotate-180' : ''}`}>▼</span>
                  </button>

                  {mobileUserMenuOpen && (
                    <div className="ml-4 space-y-1 border-l-2 border-[var(--mint-200)] pl-4 mt-1 mb-2">
                      <Link
                        href="/profile"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block rounded-xl px-4 py-3 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--mint-50)]"
                      >
                        👤 Profile
                      </Link>

                      <Link
                        href="/orders"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block rounded-xl px-4 py-3 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--mint-50)]"
                      >
                        📋 My Orders
                      </Link>

                      {userRole === "ADMIN" && (
                        <Link
                          href="/admin"
                          onClick={() => setMobileMenuOpen(false)}
                          className="block rounded-xl px-4 py-3 text-sm font-semibold text-[var(--accent-dark)] transition hover:bg-[var(--mint-50)]"
                        >
                          ⚙️ Admin Dashboard
                        </Link>
                      )}

                      {userRole === "VENDOR" && isVendorSetupComplete && (
                        <>
                          <Link
                            href="/vendor/dashboard"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block rounded-xl px-4 py-3 text-sm font-semibold text-[var(--accent-dark)] transition hover:bg-[var(--mint-50)]"
                          >
                            🏪 Vendor Dashboard
                          </Link>
                          <Link
                            href="/vendor/analytics"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block rounded-xl px-4 py-3 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--mint-50)]"
                          >
                            📊 Shop Analytics
                          </Link>
                        </>
                      )}

                      {userRole === "VENDOR" && isVendorSetupIncomplete && (
                        <Link
                          href="/vendor/setup-shop"
                          onClick={() => setMobileMenuOpen(false)}
                          className="block rounded-xl px-4 py-3 text-sm font-semibold text-[var(--accent-dark)] transition hover:bg-[var(--mint-50)]"
                        >
                          🛠️ Set Up Shop
                        </Link>
                      )}

                      {userRole === "VENDOR" ? (
                        <Link
                          href="/vendor/my-bids"
                          onClick={() => setMobileMenuOpen(false)}
                          className="block rounded-xl px-4 py-3 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--mint-50)]"
                        >
                          💰 My Offers
                        </Link>
                      ) : (
                        <Link
                          href="/requests/new"
                          onClick={() => setMobileMenuOpen(false)}
                          className="block rounded-xl px-4 py-3 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--mint-50)]"
                        >
                          🔧 Make Repair Request
                        </Link>
                      )}
                      
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setShowLogoutConfirm(true);
                        }}
                        className="block w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                      >
                        🚪 Log out
                      </button>
                    </div>
                  )}

                  <Link
                    href="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-xl px-4 py-3 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--mint-50)]"
                  >
                    🏠 Home
                  </Link>

                  <Link
                    href="/ai-chat"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-xl px-4 py-3 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--mint-50)]"
                  >
                    🤖 AI Help
                  </Link>
                </>
              )}
            </nav>
          </aside>
        </div>
      )}

      {/* ── Mobile user dropdown (for profile icon tap) ── */}
      {isUserMenuOpen && (
        <div className="fixed inset-0 z-[120] md:hidden">
          <button
            type="button"
            aria-label="Close user menu"
            onClick={() => setIsUserMenuOpen(false)}
            className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
          />
          <div className="absolute right-3 top-16 z-[121] w-56 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-xl">
            <Link href="/profile" onClick={() => setIsUserMenuOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--mint-50)]">
              View profile
            </Link>
            <Link href="/orders" onClick={() => setIsUserMenuOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--mint-50)]">
              My requests
            </Link>
            <Link href="/cart" onClick={() => setIsUserMenuOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--mint-50)]">
              Cart
            </Link>
            <button
              onClick={() => { setIsUserMenuOpen(false); setShowLogoutConfirm(true); }}
              className="block w-full rounded-xl px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
            >
              Log out
            </button>
          </div>
        </div>
      )}

      {locationModalOpen && (
        <LocationPickerModal
          selectedLocation={selectedLocation}
          onClose={() => setLocationModalOpen(false)}
          onConfirm={saveLocation}
        />
      )}

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setShowLogoutConfirm(false)}
          />

          <div className="relative z-[101] w-[90%] max-w-md rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8 shadow-2xl">
            <h2 className="text-center text-2xl font-bold text-[var(--accent-dark)]">
              Are you sure?
            </h2>

            <p className="mt-3 text-center text-sm text-[var(--muted-foreground)]">
              You will be logged out of your account.
            </p>

            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="rounded-full border border-[var(--accent-dark)] bg-[var(--card)] px-6 py-2.5 text-sm font-semibold text-[var(--accent-dark)] transition hover:bg-[var(--mint-50)]"
              >
                No
              </button>

              <button
                onClick={confirmLogout}
                className="rounded-full bg-[var(--accent-dark)] px-6 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] transition hover:opacity-90"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import { Suspense } from "react";

export default function Navbar(props: NavbarProps) {
  return (
    <Suspense fallback={<div style={{ height: "70px" }}></div>}>
      <NavbarInner {...props} />
    </Suspense>
  );
}
