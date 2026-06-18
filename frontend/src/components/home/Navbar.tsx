"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, FormEvent, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import ThemeToggle from "@/components/theme/ThemeToggle";
import NavbarLocationButton from "@/components/location/NavbarLocationButton";
import LocationPickerModal from "@/components/location/LocationPickerModal";
import { useSelectedLocation } from "@/components/location/useSelectedLocation";
import NotificationBell from "@/components/notifications/NotificationBell";

type NavbarProps = {
  isLoggedIn?: boolean;
  firstName?: string;
};

const categoryTabs = [
  { label: "Courier Pickup", value: "COURIER_PICKUP" },
  { label: "In-shop Repair", value: "IN_SHOP_REPAIR" },
  { label: "Spare Parts", value: "SPARE_PARTS" },
] as const;

function NavbarContent({
  isLoggedIn = false,
  firstName = "User",
}: NavbarProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);

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

  const displayName = useMemo(() => {
    return firstName?.trim() || "User";
  }, [firstName]);

  const confirmLogout = async () => {
    setIsUserMenuOpen(false);
    setShowLogoutConfirm(false);

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
  }

  return (
    <>
      <header className="w-full border-b border-[var(--border)] bg-[var(--mint-100)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 md:px-6">
          <div className="grid grid-cols-[auto_1fr] gap-4 md:grid-cols-[auto_minmax(280px,1fr)_auto] md:items-center">
            <Link href="/" className="inline-flex items-center">
              <Image
                src="/images/meramot.svg"
                alt="Meramot"
                width={280}
                height={100}
                className="h-16 w-auto object-contain md:h-20"
                priority
              />
            </Link>

            <div className="flex justify-end md:justify-center">
              <NavbarLocationButton label={locationLabel} onClick={openLocationModal} />
            </div>

            <div className="col-span-2 flex flex-wrap items-center gap-3 md:col-span-1 md:justify-end">
              <ThemeToggle />

              {!isLoggedIn ? (
                <Link
                  href="/login"
                  className="rounded-full bg-[var(--accent-dark)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                >
                  Sign in
                </Link>
              ) : (
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen((prev) => !prev);
                    }}
                    className="rounded-full bg-[var(--accent-dark)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm"
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

                      <Link
                        href="/requests/new"
                        className="block rounded-2xl px-4 py-3 text-sm text-[var(--foreground)] transition hover:bg-[var(--mint-50)]"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        Make request
                      </Link>

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

                      <Link
                        href="/support"
                        className="block rounded-2xl px-4 py-3 text-sm text-[var(--foreground)] transition hover:bg-[var(--mint-50)]"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        Customer Support
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


              <NotificationBell />

            </div>
          </div>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-end gap-6 overflow-x-auto whitespace-nowrap font-semibold text-[var(--foreground)]">
              {categoryTabs.map((tab) => {
                const active = activeCategory === tab.value;
                return (
                  <Link
                    key={tab.value}
                    href={`/shops?category=${tab.value}`}
                    className={`inline-flex border-b-[3px] pb-1 transition ${active
                      ? "border-[var(--accent-dark)] text-[var(--accent-dark)]"
                      : "border-transparent text-[var(--foreground)] hover:border-[var(--accent-dark)]/40"
                      }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>

            <form onSubmit={handleSearchSubmit} className="relative w-full md:w-[520px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search shops, parts, devices, or repair types"
                className="w-full rounded-xl border-2 border-[var(--border)] bg-[var(--mint-300)] focus:bg-[var(--mint-500)] transition-colors duration-200 pl-5 pr-12 py-3 text-sm text-[var(--foreground)] shadow-sm outline-none placeholder:text-[var(--muted-foreground)] focus:placeholder:text-[var(--foreground)]"
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--accent-dark)] hover:opacity-80 transition-opacity"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </header>

      {locationModalOpen && (
        <LocationPickerModal
          selectedLocation={selectedLocation}
          onClose={() => setLocationModalOpen(false)}
          onConfirm={async (location) => {
            await saveLocation(location);
          }}
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
                className="rounded-full bg-[var(--accent-dark)] px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
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

export default function Navbar(props: NavbarProps) {
  return (
    <Suspense fallback={<div className="h-20 w-full bg-[var(--mint-100)]" />}>
      <NavbarContent {...props} />
    </Suspense>
  );
}
