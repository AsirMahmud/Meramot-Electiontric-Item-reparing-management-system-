"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "@/components/home/Navbar";
import { createRepairRequest } from "@/lib/api";

export default function NewRequestPage() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const shopSlug = searchParams.get("shop") || "";
  const [form, setForm] = useState({
    title: "",
    deviceType: "Laptop",
    brand: "",
    model: "",
    issueCategory: "",
    problem: "",
    mode: shopSlug ? "DIRECT_REPAIR" : "CHECKUP_AND_REPAIR",
    preferredPickup: true,
    deliveryType: "REGULAR",
  });
  const [message, setMessage] = useState("");

  const token = (session?.user as { accessToken?: string } | undefined)?.accessToken;
  const flowTitle = useMemo(() => shopSlug ? `Direct order with ${shopSlug}` : "Market flow request", [shopSlug]);

  return (
    <main className="min-h-screen bg-[#E4FCD5]">
      <Navbar isLoggedIn={!!session?.user} firstName={session?.user?.name?.split(" ")[0]} />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-[2rem] bg-white p-8 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-[#58725f]">Create request</p>
          <h1 className="mt-2 text-3xl font-bold text-[#173726]">{flowTitle}</h1>
          <p className="mt-2 text-[#5b7262]">Use market flow to get matched automatically, or direct order to place a request with one selected shop.</p>

          <form className="mt-8 grid gap-4 md:grid-cols-2" onSubmit={async (e) => {
            e.preventDefault();
            if (!session?.user) {
              setMessage("Please log in first.");
              return;
            }
            
            if (!token) {
              setMessage("You are signed in, but your backend session token is missing. Sign out and sign in again.");
              return;
            }
            try {
              await createRepairRequest(
                {
                  title: form.title,
                  description: "",
                  deviceType: form.deviceType,
                  brand: form.brand,
                  model: form.model,
                  issueCategory: form.issueCategory,
                  problem: form.problem,
                  mode: form.mode,
                  preferredPickup: form.preferredPickup,
                  deliveryType: form.deliveryType,
                  shopSlug: shopSlug || undefined,
                },
                token
              );
              setMessage("Request submitted successfully.");
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Failed to submit request.");
            }
          }}>
            <input required value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} className="rounded-2xl border border-[#cfe0c6] px-4 py-3" placeholder="Request title" />
            <input required value={form.deviceType} onChange={(e) => setForm((prev) => ({ ...prev, deviceType: e.target.value }))} className="rounded-2xl border border-[#cfe0c6] px-4 py-3" placeholder="Device type" />
            <input value={form.brand} onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))} className="rounded-2xl border border-[#cfe0c6] px-4 py-3" placeholder="Brand" />
            <input value={form.model} onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))} className="rounded-2xl border border-[#cfe0c6] px-4 py-3" placeholder="Model" />
            <input value={form.issueCategory} onChange={(e) => setForm((prev) => ({ ...prev, issueCategory: e.target.value }))} className="rounded-2xl border border-[#cfe0c6] px-4 py-3" placeholder="Issue category" />
            <select value={form.mode} onChange={(e) => setForm((prev) => ({ ...prev, mode: e.target.value }))} className="rounded-2xl border border-[#cfe0c6] px-4 py-3">
              <option value="CHECKUP_ONLY">Checkup only</option>
              <option value="DIRECT_REPAIR">Direct repair</option>
              <option value="CHECKUP_AND_REPAIR">Checkup and repair</option>
            </select>
            <select value={form.deliveryType} onChange={(e) => setForm((prev) => ({ ...prev, deliveryType: e.target.value }))} className="rounded-2xl border border-[#cfe0c6] px-4 py-3">
              <option value="REGULAR">Regular delivery</option>
              <option value="EXPRESS">Express delivery</option>
            </select>
            <label className="flex items-center gap-3 rounded-2xl border border-[#cfe0c6] px-4 py-3 text-[#173726]">
              <input type="checkbox" checked={form.preferredPickup} onChange={(e) => setForm((prev) => ({ ...prev, preferredPickup: e.target.checked }))} className="h-4 w-4 accent-[#214c34]" />
              Preferred pickup
            </label>
            <textarea required value={form.problem} onChange={(e) => setForm((prev) => ({ ...prev, problem: e.target.value }))} rows={5} className="md:col-span-2 rounded-2xl border border-[#cfe0c6] px-4 py-3" placeholder="Describe the problem" />
            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button className="rounded-full bg-[#214c34] px-6 py-3 text-sm font-semibold text-white">Submit request</button>
            </div>
          </form>
          {message && <p className="mt-4 text-sm text-[#214c34]">{message}</p>}
        </div>
      </div>
    </main>
  );
}
