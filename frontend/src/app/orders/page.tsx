"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Navbar from "@/components/home/Navbar";
import { getMyOrders } from "@/lib/api";

type OrderItem = {
  id: string;
  title: string;
  deviceType?: string | null;
  brand?: string | null;
  model?: string | null;
  problem?: string | null;
  status: string;
  mode: string;
  repairJob?: {
    shop?: {
      name: string;
    } | null;
    deliveries?: {
      status?: string | null;
    }[];
  } | null;
};

export default function OrdersPage() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [message, setMessage] = useState("Loading your orders...");

  useEffect(() => {
    const token = (session?.user as { accessToken?: string } | undefined)
      ?.accessToken;

    if (!token) {
      setMessage("Log in to view your orders.");
      return;
    }

    getMyOrders(token)
      .then((data: any) => {
        setOrders(data);
        setMessage(data.length ? "" : "No orders yet.");
      })
      .catch((error) =>
        setMessage(
          error instanceof Error ? error.message : "Failed to load orders."
        )
      );
  }, [session]);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Navbar
        isLoggedIn={!!session?.user}
        firstName={session?.user?.name?.split(" ")[0]}
      />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
              Orders
            </p>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">
              Track your requests
            </h1>
          </div>

          <Link
            href="/requests/new"
            className="rounded-full bg-[var(--accent-dark)] px-6 py-3 text-sm font-semibold text-white"
          >
            New request
          </Link>
        </div>

        <div className="space-y-4">
          {orders.map((order) => (
            <article
              key={order.id}
              className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[var(--foreground)]">
                    {order.title}
                  </h2>
                  <p className="mt-2 text-[var(--muted-foreground)]">
                    {order.deviceType} {order.brand || ""} {order.model || ""}
                  </p>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                    {order.problem}
                  </p>
                </div>

                <div className="rounded-full bg-[var(--mint-100)] px-4 py-2 text-sm font-semibold text-[var(--accent-dark)]">
                  {order.status.replaceAll("_", " ")}
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--mint-50)] p-4 text-sm text-[var(--muted-foreground)]">
                  <p className="font-semibold text-[var(--foreground)]">Flow</p>
                  <p>{order.mode.replaceAll("_", " ")}</p>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--mint-50)] p-4 text-sm text-[var(--muted-foreground)]">
                  <p className="font-semibold text-[var(--foreground)]">Shop</p>
                  <p>{order.repairJob?.shop?.name || "Matching in progress"}</p>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--mint-50)] p-4 text-sm text-[var(--muted-foreground)]">
                  <p className="font-semibold text-[var(--foreground)]">
                    Latest delivery
                  </p>
                  <p>
                    {order.repairJob?.deliveries?.[0]?.status?.replaceAll(
                      "_",
                      " "
                    ) || "No delivery assigned yet"}
                  </p>
                </div>
              </div>
            </article>
          ))}

          {!orders.length && (
            <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8 text-[var(--muted-foreground)] shadow-sm">
              {message}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}