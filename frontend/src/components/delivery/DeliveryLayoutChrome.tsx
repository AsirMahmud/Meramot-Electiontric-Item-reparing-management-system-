"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { isPublicDeliveryPath } from "@/lib/delivery-auth-context";
import { Sidebar } from "./Sidebar";

export function DeliveryLayoutChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublic = isPublicDeliveryPath(pathname);

  if (isPublic) {
    return (
      <div className="min-h-screen bg-[#E4FCD5] text-foreground font-sans flex flex-col">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E4FCD5] text-foreground font-sans">
      <Sidebar />
      <main className="min-h-screen md:pl-[280px]">
        <div className="mx-auto w-full max-w-7xl px-4 pb-4 pt-2 md:px-8 md:pb-8 md:pt-4">{children}</div>
      </main>
    </div>
  );
}
