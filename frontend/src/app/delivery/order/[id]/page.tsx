"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, MessageCircle, Package } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import {
  acceptDelivery,
  fetchDeliveryChatMessages,
  fetchDeliveryDeliveries,
  sendDeliveryChatMessage,
  type DeliveryStatusValue,
  type DeliveryChatMessage,
  type DeliveryWithJob,
  updateDeliveryStatus,
} from "@/lib/api";
import { useDeliveryAuth } from "@/lib/delivery-auth-context";

const NEXT_STATUS: Record<string, DeliveryStatusValue | null> = {
  PENDING: "SCHEDULED",
  SCHEDULED: "DISPATCHED",
  DISPATCHED: "PICKED_UP",
  PICKED_UP: "IN_TRANSIT",
  IN_TRANSIT: "DELIVERED",
  DELIVERED: null,
  FAILED: null,
  CANCELLED: null,
};

const FLOW_BY_DIRECTION: Record<
  string,
  {
    code: DeliveryStatusValue;
    title: string;
  }[]
> = {
  TO_SHOP: [
    { code: "PENDING", title: "Waiting for rider acceptance" },
    { code: "SCHEDULED", title: "Accepted by rider" },
    { code: "DISPATCHED", title: "Rider is going to customer" },
    { code: "PICKED_UP", title: "Picked up from customer" },
    { code: "IN_TRANSIT", title: "On the way to shop" },
    { code: "DELIVERED", title: "Delivered to shop" },
  ],
  TO_CUSTOMER: [
    { code: "PENDING", title: "Waiting for rider acceptance" },
    { code: "SCHEDULED", title: "Accepted by rider" },
    { code: "DISPATCHED", title: "Rider is going to shop" },
    { code: "PICKED_UP", title: "Picked up from shop" },
    { code: "IN_TRANSIT", title: "On the way to customer" },
    { code: "DELIVERED", title: "Delivered to customer" },
  ],
};

export default function OrderRequestDetails() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token, me } = useDeliveryAuth();
  const [delivery, setDelivery] = useState<DeliveryWithJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [chatMessages, setChatMessages] = useState<DeliveryChatMessage[]>([]);
  const [chatText, setChatText] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const id = typeof params?.id === "string" ? params.id : "";
  const registrationStatus = me?.registrationStatus ?? "APPROVED";

  useEffect(() => {
    if (!token || !id || registrationStatus !== "APPROVED") {
      setDelivery(null);
      setLoading(false);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    fetchDeliveryDeliveries(token)
      .then((data) => {
        const found = data.deliveries.find((d) => d.id === id) ?? null;
        setDelivery(found);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load order"))
      .finally(() => setLoading(false));
  }, [token, id, registrationStatus]);

  useEffect(() => {
    if (!token || !id || registrationStatus !== "APPROVED") return;
    fetchDeliveryChatMessages(token, id)
      .then((data) => setChatMessages(data.messages ?? []))
      .catch(() => {
        setChatMessages([]);
      });
  }, [token, id, registrationStatus]);

  useEffect(() => {
    if (!token || !id || registrationStatus !== "APPROVED" || !isChatOpen) return;

    const interval = setInterval(() => {
      fetchDeliveryChatMessages(token, id)
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
  }, [token, id, registrationStatus, isChatOpen]);

  useEffect(() => {
    if (!token || !id || registrationStatus !== "APPROVED") return;
    let disposed = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      try {
        const [{ pusher }, { default: Pusher }] = await Promise.all([
          fetchDeliveryChatMessages(token, id),
          import("pusher-js"),
        ]);
        if (disposed || !pusher?.enabled || !pusher.key || !pusher.cluster) return;

        const client = new Pusher(pusher.key, {
          cluster: pusher.cluster,
          forceTLS: true,
        });
        const channel = client.subscribe(`private-delivery-chat-${id}`);
        channel.bind("message:new", (payload: DeliveryChatMessage) => {
          setChatMessages((prev) => (prev.some((m) => m.id === payload.id) ? prev : [...prev, payload]));
        });
        cleanup = () => {
          channel.unbind_all();
          client.unsubscribe(`private-delivery-chat-${id}`);
          client.disconnect();
        };
      } catch {
        // no realtime when pusher is not configured
      }
    })();

    return () => {
      disposed = true;
      if (cleanup) cleanup();
    };
  }, [token, id, registrationStatus]);

  const nextStatus = useMemo(() => (delivery ? NEXT_STATUS[delivery.status] ?? null : null), [delivery]);
  const flowSteps = useMemo(() => {
    if (!delivery) return [];
    return FLOW_BY_DIRECTION[delivery.direction] ?? FLOW_BY_DIRECTION.TO_SHOP;
  }, [delivery]);
  const currentStepIndex = useMemo(() => {
    if (!delivery) return -1;
    return flowSteps.findIndex((step) => step.code === delivery.status);
  }, [delivery, flowSteps]);

  async function handleAdvance() {
    if (!token || !delivery || !nextStatus || registrationStatus !== "APPROVED") return;
    setUpdating(true);
    setError("");
    try {
      const result = await updateDeliveryStatus(token, delivery.id, nextStatus);
      setDelivery(result.delivery);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdating(false);
    }
  }

  async function handleAccept() {
    if (!token || !delivery || registrationStatus !== "APPROVED") return;
    setAccepting(true);
    setError("");
    try {
      const result = await acceptDelivery(token, delivery.id);
      setDelivery(result.delivery);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept order");
    } finally {
      setAccepting(false);
    }
  }

  async function handleSendChat() {
    if (!token || !id || !chatText.trim() || registrationStatus !== "APPROVED") return;
    setSendingChat(true);
    try {
      const result = await sendDeliveryChatMessage(token, id, chatText);
      setChatMessages((prev) => [...prev, result.message]);
      setChatText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSendingChat(false);
    }
  }

  return (
    <div className="flex flex-col bg-white rounded-3xl overflow-hidden shadow-sm border border-[#d9e5d5] relative pb-10">
      <div className="p-6 border-b border-[#e7efe2]">
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-[#eef4ea] flex items-center justify-center text-[#163625] border border-[#d9e5d5]"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="bg-[#163625] text-[#E4FCD5] px-3 py-1.5 rounded-full text-xs font-bold">
            Delivery #{id.slice(0, 8)}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsChatOpen(true)}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#d9e5d5] bg-white px-3 py-2 text-xs font-bold text-[#163625] hover:bg-[#f8fbf6]"
        >
          <MessageCircle size={14} />
          Open chat
        </button>
      </div>

      <div className="p-6">
        {registrationStatus !== "APPROVED" ? (
          <div className="rounded-2xl border border-[#d9e5d5] bg-white p-6">
            <h2 className="text-lg font-bold text-[#163625]">Order access blocked</h2>
            <p className="mt-2 text-sm text-[#163625]/75">
              You cannot view delivery orders until your account is approved by admin.
            </p>
          </div>
        ) : null}

        {registrationStatus !== "APPROVED" ? null : (
          <>
        {loading ? <p className="text-sm text-[#163625]/70">Loading delivery...</p> : null}
        {!loading && !delivery ? <p className="text-sm text-red-700">Delivery not found.</p> : null}
        {error ? <p className="mb-3 text-sm text-red-700">{error}</p> : null}

        {delivery ? (
          <>
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-extrabold text-[#163625] mb-1">{delivery.repairJob.repairRequest.title}</h2>
                <p className="text-sm text-[#163625]/70">
                  {delivery.direction === "TO_SHOP" ? "Customer to service center" : "Service center to customer"}
                </p>
              </div>
              <div className="text-right">
                <h3 className="text-2xl font-extrabold text-green-700">BDT {(delivery.fee ?? 0).toFixed(2)}</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#163625] bg-[#eef4ea] px-2 py-0.5 rounded">
                  {delivery.status}
                </span>
              </div>
            </div>

            <div className="mb-6 rounded-2xl border border-[#d9e5d5] bg-[#eef4ea] p-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shrink-0 border border-[#d9e5d5]">
                  <Package size={22} className="text-[#163625]" />
                </div>
                <div>
                  <h4 className="font-bold text-[#163625]">{delivery.repairJob.repairRequest.deviceType}</h4>
                  <p className="text-xs text-[#163625]/70 mt-1">Shop: {delivery.repairJob.shop.name}</p>
                  <p className="text-xs text-[#163625]/70">Contact: {delivery.repairJob.repairRequest.contactPhone ?? "-"}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="rounded-xl border border-[#d9e5d5] p-4">
                <p className="text-[10px] font-bold text-[#163625]/60 uppercase tracking-wider mb-1">Pickup</p>
                <p className="text-sm font-semibold text-[#163625]">{delivery.pickupAddress}</p>
              </div>
              <div className="rounded-xl border border-[#d9e5d5] p-4">
                <p className="text-[10px] font-bold text-[#163625]/60 uppercase tracking-wider mb-1">Dropoff</p>
                <p className="text-sm font-semibold text-[#163625]">{delivery.dropAddress}</p>
              </div>
            </div>

            <div className="mb-8 rounded-2xl border border-[#d9e5d5] bg-[#f8fbf6] p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#163625]/70">
                {delivery.direction === "TO_SHOP" ? "Customer to shop flow" : "Shop to customer flow"}
              </p>
              <div className="space-y-2">
                {flowSteps.map((step, index) => {
                  const isCompleted = currentStepIndex > index;
                  const isCurrent = currentStepIndex === index;
                  return (
                    <div key={step.code} className="flex items-center gap-3 rounded-lg border border-[#d9e5d5] bg-white px-3 py-2">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          isCompleted || isCurrent ? "bg-[#163625] text-[#E4FCD5]" : "bg-[#eef4ea] text-[#163625]/60"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <p className={`text-sm font-semibold ${isCurrent ? "text-[#163625]" : "text-[#163625]/75"}`}>{step.title}</p>
                        <p className="text-[10px] font-bold text-[#163625]/50">{step.code}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.push("/delivery")}
                className="flex-1 rounded-xl border border-[#d9e5d5] bg-white py-3 text-sm font-bold text-[#163625]"
              >
                Back to dashboard
              </button>
              {!delivery.deliveryAgentId ? (
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={accepting}
                  className="flex-[2] rounded-xl bg-[#163625] py-3 text-sm font-bold text-[#E4FCD5] disabled:opacity-60"
                >
                  {accepting ? "Accepting..." : "Accept this order"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAdvance}
                  disabled={!nextStatus || updating}
                  className="flex-[2] rounded-xl bg-[#163625] py-3 text-sm font-bold text-[#E4FCD5] disabled:opacity-60"
                >
                  {updating ? "Updating..." : nextStatus ? `Move to ${nextStatus}` : "Final status reached"}
                </button>
              )}
            </div>
          </>
        ) : null}
          </>
        )}
      </div>

      {isChatOpen ? (
        <>
          <button
            type="button"
            aria-label="Close chat drawer"
            className="fixed inset-0 z-20 bg-black/40"
            onClick={() => setIsChatOpen(false)}
          />
          <aside className="fixed right-0 top-0 z-30 flex h-full w-full max-w-md flex-col border-l border-[#d9e5d5] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e7efe2] px-4 py-3">
              <div>
                <p className="text-sm font-bold text-[#163625]">Chat with delivery admin</p>
                <p className="text-xs text-[#163625]/65">Delivery #{id.slice(0, 8)}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                className="rounded-lg border border-[#d9e5d5] px-3 py-1 text-xs font-semibold text-[#163625] hover:bg-[#f8fbf6]"
              >
                Close
              </button>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto bg-[#f8fbf6] px-4 py-3">
              {chatMessages.length === 0 ? (
                <p className="text-xs text-[#163625]/65">No messages yet.</p>
              ) : (
                chatMessages.map((msg) => {
                  const isMine = msg.senderRole === "DELIVERY";
                  return (
                    <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                          isMine
                            ? "bg-[#163625] text-[#E4FCD5]"
                            : "border border-[#d9e5d5] bg-white text-[#163625]"
                        }`}
                      >
                        <p>{msg.message}</p>
                        <p className={`mt-1 text-[10px] ${isMine ? "text-[#E4FCD5]/80" : "text-[#163625]/45"}`}>
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-[#e7efe2] p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  placeholder="Type message for admin"
                  className="flex-1 rounded-xl border border-[#d9e5d5] bg-white px-3 py-2 text-sm text-[#163625] outline-none focus:border-[#163625]"
                />
                <button
                  type="button"
                  onClick={handleSendChat}
                  disabled={sendingChat || !chatText.trim()}
                  className="rounded-xl bg-[#163625] px-4 py-2 text-sm font-bold text-[#E4FCD5] disabled:opacity-60"
                >
                  {sendingChat ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
