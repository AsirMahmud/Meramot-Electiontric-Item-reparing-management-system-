"use client";

import { useEffect, useMemo, useState } from "react";
import { DollarSign } from "lucide-react";
import { fetchDeliveryDeliveries, type DeliveryWithJob } from "@/lib/api";
import { useDeliveryAuth } from "@/lib/delivery-auth-context";

export default function EarningsPage() {
  const { token } = useDeliveryAuth();
  const [deliveries, setDeliveries] = useState<DeliveryWithJob[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    fetchDeliveryDeliveries(token)
      .then((data) => setDeliveries(data.deliveries))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load earnings"));
  }, [token]);

  const totalCompleted = useMemo(
    () => deliveries.filter((d) => d.status === "DELIVERED").reduce((sum, d) => sum + (d.fee ?? 0), 0),
    [deliveries],
  );
  const totalTrips = useMemo(() => deliveries.filter((d) => d.status === "DELIVERED").length, [deliveries]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-transparent px-5 pt-8 max-w-5xl mx-auto w-full">
      <h1 className="text-2xl font-extrabold text-[#163625] mb-6">Earnings & Stats</h1>

      <div className="bg-gradient-to-br from-[#163625] to-[#0d2217] text-[#E4FCD5] rounded-[1.5rem] p-6 shadow-xl mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full"></div>
        <p className="text-[#a4e082] text-sm font-medium mb-2">Completed delivery earnings</p>
        <h2 className="text-5xl font-extrabold mb-2 tracking-tight">BDT {totalCompleted.toFixed(2)}</h2>
        <p className="text-sm text-[#E4FCD5]/75">Based on real delivered jobs from backend</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-4 rounded-[1.25rem] border border-[#d9e5d5] shadow-sm">
          <p className="text-xs text-neutral-500 font-medium">Completed trips</p>
          <h3 className="text-lg font-bold text-[#163625]">{totalTrips}</h3>
        </div>
        <div className="bg-white p-4 rounded-[1.25rem] border border-[#d9e5d5] shadow-sm">
          <p className="text-xs text-neutral-500 font-medium">Total assigned</p>
          <h3 className="text-lg font-bold text-[#163625]">{deliveries.length}</h3>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-[#163625]">Recent Deliveries</h3>
      </div>
      {error ? <p className="mb-3 text-sm text-red-700">{error}</p> : null}

      <div className="space-y-3 pb-8">
        {deliveries.map((d) => (
          <div key={d.id} className="bg-white p-4 rounded-xl border border-[#d9e5d5] flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#eef4ea] flex items-center justify-center text-green-600 border border-[#d9e5d5]">
                <DollarSign size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#163625]">{d.repairJob.repairRequest.title}</h4>
                <p className="text-xs text-neutral-500">{d.direction}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-green-600">BDT {(d.fee ?? 0).toFixed(2)}</p>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#eef4ea] text-green-700">
                {d.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
