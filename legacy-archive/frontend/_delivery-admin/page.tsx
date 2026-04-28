"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  approveDeliveryPartnerAdmin,
  fetchDeliveryAdminPartners,
  fetchDeliveryAdminStats,
  rejectDeliveryPartnerAdmin,
  type DeliveryAdminPartnerRow,
  type DeliveryAdminStats,
} from "@/lib/api";
import { useDeliveryAdminAuth } from "@/lib/delivery-admin-auth-context";

export default function DeliveryAdminDashboard() {
  const { token, user, logout } = useDeliveryAdminAuth();
  const [stats, setStats] = useState<DeliveryAdminStats | null>(null);
  const [pending, setPending] = useState<DeliveryAdminPartnerRow[]>([]);
  const [allPartners, setAllPartners] = useState<DeliveryAdminPartnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [s, p, a] = await Promise.all([
        fetchDeliveryAdminStats(token),
        fetchDeliveryAdminPartners(token, "PENDING"),
        fetchDeliveryAdminPartners(token),
      ]);
      setStats(s.stats);
      setPending(p.partners);
      setAllPartners(a.partners);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function approve(id: string) {
    if (!token) return;
    setActionId(id);
    try {
      await approveDeliveryPartnerAdmin(token, id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setActionId(null);
    }
  }

  async function reject(id: string) {
    if (!token) return;
    setActionId(id);
    try {
      await rejectDeliveryPartnerAdmin(token, id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500">Operations</p>
            <h1 className="text-xl font-bold text-white">Delivery partner management</h1>
            <p className="text-sm text-slate-400">
              Signed in as {user?.name ?? user?.username}{" "}
              <span className="text-slate-500">({user?.email})</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => load()}
              className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => {
                logout();
                window.location.href = "/delivery-admin/login";
              }}
              className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        {error ? (
          <div className="mb-6 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {loading && !stats ? (
          <p className="text-slate-400">Loading dashboard…</p>
        ) : stats ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
            <StatCard label="Pending approvals" value={stats.pendingRegistrations} accent="amber" />
            <StatCard label="Active approved partners" value={stats.activeApprovedPartners} accent="emerald" />
            <StatCard label="Completed deliveries (all time)" value={stats.completedDeliveriesTotal} accent="sky" />
            <StatCard label="Partners with ≥1 completed job" value={stats.partnersWithCompletedDeliveries} accent="violet" />
            <StatCard label="Total partner profiles" value={stats.totalPartners} accent="slate" />
            <StatCard label="Rejected registrations" value={stats.rejectedPartners} accent="rose" />
          </div>
        ) : null}

        <section className="mb-12">
          <h2 className="mb-4 text-lg font-bold text-white">Pending registration approvals</h2>
          {pending.length === 0 ? (
            <p className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
              No pending partner applications.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-slate-900 text-xs font-semibold uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Partner</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Vehicle</th>
                    <th className="px-4 py-3">NID</th>
                    <th className="px-4 py-3">Education</th>
                    <th className="px-4 py-3">CV</th>
                    <th className="px-4 py-3">Applied</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                  {pending.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-800/50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-white">{row.user.name ?? row.user.username}</p>
                        <p className="text-xs text-slate-500">{row.user.id}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {row.user.email}
                        <br />
                        <span className="text-slate-500">{row.user.phone ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{row.vehicleType ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {row.nidDocumentUrl ? (
                          <a
                            href={row.nidDocumentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-400 hover:underline"
                          >
                            Open NID
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {row.educationDocumentUrl ? (
                          <a
                            href={row.educationDocumentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-400 hover:underline"
                          >
                            Open Education Doc
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {row.cvDocumentUrl ? (
                          <a
                            href={row.cvDocumentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-400 hover:underline"
                          >
                            Open CV
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {new Date(row.user.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={actionId === row.id}
                            onClick={() => approve(row.id)}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={actionId === row.id}
                            onClick={() => reject(row.id)}
                            className="rounded-lg border border-rose-500/50 bg-rose-950/50 px-3 py-1.5 text-xs font-bold text-rose-200 hover:bg-rose-900/50 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-lg font-bold text-white">All delivery partners</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-slate-900 text-xs font-semibold uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Partner</th>
                  <th className="px-4 py-3">Registration</th>
                  <th className="px-4 py-3">Agent status</th>
                  <th className="px-4 py-3">NID</th>
                  <th className="px-4 py-3">CV</th>
                  <th className="px-4 py-3">Completed jobs</th>
                  <th className="px-4 py-3">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                {allPartners.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{row.user.name ?? row.user.username}</p>
                      <p className="text-xs text-slate-500">{row.user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${
                          row.registrationStatus === "APPROVED"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : row.registrationStatus === "PENDING"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-rose-500/20 text-rose-400"
                        }`}
                      >
                        {row.registrationStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{row.agentStatus}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {row.nidDocumentUrl ? (
                        <a
                          href={row.nidDocumentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 hover:underline"
                        >
                          Open NID
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {row.cvDocumentUrl ? (
                        <a
                          href={row.cvDocumentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 hover:underline"
                        >
                          Open CV
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-200">{row.completedDeliveries}</td>
                    <td className="px-4 py-3">{row.isActive ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-10 text-center text-sm text-slate-500">
          <Link href="/delivery/login" className="text-emerald-500 hover:underline">
            Delivery partner portal →
          </Link>
        </p>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "emerald" | "amber" | "sky" | "violet" | "slate" | "rose";
}) {
  const ring: Record<typeof accent, string> = {
    emerald: "border-emerald-500/30",
    amber: "border-amber-500/30",
    sky: "border-sky-500/30",
    violet: "border-violet-500/30",
    slate: "border-slate-600",
    rose: "border-rose-500/30",
  };
  return (
    <div className={`rounded-2xl border bg-slate-900 p-5 ${ring[accent]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}
