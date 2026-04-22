"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Navbar from "@/components/home/Navbar";
import { getMyOrders, type OrderItem } from "@/lib/api";

export default function OrdersPage() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [message, setMessage] = useState("Loading your orders...");

  useEffect(() => {
    const token = (session?.user as { accessToken?: string } | undefined)?.accessToken;
    if (!token) {
      setMessage("Log in to view your orders.");
      return;
    }
    getMyOrders(token)
      .then((data) => {
        setOrders(data);
        setMessage(data.length ? "" : "No orders yet.");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Failed to load orders."));
  }, [session]);

  return (
    <main className="min-h-screen bg-[#E4FCD5]">
      <Navbar isLoggedIn={!!session?.user} firstName={session?.user?.name?.split(" ")[0]} />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[#58725f]">Orders</p>
            <h1 className="text-3xl font-bold text-[#173726]">Track your requests</h1>
          </div>
          <Link href="/requests/new" className="rounded-full bg-[#214c34] px-6 py-3 text-sm font-semibold text-white">New request</Link>
        </div>

        <div className="space-y-4">
          {orders.map((order) => (
            <article key={order.id} className="rounded-[2rem] bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[#173726]">{order.title}</h2>
                  <p className="mt-2 text-[#355541]">{order.deviceType} {order.brand || ""} {order.model || ""}</p>
                  <p className="mt-2 text-sm text-[#5b7262]">{order.problem}</p>
                </div>
                <div className="rounded-full bg-[#dff0dc] px-4 py-2 text-sm font-semibold text-[#214c34]">{order.status.replaceAll("_", " ")}</div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-[#f6faf4] p-4 text-sm text-[#355541]">
                  <p className="font-semibold text-[#173726]">Flow</p>
                  <p>{order.mode.replaceAll("_", " ")}</p>
                </div>
                <div className="rounded-2xl bg-[#f6faf4] p-4 text-sm text-[#355541]">
                  <p className="font-semibold text-[#173726]">Shop</p>
                  <p>{order.repairJob?.shop.name || "Matching in progress"}</p>
                </div>
                <div className="rounded-2xl bg-[#f6faf4] p-4 text-sm text-[#355541]">
                  <p className="font-semibold text-[#173726]">Latest delivery</p>
                  <p>{order.repairJob?.deliveries[0]?.status?.replaceAll("_", " ") || "No delivery assigned yet"}</p>
                </div>
              </div>
            </article>
          ))}
          {!orders.length && <div className="rounded-[2rem] bg-white p-8 text-[#355541] shadow-sm">{message}</div>}
        </div>
      </div>
    </main>
  );
}
