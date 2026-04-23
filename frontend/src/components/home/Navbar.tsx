"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import ThemeToggle from "@/components/theme/ThemeToggle";

type NavbarProps = {
  isLoggedIn?: boolean;
  firstName?: string;
  language?: "en" | "bn";
  onLanguageChange?: (lang: "en" | "bn") => void;
};

const categoryTabs = [
  { label: "Courier Pickup", value: "COURIER_PICKUP" },
  { label: "In-shop Repair", value: "IN_SHOP_REPAIR" },
  { label: "Spare Parts", value: "SPARE_PARTS" },
] as const;

export default function Navbar({
  isLoggedIn = false,
  firstName = "User",
  language = "en",
  onLanguageChange,
}: NavbarProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeCategory =
    pathname === "/shops" ? searchParams.get("category") ?? "" : "";

  const displayName = useMemo(() => {
    return firstName?.trim() || "User";
  }, [firstName]);

  const confirmLogout = async () => {
    setIsUserMenuOpen(false);
    setShowLogoutConfirm(false);
    await signOut({ callbackUrl: "/" });
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();

    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    router.push(`/shops?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <>
      <header className="w-full border-b border-[var(--border)] bg-[var(--mint-100)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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

            <div className="flex flex-wrap items-center gap-3 md:justify-end">
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
                      setIsLangMenuOpen(false);
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
            </div>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-end gap-6 font-semibold text-[var(--foreground)]">
              {categoryTabs.map((tab) => {
                const active = activeCategory === tab.value;
                return (
                  <Link
                    key={tab.value}
                    href={`/shops?category=${tab.value}`}
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

            <form onSubmit={handleSearchSubmit} className="w-full md:w-[520px]">
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