"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bike, ShieldAlert } from "lucide-react";
import { getDeliveryMe, type RiderProfileStatusResponse } from "@/lib/api";

type SessionUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  accessToken?: string | null;
};

export default function DeliveryDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const sessionUser = session?.user as SessionUser | undefined;
  
  const [profileData, setProfileData] = useState<RiderProfileStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated" || !sessionUser?.accessToken) {
      router.replace("/login");
      return;
    }

    if (sessionUser.role !== "DELIVERY") {
      router.replace("/");
      return;
    }

    getDeliveryMe(sessionUser.accessToken)
      .then((data) => {
        setProfileData(data);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to fetch delivery profile status. " + (err instanceof Error ? err.message : ""));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [status, sessionUser, router]);

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <p className="text-muted-foreground animate-pulse">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  const registrationStatus = profileData?.riderName?.registrationStatus ?? "PENDING";
  const firstName = sessionUser?.name?.split(/\s+/)[0] || "Rider";

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight text-accent-dark">
          Delivery Dashboard
        </h1>
        <div className="rounded-full bg-accent/20 p-3 text-accent-dark">
          <Bike size={24} />
        </div>
      </div>

      {registrationStatus === "PENDING" ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-amber-100 p-3 text-amber-700">
              <ShieldAlert size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-amber-900">Pending Admin Approval</h2>
              <p className="mt-2 text-amber-800">
                Your delivery partner profile has been registered but is currently waiting for admin approval. 
                You will not be able to accept or manage orders until an operations administrator activates your account.
              </p>
              <div className="mt-6 border-t border-amber-200/60 pt-4">
                <p className="text-sm font-medium text-amber-700">
                  Check back later or contact support if you believe this is a mistake.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : registrationStatus === "REJECTED" ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
          <h2 className="text-xl font-bold text-red-900">Application Rejected</h2>
          <p className="mt-2 text-red-800">
            Your registration was not approved. Please contact support for more details.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-accent-dark">Welcome back, {firstName}</h2>
            <p className="mt-2 text-muted-foreground">
              Your profile is active. You can now accept and manage repair deliveries.
            </p>
          </div>
          
          <div className="rounded-3xl border border-dashed border-border bg-slate-50/50 p-12 text-center">
            <p className="text-muted-foreground">
              Delivery management features (orders, earnings, map) will be fully restored in Phase 13.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
