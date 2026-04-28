"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bike, ChevronRight, CircleAlert, CircleCheck, Clock3, Package } from "lucide-react";
import { useDeliveryAuth } from "@/lib/delivery-auth-context";
import { acceptDelivery, fetchDeliveryDeliveries, type DeliveryWithJob } from "@/lib/api";

export default function DeliveryDashboard() {
  const { me, token } = useDeliveryAuth();
  const [deliveries, setDeliveries] = useState<DeliveryWithJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingOrderId, setAcceptingOrderId] = useState("");
  const [error, setError] = useState("");

  const registrationStatus = me?.registrationStatus ?? "APPROVED";

  useEffect(() => {
    if (!token || registrationStatus !== "APPROVED") {
      setDeliveries([]);
      setError("");
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

  const firstName = me?.user?.name?.split(/\s+/)[0] ?? me?.user?.username ?? "Partner";
  const activeDeliveries = useMemo(
    () => deliveries.filter((d) => !["DELIVERED", "FAILED", "CANCELLED"].includes(d.status)),
    [deliveries],
  );
  const currentRiderId = me?.id ?? "";
  const myActiveDeliveries = useMemo(
    () => activeDeliveries.filter((d) => d.deliveryAgentId === currentRiderId),
    [activeDeliveries, currentRiderId],
  );
  const availableDeliveries = useMemo(() => activeDeliveries.filter((d) => !d.deliveryAgentId), [activeDeliveries]);
  const hasMyActiveDelivery = myActiveDeliveries.length > 0;

  async function handleAcceptOrder(deliveryId: string) {
    if (!token || registrationStatus !== "APPROVED") return;
    setAcceptingOrderId(deliveryId);
    setError("");
    try {
      const result = await acceptDelivery(token, deliveryId);
      setDeliveries((prev) => prev.map((d) => (d.id === deliveryId ? result.delivery : d)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept order");
    } finally {
      setAcceptingOrderId("");
    }
  }

  function getStatusTone(status: string) {
    if (status === "DELIVERED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (status === "FAILED" || status === "CANCELLED") return "border-red-200 bg-red-50 text-red-700";
    if (status === "PENDING") return "border-amber-200 bg-amber-50 text-amber-700";
    return "border-[#d9e5d5] bg-[#eef4ea] text-[#163625]";
  }

  return (
    <div className="flex h-full flex-col gap-6">
      {registrationStatus === "PENDING" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-900">
          Your delivery partner registration is pending approval. You can sign in, but jobs stay locked until an
          operations admin approves your account.
        </div>
      ) : null}
      {registrationStatus === "REJECTED" ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-900">
          Your registration was not approved. Contact support if you believe this is a mistake.
        </div>
      ) : null}
      {registrationStatus !== "APPROVED" ? (
        <div className="rounded-2xl border border-[#d9e5d5] bg-white px-6 py-8 shadow-sm">
          <h2 className="text-lg font-bold text-[#163625]">Orders are locked</h2>
          <p className="mt-2 text-sm text-[#163625]/75">
            You cannot view customer orders until your delivery partner account is approved by admin.
          </p>
        </div>
      ) : null}

      {registrationStatus !== "APPROVED" ? null : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-3xl border border-[#d9e5d5] bg-white p-6 shadow-sm lg:col-span-2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#163625] text-xl font-bold text-[#E4FCD5]">
                    {firstName.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <h1 className="text-2xl font-extrabold text-[#163625]">Welcome back, {firstName}</h1>
                    <p className="mt-1 text-sm font-medium text-[#163625]/70">Manage pickups and returns without map.</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-2 rounded-xl border border-[#d9e5d5] bg-[#eef4ea] px-3 py-2 text-xs font-bold text-[#163625]">
                  <Bike size={14} />
                  {me?.status ?? "AVAILABLE"}
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-[#d9e5d5] bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-[#163625]/60">Overview</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-[#f6faf3] p-3">
                  <span className="text-sm font-semibold text-[#163625]/80">My active</span>
                  <span className="text-sm font-extrabold text-[#163625]">{myActiveDeliveries.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-[#f6faf3] p-3">
                  <span className="text-sm font-semibold text-[#163625]/80">Available</span>
                  <span className="text-sm font-extrabold text-[#163625]">{availableDeliveries.length}</span>
                </div>
              </div>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
          ) : null}

          <section className="rounded-3xl border border-[#d9e5d5] bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-extrabold text-[#163625]">My Active Orders</h3>
              <span className="rounded-lg border border-[#d9e5d5] bg-[#f6faf3] px-3 py-1 text-xs font-bold text-[#163625]">
                {myActiveDeliveries.length} orders
              </span>
            </div>

            {loading ? <p className="text-sm text-[#163625]/70">Loading deliveries...</p> : null}
            {!loading && myActiveDeliveries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d9e5d5] bg-[#fafdf8] p-6 text-sm text-[#163625]/70">
                No accepted active orders yet.
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {myActiveDeliveries.map((d) => (
                <Link
                  key={d.id}
                  href={`/delivery/order/${d.id}`}
                  className="group rounded-2xl border border-[#d9e5d5] bg-white p-5 transition hover:border-[#bdd0b3] hover:shadow-sm"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <span className="rounded-lg bg-[#eef4ea] px-2.5 py-1 text-xs font-bold text-[#163625]">
                      {d.direction === "TO_SHOP" ? "Customer to shop" : "Shop to customer"}
                    </span>
                    <span className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold ${getStatusTone(d.status)}`}>{d.status}</span>
                  </div>
                  <p className="line-clamp-1 text-sm font-bold text-[#163625]">{d.repairJob.repairRequest.title}</p>
                  <p className="mt-2 text-xs text-[#163625]/65">{d.pickupAddress}</p>
                  <p className="text-xs text-[#163625]/65">to {d.dropAddress}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-[#eef3ea] pt-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#163625]">
                      <Package size={16} />
                      {d.repairJob.repairRequest.deviceType}
                    </div>
                    <div className="flex items-center gap-1 text-sm font-bold text-[#163625]">
                      {d.fee ? `BDT ${d.fee}` : "Fee pending"}
                      <ChevronRight size={16} className="transition group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-[#d9e5d5] bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-extrabold text-[#163625]">Available Customer Orders</h3>
              <span className="rounded-lg border border-[#d9e5d5] bg-[#f6faf3] px-3 py-1 text-xs font-bold text-[#163625]">
                {availableDeliveries.length} waiting
              </span>
            </div>

            {hasMyActiveDelivery ? (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                You already have an active delivery. Complete it first to see and accept other orders.
              </div>
            ) : null}

            {!loading && availableDeliveries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d9e5d5] bg-[#fafdf8] p-6 text-sm text-[#163625]/70">
                No unassigned customer orders right now.
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {(hasMyActiveDelivery ? [] : availableDeliveries).map((d) => (
                <div key={d.id} className="rounded-2xl border border-[#d9e5d5] bg-white p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <span className="rounded-lg bg-[#eef4ea] px-2.5 py-1 text-xs font-bold text-[#163625]">
                      {d.direction === "TO_SHOP" ? "Customer pickup to shop" : "Shop pickup to customer"}
                    </span>
                    <span className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold ${getStatusTone(d.status)}`}>{d.status}</span>
                  </div>
                  <p className="line-clamp-1 text-sm font-bold text-[#163625]">{d.repairJob.repairRequest.title}</p>
                  <p className="mt-2 text-xs text-[#163625]/65">{d.pickupAddress}</p>
                  <p className="text-xs text-[#163625]/65">to {d.dropAddress}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-[#eef3ea] pt-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#163625]">
                      <Package size={16} />
                      {d.repairJob.repairRequest.deviceType}
                    </div>
                    <span className="text-sm font-bold text-[#163625]">{d.fee ? `BDT ${d.fee}` : "Fee pending"}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAcceptOrder(d.id)}
                      disabled={acceptingOrderId === d.id}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#163625] px-4 py-2.5 text-sm font-bold text-[#E4FCD5] disabled:opacity-60"
                    >
                      {acceptingOrderId === d.id ? <Clock3 size={16} /> : <CircleCheck size={16} />}
                      {acceptingOrderId === d.id ? "Accepting..." : "Accept order"}
                    </button>
                    <Link
                      href={`/delivery/order/${d.id}`}
                      className="inline-flex items-center gap-1 rounded-xl border border-[#d9e5d5] px-4 py-2.5 text-sm font-bold text-[#163625]"
                    >
                      <CircleAlert size={16} />
                      View details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
