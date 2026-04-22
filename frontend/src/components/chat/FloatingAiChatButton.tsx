"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function FloatingAiChatButton() {
  const pathname = usePathname();

  const hiddenPrefixes = [
    "/ai-chat",
    "/admin",
    "/delivery",
    "/vendor",
    "/login",
    "/signup",
  ];

  const shouldHide = hiddenPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (shouldHide) return null;

  return (
    <Link
      href="/ai-chat"
      aria-label="Open AI chat"
      className="group fixed bottom-6 right-6 z-[90] flex items-center gap-3 rounded-full bg-[var(--accent-dark)] px-4 py-3 text-white shadow-[0_12px_30px_rgba(36,66,41,0.28)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(36,66,41,0.38)]"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/16 ring-1 ring-white/20">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-6 w-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 10h.01M12 10h.01M15 10h.01M8.4 18.2 4 20l1.6-4.1A8 8 0 1 1 20 12"
          />
        </svg>
      </div>

      <div className="hidden sm:block">
        <p className="text-sm font-semibold leading-4">AI Help Chat</p>
        <p className="mt-1 text-xs text-white/80">
          Ask repair questions instantly
        </p>
      </div>
    </Link>
  );
}