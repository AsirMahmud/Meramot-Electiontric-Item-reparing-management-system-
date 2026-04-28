"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "@/components/home/Navbar";
import { createRepairRequest, uploadImages } from "@/lib/api";

function NewRequestContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();

  const shopSlug = searchParams.get("shop") || "";
  const isDirectFlow = Boolean(shopSlug);

  const [form, setForm] = useState({
    title: "",
    deviceType: "Laptop",
    brand: "",
    model: "",
    issueCategory: "",
    problem: "",
    mode: isDirectFlow ? "DIRECT_REPAIR" : "CHECKUP_AND_REPAIR",
    preferredPickup: true,
    deliveryType: "REGULAR",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const token = (session?.user as { accessToken?: string } | undefined)?.accessToken;
  const flowTitle = useMemo(
    () =>
      isDirectFlow ? `Direct request for ${shopSlug}` : "Marketplace repair request",
    [isDirectFlow, shopSlug]
  );

  return (
    <main className="min-h-screen bg-[#E4FCD5]">
      <Navbar isLoggedIn={!!session?.user} firstName={session?.user?.name?.split(" ")[0]} />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-[2rem] bg-white p-8 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-[#58725f]">Create request</p>
          <h1 className="mt-2 text-3xl font-bold text-[#173726]">{flowTitle}</h1>
          <p className="mt-2 text-[#5b7262]">
            Use marketplace mode to open your request for vendor bidding, or direct mode to place a request with one selected shop.
          </p>

          <form
            className="mt-8 grid gap-4 md:grid-cols-2"
            onSubmit={async (event) => {
              event.preventDefault();
              setMessage("");

              if (!session?.user) {
                setMessage("Please sign in first.");
                return;
              }

              if (!token) {
                setMessage(
                  "You are signed in, but your backend session token is missing. Sign out and sign in again."
                );
                return;
              }

              try {
                setSubmitting(true);
                let uploadedImageUrls: string[] = [];
                if (files.length > 0) {
                  const uploadResult = await uploadImages(files, token);
                  uploadedImageUrls = uploadResult.imageUrls;
                }

                await createRepairRequest(
                  {
                    title: form.title,
                    description: "",
                    deviceType: form.deviceType,
                    brand: form.brand,
                    model: form.model,
                    issueCategory: form.issueCategory,
                    problem: form.problem,
                    mode: isDirectFlow ? "DIRECT_REPAIR" : form.mode,
                    preferredPickup: form.preferredPickup,
                    deliveryType: form.deliveryType,
                    shopSlug: shopSlug || undefined,
                    imageUrls: uploadedImageUrls,
                  },
                  token
                );

                router.push("/orders?created=1");
              } catch (error) {
                setMessage(
                  error instanceof Error ? error.message : "Failed to submit request."
                );
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <input
              required
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
              className="rounded-2xl border border-[#cfe0c6] px-4 py-3"
              placeholder="Request title"
            />
            <input
              required
              value={form.deviceType}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, deviceType: event.target.value }))
              }
              className="rounded-2xl border border-[#cfe0c6] px-4 py-3"
              placeholder="Device type"
            />
            <input
              value={form.brand}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, brand: event.target.value }))
              }
              className="rounded-2xl border border-[#cfe0c6] px-4 py-3"
              placeholder="Brand"
            />
            <input
              value={form.model}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, model: event.target.value }))
              }
              className="rounded-2xl border border-[#cfe0c6] px-4 py-3"
              placeholder="Model"
            />
            <input
              value={form.issueCategory}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, issueCategory: event.target.value }))
              }
              className="rounded-2xl border border-[#cfe0c6] px-4 py-3"
              placeholder="Issue category"
            />

            {isDirectFlow ? (
              <div className="rounded-2xl border border-[#cfe0c6] bg-[#f6faf4] px-4 py-3 text-sm text-[#173726]">
                Direct repair request for <span className="font-semibold">{shopSlug}</span>
              </div>
            ) : (
              <select
                value={form.mode}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, mode: event.target.value }))
                }
                className="rounded-2xl border border-[#cfe0c6] px-4 py-3"
              >
                <option value="CHECKUP_ONLY">Checkup only</option>
                <option value="DIRECT_REPAIR">Direct repair</option>
                <option value="CHECKUP_AND_REPAIR">Checkup and repair</option>
              </select>
            )}

            <select
              value={form.deliveryType}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, deliveryType: event.target.value }))
              }
              className="rounded-2xl border border-[#cfe0c6] px-4 py-3"
            >
              <option value="REGULAR">Regular delivery</option>
              <option value="EXPRESS">Express delivery</option>
            </select>
            <label className="flex items-center gap-3 rounded-2xl border border-[#cfe0c6] px-4 py-3 text-[#173726]">
              <input
                type="checkbox"
                checked={form.preferredPickup}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, preferredPickup: event.target.checked }))
                }
                className="h-4 w-4 accent-[#214c34]"
              />
              Preferred pickup
            </label>
            <textarea
              required
              value={form.problem}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, problem: event.target.value }))
              }
              rows={5}
              className="md:col-span-2 rounded-2xl border border-[#cfe0c6] px-4 py-3"
              placeholder="Describe the problem"
            />
            
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-[#173726]">
                Upload Images (Max 4)
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files) {
                    const selected = Array.from(e.target.files).slice(0, 4);
                    setFiles(selected);
                  }
                }}
                className="w-full rounded-2xl border border-[#cfe0c6] px-4 py-3 file:mr-4 file:rounded-full file:border-0 file:bg-[#214c34] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#1a3d29]"
              />
              {files.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2 text-sm text-[#5b7262]">
                  {files.map((f, i) => (
                    <span key={i} className="inline-block bg-[#f6faf4] px-2 py-1 rounded border border-[#cfe0c6]">
                      {f.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button
                disabled={submitting}
                className="rounded-full bg-[#214c34] px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit request"}
              </button>
              <Link
                href="/orders"
                className="rounded-full border border-[#214c34] bg-white px-6 py-3 text-sm font-semibold text-[#214c34]"
              >
                View my requests
              </Link>
            </div>
          </form>
          {message ? <p className="mt-4 text-sm text-[#214c34]">{message}</p> : null}
        </div>
      </div>
    </main>
  );
}

export default function NewRequestPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#E4FCD5]">
          <div className="mx-auto max-w-4xl px-4 py-8">Loading request form...</div>
        </main>
      }
    >
      <NewRequestContent />
    </Suspense>
  );
}
