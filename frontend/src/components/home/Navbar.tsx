"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

type NavbarProps = {
  isLoggedIn?: boolean;
  firstName?: string;
  language?: "en" | "bn";
  onLanguageChange?: (lang: "en" | "bn") => void;
};

export default function Navbar({
  isLoggedIn = false,
  firstName = "User",
  language = "en",
  onLanguageChange,
}: NavbarProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const router = useRouter();

  const displayName = useMemo(() => {
    return firstName?.trim() || "User";
  }, [firstName]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsUserMenuOpen(false);
    router.push("/");
    router.refresh();
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();

    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    router.push(`/shops?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <header className="w-full border-b border-[#c7ddc8] bg-[#d5ead8]">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 md:px-6">

        {/* 🔹 ROW 1 */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          {/* Logo */}
          <Link href="/" className="inline-flex items-center">
            <Image
              src="/images/meramot.png"
              alt="Meramot"
              width={280}
              height={100}
              className="h-16 w-auto object-contain md:h-20"
              priority
            />
          </Link>

          {/* Right side */}
          <div className="flex flex-wrap items-center gap-3 md:justify-end">

            {/* Sign in OR user dropdown */}
            {!isLoggedIn ? (
              <Link
                href="/login"
                className="rounded-full bg-[#214c34] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
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
                  className="rounded-full bg-[#214c34] px-6 py-2.5 text-sm font-semibold text-white shadow-sm"
                >
                  {displayName} ▼
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-[#d9e5d5] bg-white p-2 shadow-lg z-30">

                    <Link
                      href="/account"
                      className="block rounded-xl px-4 py-2 text-sm text-[#234733] hover:bg-[#eef5ea]"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      Account details
                    </Link>

                    <Link
                      href="/requests/new"
                      className="block rounded-xl px-4 py-2 text-sm text-[#234733] hover:bg-[#eef5ea]"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      Make request
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="block w-full rounded-xl px-4 py-2 text-left text-sm text-[#234733] hover:bg-[#eef5ea]"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Language dropdown */}
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
                <div className="absolute right-0 mt-2 w-40 rounded-2xl border border-[#d9e5d5] bg-white p-2 shadow-lg z-30">
                  <button
                    onClick={() => {
                      onLanguageChange?.("en");
                      setIsLangMenuOpen(false);
                    }}
                    className="block w-full rounded-xl px-4 py-2 text-left text-sm hover:bg-[#eef5ea]"
                  >
                    English
                  </button>

                  <button
                    onClick={() => {
                      onLanguageChange?.("bn");
                      setIsLangMenuOpen(false);
                    }}
                    className="block w-full rounded-xl px-4 py-2 text-left text-sm hover:bg-[#eef5ea]"
                  >
                    বাংলা
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* 🔹 ROW 2 */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          {/* Categories */}
          <div className="flex flex-wrap items-center gap-4 text-[#1d3528] font-semibold">
            <Link href="/shops?category=COURIER_PICKUP" className="hover:underline">
              Courier Pickup
            </Link>

            <Link href="/shops?category=IN_SHOP_REPAIR" className="hover:underline">
              In-shop Repair
            </Link>

            <Link href="/shops?category=SPARE_PARTS" className="hover:underline">
              Spare Parts
            </Link>
          </div>

          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="w-full md:w-[520px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shops, parts, devices, or repair types"
              className="w-full rounded-xl border-2 border-[#2f4030] bg-[#a9bb83] px-5 py-3 text-sm text-[#183325] shadow-sm outline-none placeholder:text-[#2f4030]"
            />
          </form>

        </div>
      </div>
    </header>
  );
}