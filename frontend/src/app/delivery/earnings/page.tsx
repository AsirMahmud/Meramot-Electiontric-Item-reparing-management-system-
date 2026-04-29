"use client";

import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { DollarSign } from "lucide-react";
import {
  fetchDeliveryDeliveries,
  fetchDeliveryPayoutSummary,
  requestDeliveryPayout,
  type DeliveryPayoutItem,
  type DeliveryWithJob,
} from "@/lib/api";
import { useDeliveryAuth } from "@/lib/delivery-auth-context";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CHART_COLORS = ["#163625", "#2f6f4f", "#4e9470", "#7fb79a", "#a7d2b6"];
const ACTIVE_DELIVERY_STATUSES = ["PENDING", "SCHEDULED", "DISPATCHED", "PICKED_UP", "IN_TRANSIT"];

export default function EarningsPage() {
  const { token } = useDeliveryAuth();
  const [deliveries, setDeliveries] = useState<DeliveryWithJob[]>([]);
  const [payouts, setPayouts] = useState<DeliveryPayoutItem[]>([]);
  const [wallet, setWallet] = useState({
    deliveredTrips: 0,
    earned: 0,
    requestedOrPaid: 0,
    available: 0,
    minRequestAmount: 500,
    canRequest: false,
  });
  const [requestAmount, setRequestAmount] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function loadData(currentToken: string) {
    const [deliveryData, payoutData] = await Promise.all([
      fetchDeliveryDeliveries(currentToken),
      fetchDeliveryPayoutSummary(currentToken),
    ]);
    setDeliveries(deliveryData.deliveries);
    setWallet(payoutData.summary);
    setPayouts(payoutData.payouts);
  }

  useEffect(() => {
    if (!token) return;
    setError("");
    loadData(token)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load earnings"));
  }, [token]);

  const totalCompleted = useMemo(
    () => deliveries.filter((d) => d.status === "DELIVERED").reduce((sum, d) => sum + (d.fee ?? 0), 0),
    [deliveries],
  );
  const totalTrips = useMemo(() => deliveries.filter((d) => d.status === "DELIVERED").length, [deliveries]);
  const activeTrips = useMemo(
    () => deliveries.filter((d) => ACTIVE_DELIVERY_STATUSES.includes(d.status)).length,
    [deliveries],
  );

  const monthlyEarnings = useMemo(() => {
    const map = new Map<string, number>();
    deliveries
      .filter((d) => d.status === "DELIVERED")
      .forEach((d) => {
        const key = new Date().toISOString().slice(0, 7);
        map.set(key, (map.get(key) ?? 0) + (d.fee ?? 0));
      });
    return Array.from(map.entries()).map(([month, amount]) => ({ month, amount: Number(amount.toFixed(2)) }));
  }, [deliveries]);

  const statusDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    deliveries.forEach((d) => counts.set(d.status, (counts.get(d.status) ?? 0) + 1));
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, [deliveries]);

  const directionStats = useMemo(() => {
    const rows = [
      { name: "To Shop", trips: 0, amount: 0 },
      { name: "To Customer", trips: 0, amount: 0 },
    ];
    deliveries.forEach((d) => {
      const idx = d.direction === "TO_SHOP" ? 0 : 1;
      rows[idx].trips += 1;
      rows[idx].amount += d.fee ?? 0;
    });
    return rows.map((r) => ({ ...r, amount: Number(r.amount.toFixed(2)) }));
  }, [deliveries]);

  const feeBuckets = useMemo(() => {
    const buckets = [
      { range: "<100", count: 0 },
      { range: "100-199", count: 0 },
      { range: "200-299", count: 0 },
      { range: "300+", count: 0 },
    ];
    deliveries.forEach((d) => {
      const fee = d.fee ?? 0;
      if (fee < 100) buckets[0].count += 1;
      else if (fee < 200) buckets[1].count += 1;
      else if (fee < 300) buckets[2].count += 1;
      else buckets[3].count += 1;
    });
    return buckets;
  }, [deliveries]);

  const completionTrend = useMemo(() => {
    const last7 = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return {
        day: date.toLocaleDateString("en-US", { weekday: "short" }),
        completed: 0,
      };
    });
    const completedCount = deliveries.filter((d) => d.status === "DELIVERED").length;
    if (completedCount > 0) {
      last7[last7.length - 1].completed = completedCount;
    }
    return last7;
  }, [deliveries]);

  async function handlePayoutRequest(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setError("");
    setSuccess("");
    setRequestLoading(true);
    try {
      const amountNum = requestAmount.trim() ? Number(requestAmount) : undefined;
      await requestDeliveryPayout(token, {
        amount: Number.isFinite(amountNum as number) ? amountNum : undefined,
        notes: requestNote.trim() || undefined,
      });
      setSuccess("Payout request sent to admin successfully.");
      setRequestAmount("");
      setRequestNote("");
      await loadData(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request payout");
    } finally {
      setRequestLoading(false);
    }
  }

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
          <p className="text-xs text-neutral-500 font-medium">Active trips</p>
          <h3 className="text-lg font-bold text-[#163625]">{activeTrips}</h3>
        </div>
      </div>

      <section className="mb-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-[1.25rem] border border-[#d9e5d5] bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#163625]/60">Wallet available</p>
          <p className="mt-1 text-2xl font-extrabold text-[#163625]">BDT {wallet.available.toFixed(2)}</p>
          <p className="mt-2 text-xs text-[#163625]/70">
            Minimum payout request is BDT {wallet.minRequestAmount}. Request allowed only after 500+ taka earnings.
          </p>
        </div>
        <div className="rounded-[1.25rem] border border-[#d9e5d5] bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#163625]/60">Requested or paid</p>
          <p className="mt-1 text-2xl font-extrabold text-[#163625]">BDT {wallet.requestedOrPaid.toFixed(2)}</p>
          <p className="mt-2 text-xs text-[#163625]/70">Admin can directly approve payout requests.</p>
        </div>
      </section>

      <form onSubmit={handlePayoutRequest} className="mb-8 rounded-[1.25rem] border border-[#d9e5d5] bg-white p-5">
        <h3 className="text-lg font-bold text-[#163625]">Request payout</h3>
        <p className="mt-1 text-sm text-[#163625]/70">
          Enter amount (or leave empty for full available balance) and send to admin for approval.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            value={requestAmount}
            onChange={(event) => setRequestAmount(event.target.value)}
            inputMode="decimal"
            placeholder="Amount (BDT)"
            className="rounded-xl border border-[#d9e5d5] bg-[#f8fbf6] px-3 py-2 text-sm outline-none focus:border-[#163625]"
          />
          <input
            value={requestNote}
            onChange={(event) => setRequestNote(event.target.value)}
            placeholder="Note (optional)"
            className="rounded-xl border border-[#d9e5d5] bg-[#f8fbf6] px-3 py-2 text-sm outline-none focus:border-[#163625]"
          />
        </div>
        <button
          type="submit"
          disabled={requestLoading || !wallet.canRequest}
          className="mt-4 rounded-full bg-[#163625] px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {requestLoading ? "Sending request..." : "Send payout request"}
        </button>
        {!wallet.canRequest ? (
          <p className="mt-2 text-xs text-red-700">You need at least BDT 500 available earnings to request payout.</p>
        ) : null}
        {success ? <p className="mt-2 text-xs text-green-700">{success}</p> : null}
      </form>

      <section className="mb-8 grid gap-4 md:grid-cols-2">
        <ChartCard title="Monthly Earnings">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyEarnings}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5eee1" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="amount" fill="#163625" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Delivery Status Distribution">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusDistribution} dataKey="value" nameKey="name" outerRadius={85}>
                {statusDistribution.map((entry, index) => (
                  <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Weekly Completion Trend">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={completionTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5eee1" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line dataKey="completed" stroke="#2f6f4f" strokeWidth={3} dot />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Direction Earnings">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={directionStats}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5eee1" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="amount" fill="#4e9470" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Fee Range Breakdown">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={feeBuckets}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5eee1" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#7fb79a" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-[#163625]">Recent Deliveries & Payouts</h3>
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
        {payouts.slice(0, 3).map((payout) => (
          <div key={payout.id} className="bg-white p-4 rounded-xl border border-[#d9e5d5] flex justify-between items-center">
            <div>
              <h4 className="text-sm font-bold text-[#163625]">Payout request</h4>
              <p className="text-xs text-neutral-500">{new Date(payout.createdAt).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-[#163625]">BDT {payout.amount.toFixed(2)}</p>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#eef4ea] text-green-700">
                {payout.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[1.25rem] border border-[#d9e5d5] bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-bold text-[#163625]">{title}</h3>
      {children}
    </div>
  );
}
