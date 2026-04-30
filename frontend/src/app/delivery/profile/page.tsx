"use client";

import Image from "next/image";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDeliveryAuth } from "@/lib/delivery-auth-context";

export default function ProfilePage() {
  const router = useRouter();
  const { me, logout } = useDeliveryAuth();
  const deliveryName = me?.user?.name ?? me?.user?.username ?? "Delivery Partner";
  const verificationStatus = me?.registrationStatus ?? me?.status ?? "UNKNOWN";

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl flex-col px-4 py-6 sm:px-5 sm:py-8">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:p-6">
        <div className="mb-6 flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--mint-100)]">
            {me?.user?.avatarUrl ? (
              <Image
                src={me.user.avatarUrl}
                alt={deliveryName}
                width={96}
                height={96}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-[var(--accent-dark)]">
                {deliveryName.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-bold text-[var(--foreground)]">{deliveryName}</h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">Deliveryman Data</p>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--mint-50)] p-4">
          <p className="text-sm text-[var(--foreground)]">
            <span className="font-semibold">Email:</span> {me?.user?.email ?? "-"}
          </p>
          <p className="text-sm text-[var(--foreground)]">
            <span className="font-semibold">Phone:</span> {me?.user?.phone ?? "-"}
          </p>
          <p className="text-sm text-[var(--foreground)]">
            <span className="font-semibold">Vehicle:</span> {me?.vehicleType ?? "-"}
          </p>
          <p className="text-sm text-[var(--foreground)]">
            <span className="font-semibold">Verification Status:</span> {verificationStatus}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            logout();
            router.push("/delivery/login");
          }}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100"
        >
          <LogOut size={18} /> Sign Out
        </button>
      </div>
    </div>
  );
}
