"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import ThemeToggle from "@/components/theme/ThemeToggle";
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

export default function VendorNavbar({
  isLoggedIn = false,
  firstName = "User",
  language = "en",
  onLanguageChange,
}: NavbarProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileUserMenuOpen, setMobileUserMenuOpen] = useState(false);

  const { data: session } = useSession();

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

  const mobileDisplayName = useMemo(() => {
    const rawName = session?.user?.name?.trim() || "User";
    const parts = rawName.split(/\s+/);
    if (parts.length >= 3) {
      return parts.slice(0, 2).join(" ");
    }
    return rawName;
  }, [session]);

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

  return (
    <>
      <header className="w-full border-b border-[var(--border)] bg-[var(--mint-100)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 md:px-6">
          <div className="flex items-center justify-between gap-3 md:grid md:grid-cols-[auto_1fr_auto] md:items-center md:gap-4">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="flex h-[43px] w-[43px] shrink-0 items-center justify-center rounded-[10px] bg-[var(--card)] text-lg text-[var(--foreground)] shadow-sm md:hidden"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>

            <div className="flex justify-start">
              <Link href="/" className="inline-flex items-center">
                <Image
                  src="/images/meramot.svg"
                  alt="Meramot"
                  width={280}
                  height={100}
                  className="h-[4.62rem] w-auto object-contain md:h-[5.1975rem] lg:h-[6.3525rem]"
                  priority
                  fetchPriority="high"
                />
              </Link>
            </div>

            <div className="flex shrink-0 items-center gap-2 md:gap-3">
              <NotificationBell />
              <div className="hidden md:flex md:items-center md:gap-3">
                <ThemeToggle />
                {!isLoggedIn ? (
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center text-center rounded-full bg-[var(--accent-dark)] px-6 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] shadow-sm transition hover:opacity-90"
                  >
                    Sign in
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
                        <div className="px-4 py-2 text-xs font-semibold uppercase text-[var(--muted-foreground)]">Vendor Portal</div>
                        {userRole === "VENDOR" ? (
                          <>
                            {isVendorSetupComplete ? (
                              <>
                                <Link href="/vendor/dashboard" className="block rounded-2xl px-4 py-3 text-sm font-semibold text-[var(--accent-dark)] transition hover:bg-[var(--mint-50)]" onClick={() => setIsUserMenuOpen(false)}>Vendor dashboard</Link>
                                <Link href="/vendor/analytics" className="block rounded-2xl px-4 py-3 text-sm text-[var(--foreground)] transition hover:bg-[var(--mint-50)]" onClick={() => setIsUserMenuOpen(false)}>Shop analytics</Link>
                                <Link href="/vendor/shop-profile" className="block rounded-2xl px-4 py-3 text-sm text-[var(--foreground)] transition hover:bg-[var(--mint-50)]" onClick={() => setIsUserMenuOpen(false)}>My Shop Profile</Link>
                                <Link href="/vendor/my-bids" className="block rounded-2xl px-4 py-3 text-sm text-[var(--foreground)] transition hover:bg-[var(--mint-50)]" onClick={() => setIsUserMenuOpen(false)}>My Offers</Link>
                              </>
                            ) : isVendorSetupIncomplete ? (
                              <Link href="/vendor/setup-shop" className="block rounded-2xl px-4 py-3 text-sm font-semibold text-[var(--accent-dark)] transition hover:bg-[var(--mint-50)]" onClick={() => setIsUserMenuOpen(false)}>Set up your shop</Link>
                            ) : (
                              <Link href="/vendor/onboarding" className="block rounded-2xl px-4 py-3 text-sm text-[var(--foreground)] transition hover:bg-[var(--mint-50)]" onClick={() => setIsUserMenuOpen(false)}>Vendor onboarding</Link>
                            )}
                          </>
                        ) : (
                          <Link href="/vendor/onboarding" className="block rounded-2xl px-4 py-3 text-sm text-[var(--foreground)] transition hover:bg-[var(--mint-50)]" onClick={() => setIsUserMenuOpen(false)}>Vendor onboarding</Link>
                        )}
                        <div className="my-1 border-t border-[var(--border)]"></div>
                        <Link href="/profile" className="block rounded-2xl px-4 py-3 text-sm text-[var(--foreground)] transition hover:bg-[var(--mint-50)]" onClick={() => setIsUserMenuOpen(false)}>View profile</Link>
                        <button onClick={() => { setIsUserMenuOpen(false); setShowLogoutConfirm(true); }} className="block w-full rounded-2xl px-4 py-3 text-left text-sm font-medium text-red-700 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-950/30">Log out</button>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="relative">
                  <button onClick={() => { setIsLangMenuOpen((prev) => !prev); setIsUserMenuOpen(false); }} className="rounded-full bg-[var(--mint-200)] px-5 py-2.5 text-sm font-medium text-[var(--foreground)]">
                    {language === "bn" ? "বাংলা" : "English"} ▼
                  </button>
                  {isLangMenuOpen && (
                    <div className="absolute right-0 z-30 mt-2 w-40 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2 shadow-lg">
                      <button onClick={() => { onLanguageChange?.("en"); setIsLangMenuOpen(false); }} className="block w-full rounded-xl px-4 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--mint-50)]">English</button>
                      <button onClick={() => { onLanguageChange?.("bn"); setIsLangMenuOpen(false); }} className="block w-full rounded-xl px-4 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--mint-50)]">বাংলা</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[110] md:hidden">
          <button type="button" aria-label="Close menu" onClick={() => setMobileMenuOpen(false)} className="mobile-sidebar-backdrop" />
          <aside className="mobile-sidebar-panel">
            <div className="mb-4 flex items-center justify-between">
              <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                <Image src="/images/meramot.svg" alt="Meramot" width={240} height={80} className="h-14 w-auto object-contain" />
              </Link>
              <button type="button" onClick={() => setMobileMenuOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--mint-100)] text-sm font-bold text-[var(--accent-dark)]">✕</button>
            </div>

            <div className="mb-4 flex items-center gap-4">
              <ThemeToggle />
            </div>

            <nav className="space-y-1">
              {!isLoggedIn ? (
                <div className="flex">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="inline-flex items-center justify-center rounded-xl bg-[var(--mint-50)] dark:bg-[var(--mint-200)] px-5 py-3 text-sm font-bold text-[var(--accent-dark)] transition hover:opacity-90">Sign in</Link>
                </div>
              ) : (
                <>
                  <button onClick={() => setMobileUserMenuOpen((prev) => !prev)} style={{ boxShadow: 'none' }} className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-bold text-[var(--accent-dark)] transition bg-[var(--mint-50)] dark:bg-[var(--mint-200)]">
                    <span className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-dark)] text-xs text-[var(--accent-foreground)]">
                        {mobileDisplayName.charAt(0).toUpperCase()}
                      </span>
                      {mobileDisplayName.toUpperCase()}
                    </span>
                    <span className={`text-xs transition-transform ${mobileUserMenuOpen ? 'rotate-180' : ''}`}>▼</span>
                  </button>

                  {mobileUserMenuOpen && (
                    <div className="ml-4 space-y-1 border-l-2 border-[var(--mint-200)] pl-4 mt-1 mb-2">
                      <div className="px-4 py-2 text-xs font-semibold uppercase text-[var(--muted-foreground)]">Vendor Portal</div>
                      {userRole === "VENDOR" && isVendorSetupComplete && (
                        <>
                          <Link href="/vendor/dashboard" onClick={() => setMobileMenuOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-semibold text-[var(--accent-dark)] transition hover:bg-[var(--mint-50)]">Vendor dashboard</Link>
                          <Link href="/vendor/analytics" onClick={() => setMobileMenuOpen(false)} className="block rounded-xl px-4 py-3 text-sm text-[var(--foreground)] transition hover:bg-[var(--mint-50)]">Shop analytics</Link>
                          <Link href="/vendor/shop-profile" onClick={() => setMobileMenuOpen(false)} className="block rounded-xl px-4 py-3 text-sm text-[var(--foreground)] transition hover:bg-[var(--mint-50)]">My Shop Profile</Link>
                          <Link href="/vendor/my-bids" onClick={() => setMobileMenuOpen(false)} className="block rounded-xl px-4 py-3 text-sm text-[var(--foreground)] transition hover:bg-[var(--mint-50)]">My Offers</Link>
                        </>
                      )}
                      {userRole === "VENDOR" && isVendorSetupIncomplete && (
                        <Link href="/vendor/setup-shop" onClick={() => setMobileMenuOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-semibold text-[var(--accent-dark)] transition hover:bg-[var(--mint-50)]">Set up your shop</Link>
                      )}
                      {userRole !== "VENDOR" && (
                        <Link href="/vendor/onboarding" onClick={() => setMobileMenuOpen(false)} className="block rounded-xl px-4 py-3 text-sm text-[var(--foreground)] transition hover:bg-[var(--mint-50)]">Vendor onboarding</Link>
                      )}
                      <div className="my-1 border-t border-[var(--border)] mr-4"></div>
                      <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="block rounded-xl px-4 py-3 text-sm text-[var(--foreground)] transition hover:bg-[var(--mint-50)]">View profile</Link>
                      <button onClick={() => { setMobileMenuOpen(false); setShowLogoutConfirm(true); }} className="block w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-red-700 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-950/30">Log out</button>
                    </div>
                  )}
                </>
              )}
            </nav>
          </aside>
        </div>
      )}

      {isUserMenuOpen && (
        <div className="fixed inset-0 z-[120] md:hidden">
          <button type="button" aria-label="Close user menu" onClick={() => setIsUserMenuOpen(false)} className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
          <div className="absolute right-3 top-16 z-[121] w-56 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-xl">
            <Link href="/profile" onClick={() => setIsUserMenuOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--mint-50)]">View profile</Link>
            <button onClick={() => { setIsUserMenuOpen(false); setShowLogoutConfirm(true); }} className="block w-full rounded-xl px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50">Log out</button>
          </div>
        </div>
      )}

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)} />
          <div className="relative z-[101] w-[90%] max-w-md rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8 shadow-2xl">
            <h2 className="text-center text-2xl font-bold text-[var(--accent-dark)]">Are you sure?</h2>
            <p className="mt-3 text-center text-sm text-[var(--muted-foreground)]">You will be logged out of your account.</p>
            <div className="mt-6 flex items-center justify-center gap-4">
              <button onClick={() => setShowLogoutConfirm(false)} className="rounded-full border border-[var(--accent-dark)] bg-[var(--card)] px-6 py-2.5 text-sm font-semibold text-[var(--accent-dark)] transition hover:bg-[var(--mint-50)]">No</button>
              <button onClick={confirmLogout} className="rounded-full bg-[var(--accent-dark)] px-6 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] transition hover:opacity-90">Yes</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
