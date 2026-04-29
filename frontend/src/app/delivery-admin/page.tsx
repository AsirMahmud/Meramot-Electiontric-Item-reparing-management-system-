"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  assignDeliveryAdminOrder,
  approveDeliveryAdminPayoutRequest,
  approveDeliveryPartnerAdmin,
  fetchDeliveryAdminChatMessages,
  fetchDeliveryAdminOrderTimeline,
  fetchDeliveryAdminOrders,
  fetchDeliveryAdminPayoutRequests,
  fetchDeliveryAdminPartners,
  fetchDeliveryAdminStats,
  rejectDeliveryPartnerAdmin,
  sendDeliveryAdminChatMessage,
  type DeliveryAdminOrder,
  type DeliveryAdminPayoutRequest,
  type DeliveryAdminPartnerRow,
  type DeliveryAdminStats,
  type DeliveryChatMessage,
} from "@/lib/api";
import { useDeliveryAdminAuth } from "@/lib/delivery-admin-auth-context";

type LeafletModule = typeof import("leaflet");

export default function DeliveryAdminDashboard() {
  const { token, user, logout } = useDeliveryAdminAuth();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const leafletModuleRef = useRef<LeafletModule | null>(null);
  const markersRef = useRef<import("leaflet").Layer[]>([]);
  const hasFittedMarkersRef = useRef(false);
  const [stats, setStats] = useState<DeliveryAdminStats | null>(null);
  const [pending, setPending] = useState<DeliveryAdminPartnerRow[]>([]);
  const [allPartners, setAllPartners] = useState<DeliveryAdminPartnerRow[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<DeliveryAdminPayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [focusedPartnerId, setFocusedPartnerId] = useState<string | null>(null);
  const [orders, setOrders] = useState<DeliveryAdminOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [timeline, setTimeline] = useState<Array<{ code: string; title: string; at: string | null }>>([]);
  const [chatMessages, setChatMessages] = useState<DeliveryChatMessage[]>([]);
  const [chatText, setChatText] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const pusherCleanupRef = useRef<null | (() => void)>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [s, p, a, payoutData, ordersData] = await Promise.all([
        fetchDeliveryAdminStats(token),
        fetchDeliveryAdminPartners(token, "PENDING"),
        fetchDeliveryAdminPartners(token),
        fetchDeliveryAdminPayoutRequests(token, "PENDING"),
        fetchDeliveryAdminOrders(token),
      ]);
      setStats(s.stats);
      setPending(p.partners);
      setAllPartners(a.partners);
      setPayoutRequests(payoutData.payouts ?? []);
      setOrders(ordersData.deliveries ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!selectedOrderId && orders.length > 0) {
      setSelectedOrderId(orders[0].id);
    }
  }, [orders, selectedOrderId]);

  useEffect(() => {
    if (!token || !selectedOrderId) return;
    Promise.all([
      fetchDeliveryAdminOrderTimeline(token, selectedOrderId),
      fetchDeliveryAdminChatMessages(token, selectedOrderId),
    ])
      .then(([timelineData, chatData]) => {
        setTimeline(timelineData.timeline ?? []);
        setChatMessages(chatData.messages ?? []);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load timeline/chat");
      });
  }, [token, selectedOrderId]);

  useEffect(() => {
    if (!token || !selectedOrderId || !isChatOpen) return;

    const interval = setInterval(() => {
      fetchDeliveryAdminChatMessages(token, selectedOrderId)
        .then((data) => {
          const latest = data.messages ?? [];
          setChatMessages((prev) => {
            if (prev.length === latest.length) return prev;
            return latest;
          });
        })
        .catch(() => {
          // keep existing messages if refresh fails temporarily
        });
    }, 2000);

    return () => clearInterval(interval);
  }, [token, selectedOrderId, isChatOpen]);

  useEffect(() => {
    if (!token || !selectedOrderId) return;

    let disposed = false;

    (async () => {
      try {
        const [{ pusher }, { default: Pusher }] = await Promise.all([
          fetchDeliveryAdminChatMessages(token, selectedOrderId),
          import("pusher-js"),
        ]);
        if (disposed || !pusher?.enabled || !pusher.key || !pusher.cluster) return;

        const client = new Pusher(pusher.key, {
          cluster: pusher.cluster,
          forceTLS: true,
        });
        const channel = client.subscribe(`private-delivery-chat-${selectedOrderId}`);
        channel.bind("message:new", (payload: DeliveryChatMessage) => {
          setChatMessages((prev) => (prev.some((m) => m.id === payload.id) ? prev : [...prev, payload]));
        });
        pusherCleanupRef.current = () => {
          channel.unbind_all();
          client.unsubscribe(`private-delivery-chat-${selectedOrderId}`);
          client.disconnect();
        };
      } catch {
        // fall back to manual refresh only
      }
    })();

    return () => {
      disposed = true;
      if (pusherCleanupRef.current) {
        pusherCleanupRef.current();
        pusherCleanupRef.current = null;
      }
    };
  }, [token, selectedOrderId]);

  useEffect(() => {
    load();
  }, [load]);

  const mappablePartners = useMemo(
    () =>
      allPartners.filter(
        (partner) => typeof partner.currentLat === "number" && typeof partner.currentLng === "number",
      ),
    [allPartners],
  );
  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    let isDisposed = false;

    async function setupMap() {
      const leafletModule = await import("leaflet");
      if (isDisposed || !mapContainerRef.current) return;

      const L = leafletModule.default;
      leafletModuleRef.current = leafletModule;

      const map = L.map(mapContainerRef.current, {
        center: [23.8103, 90.4125],
        zoom: 11,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      mapRef.current = map;
    }

    setupMap().catch((mapError) => {
      console.error("Leaflet map init failed:", mapError);
    });

    return () => {
      isDisposed = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      leafletModuleRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !leafletModuleRef.current) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (mappablePartners.length === 0) return;

    const map = mapRef.current;
    const L = leafletModuleRef.current.default;
    const bounds = L.latLngBounds([]);

    mappablePartners.forEach((partner) => {
      const lng = partner.currentLng as number;
      const lat = partner.currentLat as number;

      const markerColor = partner.isActive ? "#10b981" : "#f97316";
      const markerIcon = L.divIcon({
        className: "",
        html: `<div style="position:relative;width:22px;height:30px;">
          <div style="position:absolute;top:0;left:50%;width:22px;height:22px;background:${markerColor};border:2px solid #ffffff;border-radius:999px;transform:translateX(-50%);box-shadow:0 2px 6px rgba(2,6,23,.35);"></div>
          <div style="position:absolute;bottom:0;left:50%;width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:10px solid ${markerColor};transform:translateX(-50%);"></div>
        </div>`,
        iconSize: [22, 30],
        iconAnchor: [11, 30],
        popupAnchor: [0, -28],
      });
      const marker = L.marker([lat, lng], {
        icon: markerIcon,
      })
        .bindPopup(
          `<div style="font-family:system-ui,sans-serif; color:#0f172a;">
            <strong>${partner.user.name ?? partner.user.username}</strong><br/>
            <span>${partner.user.email}</span><br/>
            <span>Status: ${partner.agentStatus}</span><br/>
            <span>Completed: ${partner.completedDeliveries}</span>
          </div>`,
        )
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([lat, lng]);
    });

    if (!hasFittedMarkersRef.current && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 14 });
      hasFittedMarkersRef.current = true;
    }
  }, [mappablePartners]);

  useEffect(() => {
    if (!focusedPartnerId || !mapRef.current) return;
    const partner = mappablePartners.find((row) => row.id === focusedPartnerId);
    if (!partner || typeof partner.currentLat !== "number" || typeof partner.currentLng !== "number") return;

    mapRef.current.flyTo([partner.currentLat, partner.currentLng], 14, { duration: 1 });
  }, [focusedPartnerId, mappablePartners]);

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

  async function approvePayout(id: string) {
    if (!token) return;
    setActionId(id);
    try {
      await approveDeliveryAdminPayoutRequest(token, id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payout approval failed");
    } finally {
      setActionId(null);
    }
  }

  async function assignOrder(deliveryId: string, deliveryUserId: string) {
    if (!token || !deliveryUserId) return;
    setActionId(deliveryId);
    try {
      await assignDeliveryAdminOrder(token, deliveryId, deliveryUserId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Order assignment failed");
    } finally {
      setActionId(null);
    }
  }

  async function sendChat() {
    if (!token || !selectedOrderId || !chatText.trim() || !selectedOrder?.deliveryAgent?.user?.id) return;
    setSendingChat(true);
    try {
      const response = await sendDeliveryAdminChatMessage(token, selectedOrderId, chatText);
      setChatMessages((prev) => [...prev, response.message]);
      setChatText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send chat");
    } finally {
      setSendingChat(false);
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
          <h2 className="mb-4 text-lg font-bold text-white">Live delivery partner map</h2>
          <div className="mb-12 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-2">
              <div ref={mapContainerRef} className="h-[420px] w-full rounded-lg" />
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-sm font-semibold text-white">Agents with live coordinates</p>
              <p className="mt-1 text-xs text-slate-400">
                {mappablePartners.length} of {allPartners.length} partners currently visible on map.
              </p>
              <p className="mt-1 text-[11px] text-slate-500">OpenStreetMap + Leaflet</p>
              <div className="mt-4 max-h-[360px] space-y-2 overflow-y-auto pr-1">
                {mappablePartners.length === 0 ? (
                  <p className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-500">
                    No delivery agent has updated location yet.
                  </p>
                ) : (
                  mappablePartners.map((partner) => (
                    <button
                      key={partner.id}
                      type="button"
                      onClick={() => setFocusedPartnerId(partner.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                        focusedPartnerId === partner.id
                          ? "border-emerald-500/50 bg-emerald-500/10"
                          : "border-slate-700 bg-slate-900 hover:border-slate-600"
                      }`}
                    >
                      <p className="text-sm font-semibold text-white">{partner.user.name ?? partner.user.username}</p>
                      <p className="text-xs text-slate-400">{partner.user.phone ?? partner.user.email}</p>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                        <span>{partner.isActive ? "Active" : "Inactive"}</span>
                        <span>{partner.currentLat?.toFixed(4)}, {partner.currentLng?.toFixed(4)}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <h2 className="mb-4 text-lg font-bold text-white">Pending delivery payout requests</h2>
          {payoutRequests.length === 0 ? (
            <p className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
              No pending payout requests.
            </p>
          ) : (
            <div className="mb-12 overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-900 text-xs font-semibold uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Delivery agent</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Requested at</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                  {payoutRequests.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-800/50">
                      <td className="px-4 py-3 text-slate-100">
                        {row.riderProfile?.user?.name ?? row.riderProfile?.user?.username ?? "Delivery agent"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{row.riderProfile?.user?.email ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-100">BDT {row.amount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-400">{new Date(row.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={actionId === row.id}
                          onClick={() => approvePayout(row.id)}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          Approve payout
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

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

          <h2 className="mb-4 mt-12 text-lg font-bold text-white">Delivery orders and assignment</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-900 text-xs font-semibold uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Direction</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Assigned rider</th>
                  <th className="px-4 py-3">Assign</th>
                    <th className="px-4 py-3">Chat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{order.repairJob.repairRequest.title}</p>
                      <p className="text-xs text-slate-500">{order.id.slice(0, 10)}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{order.direction}</td>
                    <td className="px-4 py-3 text-slate-300">{order.status}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {order.deliveryAgent?.user?.name ?? order.deliveryAgent?.user?.username ?? "Unassigned"}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                        defaultValue=""
                        onChange={(e) => assignOrder(order.id, e.target.value)}
                        disabled={actionId === order.id}
                      >
                        <option value="">Select rider</option>
                        {allPartners
                          .filter((partner) => partner.isActive)
                          .map((partner) => (
                            <option key={partner.user.id} value={partner.user.id}>
                              {partner.user.name ?? partner.user.username}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOrderId(order.id);
                          setIsChatOpen(true);
                        }}
                        className="rounded-lg border border-emerald-600/40 px-3 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-900/20"
                      >
                        Open chat
                      </button>
                    </td>
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

      {isChatOpen ? (
        <>
          <button
            type="button"
            aria-label="Close chat drawer"
            className="fixed inset-0 z-20 bg-black/50"
            onClick={() => setIsChatOpen(false)}
          />
          <aside className="fixed right-0 top-0 z-30 flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-white">Delivery chat</p>
                <p className="text-xs text-slate-400">
                  {selectedOrder
                    ? `${selectedOrder.repairJob.repairRequest.title} • ${selectedOrder.status}`
                    : "Select an order"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-900"
              >
                Close
              </button>
            </div>

            <div className="border-b border-slate-800 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Timeline</p>
              <div className="mt-2 max-h-40 space-y-2 overflow-y-auto pr-1">
                {timeline.length === 0 ? (
                  <p className="text-xs text-slate-500">No timeline yet.</p>
                ) : (
                  timeline.map((item, index) => (
                    <div key={`${item.code}-${index}`} className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
                      <p className="text-xs font-semibold text-slate-200">{item.title}</p>
                      <p className="text-[11px] text-slate-500">{item.at ? new Date(item.at).toLocaleString() : "Pending"}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
              {chatMessages.length === 0 ? (
                <p className="text-xs text-slate-500">No messages yet.</p>
              ) : (
                chatMessages.map((msg) => {
                  const isMine = msg.senderRole === "DELIVERY_ADMIN" || msg.senderRole === "ADMIN";
                  return (
                    <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                          isMine ? "bg-emerald-600 text-white" : "border border-slate-700 bg-slate-900 text-slate-100"
                        }`}
                      >
                        <p>{msg.message}</p>
                        <p className={`mt-1 text-[10px] ${isMine ? "text-emerald-100" : "text-slate-500"}`}>
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-slate-800 p-3">
              {!selectedOrder?.deliveryAgent?.user?.id ? (
                <p className="mb-2 text-xs text-amber-400">Assign a rider first to enable chat.</p>
              ) : null}
              <div className="flex gap-2">
                <input
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => sendChat()}
                  disabled={sendingChat || !selectedOrder?.deliveryAgent?.user?.id || !chatText.trim()}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          </aside>
        </>
      ) : null}
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
