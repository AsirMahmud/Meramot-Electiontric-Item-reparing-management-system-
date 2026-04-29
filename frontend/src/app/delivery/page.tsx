"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchDeliveryDeliveries, type DeliveryWithJob } from "@/lib/api";
import { useDeliveryAuth } from "@/lib/delivery-auth-context";

const ACTIVE_DELIVERY_STATUSES = ["PENDING", "SCHEDULED", "DISPATCHED", "PICKED_UP", "IN_TRANSIT"];

export default function DeliveryDashboardPage() {
  const { token, me } = useDeliveryAuth();
  const [deliveries, setDeliveries] = useState<DeliveryWithJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<"ACTIVE" | "ASSIGNED">("ACTIVE");

  const registrationStatus = me?.registrationStatus ?? "APPROVED";

  useEffect(() => {
    if (!token || registrationStatus !== "APPROVED") {
      setDeliveries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    fetchDeliveryDeliveries(token)
      .then((data) => setDeliveries(data.deliveries))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load deliveries"))
      .finally(() => setLoading(false));
  }, [token, registrationStatus]);

  const activeCount = useMemo(
    () => deliveries.filter((d) => ACTIVE_DELIVERY_STATUSES.includes(d.status)).length,
    [deliveries],
  );
  const completedCount = useMemo(
    () => deliveries.filter((d) => d.status === "DELIVERED").length,
    [deliveries],
  );
  const completedEarnings = useMemo(
    () => deliveries.filter((d) => d.status === "DELIVERED").reduce((sum, d) => sum + (d.fee ?? 0), 0),
    [deliveries],
  );
  const activeDeliveries = useMemo(
    () => deliveries.filter((d) => ACTIVE_DELIVERY_STATUSES.includes(d.status)),
    [deliveries],
  );
  const visibleDeliveries = viewMode === "ACTIVE" ? activeDeliveries : deliveries;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d9e5d5] bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#163625]/65">Delivery Dashboard</p>
        <h1 className="mt-1 text-2xl font-extrabold text-[#163625]">
          Welcome, {me?.user?.name ?? me?.user?.username ?? "Partner"}
        </h1>
        <p className="mt-2 text-sm text-[#163625]/70">
          Track assigned orders, delivery status, and current earnings in one place.
        </p>
      </section>

      {registrationStatus !== "APPROVED" ? (
        <section className="rounded-3xl border border-[#d9e5d5] bg-white p-6">
          <h2 className="text-lg font-bold text-[#163625]">Account review in progress</h2>
          <p className="mt-2 text-sm text-[#163625]/75">
            Your rider profile is currently <span className="font-semibold">{registrationStatus}</span>. You can access
            order dashboard features after admin approval.
          </p>
        </section>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[#d9e5d5] bg-white p-5">
              <p className="text-xs font-semibold text-[#163625]/65">Active deliveries</p>
              <p className="mt-2 text-3xl font-extrabold text-[#163625]">{activeCount}</p>
            </div>
            <div className="rounded-2xl border border-[#d9e5d5] bg-white p-5">
              <p className="text-xs font-semibold text-[#163625]/65">Completed trips</p>
              <p className="mt-2 text-3xl font-extrabold text-[#163625]">{completedCount}</p>
            </div>
            <div className="rounded-2xl border border-[#d9e5d5] bg-white p-5">
              <p className="text-xs font-semibold text-[#163625]/65">Completed earnings</p>
              <p className="mt-2 text-3xl font-extrabold text-[#163625]">BDT {completedEarnings.toFixed(2)}</p>
            </div>
          </section>

          <section className="rounded-3xl border border-[#d9e5d5] bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#163625]">Delivery Queue</h2>
                <p className="text-xs text-[#163625]/70">Switch between active and all assigned deliveries</p>
              </div>
              <Link href="/delivery/map" className="text-sm font-semibold text-[#163625] hover:underline">
                Open live map
              </Link>
            </div>
            <div className="mb-4 inline-flex rounded-xl border border-[#d9e5d5] bg-[#f8fbf6] p-1">
              <button
                type="button"
                onClick={() => setViewMode("ACTIVE")}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                  viewMode === "ACTIVE" ? "bg-white text-[#163625] shadow-sm" : "text-[#163625]/70 hover:text-[#163625]"
                }`}
              >
                Active deliveries ({activeDeliveries.length})
              </button>
              <button
                type="button"
                onClick={() => setViewMode("ASSIGNED")}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                  viewMode === "ASSIGNED"
                    ? "bg-white text-[#163625] shadow-sm"
                    : "text-[#163625]/70 hover:text-[#163625]"
                }`}
              >
                Assigned deliveries ({deliveries.length})
              </button>
            </div>

            {loading ? <p className="text-sm text-[#163625]/70">Loading deliveries...</p> : null}
            {error ? <p className="mb-3 text-sm text-red-700">{error}</p> : null}

            {!loading && !error && visibleDeliveries.length === 0 ? (
              <p className="text-sm text-[#163625]/70">
                {viewMode === "ACTIVE" ? "No active deliveries right now." : "No deliveries assigned yet."}
              </p>
            ) : null}

            {!loading && visibleDeliveries.length > 0 ? (
              <div className="space-y-3">
                {visibleDeliveries.map((d) => (
                  <Link
                    key={d.id}
                    href={`/delivery/order/${d.id}`}
                    className="block rounded-2xl border border-[#d9e5d5] bg-[#f8fbf6] p-4 transition hover:bg-[#eef4ea]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-[#163625]">{d.repairJob.repairRequest.title}</p>
                        <p className="mt-1 text-xs text-[#163625]/70">
                          {d.direction === "TO_SHOP" ? "Customer to shop" : "Shop to customer"}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-[#163625] border border-[#d9e5d5]">
                        {d.status}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-[#163625]/75">
                      <p>Fee: BDT {(d.fee ?? 0).toFixed(2)}</p>
                      <p className="font-semibold text-[#163625]">View details</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
