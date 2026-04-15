"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Navbar from "@/components/home/Navbar";
import {
  createReview,
  getReviewEligibility,
  getShops,
  getShopReviews,
  type Review,
  type Shop,
} from "@/lib/api";

function getServiceSummary(service: string) {
  const lower = service.toLowerCase();

  if (lower.includes("screen") || lower.includes("display")) {
    return { estimate: 1800, summary: "Panel check, part replacement, fitting, and post-repair testing." };
  }

  if (lower.includes("battery")) {
    return { estimate: 1200, summary: "Battery health diagnostics, replacement, and charging checks." };
  }

  if (lower.includes("keyboard")) {
    return { estimate: 900, summary: "Key and connector inspection, replacement, and typing tests." };
  }

  if (lower.includes("motherboard") || lower.includes("board")) {
    return { estimate: 2800, summary: "Board-level diagnosis and repair for complex hardware faults." };
  }

  if (lower.includes("charging") || lower.includes("port")) {
    return { estimate: 850, summary: "Port cleaning, connector repair, and charging stability checks." };
  }

  return { estimate: 650, summary: `Diagnosis and repair support for ${service.toLowerCase()}.` };
}

export default function ShopDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState<string>("");
  const [shop, setShop] = useState<(Shop & { phone?: string | null; email?: string | null; specialties: string[] }) | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [eligibility, setEligibility] = useState<{ eligible: boolean; hasCompletedJob: boolean; hasExistingReview: boolean } | null>(null);
  const [score, setScore] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [message, setMessage] = useState("");
  const { data: session } = useSession();

  useEffect(() => {
    params.then((value) => setSlug(value.slug));
  }, [params]);

  useEffect(() => {
    if (!slug) return;
    getShops(slug).then(setShop).catch(() => setShop(null));
    getShopReviews(slug).then(setReviews).catch(() => setReviews([]));
  }, [slug]);

  useEffect(() => {
    const accessToken = (session?.user as { accessToken?: string } | undefined)?.accessToken;
    if (!slug || !accessToken) return;
    getReviewEligibility(slug, accessToken).then(setEligibility).catch(() => setEligibility(null));
  }, [session, slug]);

  const serviceItems = useMemo(() => {
    const items = shop?.specialties?.length
      ? shop.specialties
      : ["General diagnostics", "Battery replacement", "Screen repair"];

    return items.map((item) => ({ name: item, ...getServiceSummary(item) }));
  }, [shop]);

  if (!shop) {
    return (
      <main className="min-h-screen bg-[#E4FCD5]">
        <Navbar />
        <div className="mx-auto max-w-6xl px-4 py-10 text-[#173726]">Loading shop...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#E4FCD5]">
      <Navbar isLoggedIn={!!session?.user} firstName={session?.user?.name?.split(" ")[0]} />

      <div className="border-b border-[#dbe5d6] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
          <div className="text-sm text-[#667d6d]">
            <Link href="/" className="hover:text-[#214c34]">Homepage</Link>
            <span className="mx-2">›</span>
            <Link href="/shops" className="hover:text-[#214c34]">Shops</Link>
            <span className="mx-2">›</span>
            <span className="text-[#214c34]">{shop.name}</span>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[140px_minmax(0,1fr)_220px] lg:items-start">
            <div className="h-[120px] w-[120px] rounded-[1.5rem] border border-[#dde7d8] bg-[linear-gradient(135deg,#edf4e8,#d7e5cf)]" />

            <div>
              <p className="text-sm text-[#607565]">
                {(shop.specialties?.slice(0, 4) || []).join(" · ") || "Repair services"}
              </p>
              <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#153726]">{shop.name}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#34523f]">
                <span>⭐ {shop.ratingAvg?.toFixed(1) ?? "0.0"} ({shop.reviewCount ?? 0}+)</span>
                <span>{shop.address}</span>
                {shop.phone ? <span>{shop.phone}</span> : null}
                {shop.email ? <span>{shop.email}</span> : null}
              </div>
              <p className="mt-4 max-w-3xl text-[#56715d]">{shop.description || "Professional device repair support with diagnostics, updates, and service handling from this shop."}</p>
            </div>

            <div className="rounded-[1.5rem] border border-[#dce5d8] bg-white p-4 shadow-sm">
              <Link
                href={`/requests/new?shop=${shop.slug}`}
                className="inline-flex w-full items-center justify-center rounded-full bg-[#214c34] px-5 py-3 text-sm font-semibold text-white"
              >
                Request from this shop
              </Link>
              <p className="mt-3 text-center text-xs text-[#6a816f]">Choose a service below and continue with a direct request.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:px-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0">
          <div className="mb-4 flex gap-5 overflow-x-auto border-b border-[#dbe5d6] bg-white px-4 py-3 text-sm font-medium text-[#516655]">
            <span className="border-b-4 border-[#214c34] pb-2 text-[#173726]">Services</span>
            <span className="pb-2">Reviews</span>
          </div>

          <div className="rounded-[2rem] bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-3xl font-bold text-[#173726]">Available services</h2>
              <p className="mt-2 text-[#607565]">Pick a service the same way you would browse a menu, then continue to a direct request with this shop.</p>
            </div>

            <div className="space-y-4">
              {serviceItems.map((item) => (
                <article key={item.name} className="flex flex-col gap-4 rounded-[1.5rem] border border-[#dfe8d9] p-4 transition hover:border-[#bfd3bc] hover:shadow-sm md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="text-xl font-semibold text-[#173726]">{item.name}</h3>
                        <p className="mt-2 text-sm leading-6 text-[#5c7563]">{item.summary}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-lg font-bold text-[#173726]">৳{item.estimate.toLocaleString("en-BD")}</div>
                        <div className="text-xs text-[#6d8372]">starting estimate</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 md:pl-4">
                    <Link
                      href={`/requests/new?shop=${shop.slug}`}
                      className="inline-flex h-11 items-center rounded-full bg-[#214c34] px-5 text-sm font-semibold text-white"
                    >
                      Request service
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <section className="mt-6 rounded-[2rem] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-[#173726]">Customer reviews</h2>
            <div className="mt-5 space-y-4">
              {reviews.length === 0 && <p className="text-[#5b7262]">No reviews yet.</p>}
              {reviews.map((item) => (
                <article key={item.id} className="rounded-2xl border border-[#d7e4d0] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-[#173726]">{item.user?.name || item.user?.username || "Customer"}</p>
                    <p className="text-sm text-[#5b7262]">{item.score}/5</p>
                  </div>
                  {item.review && <p className="mt-2 text-[#355541]">{item.review}</p>}
                </article>
              ))}
            </div>
          </section>
        </section>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-[2rem] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-[#173726]">Write a review</h2>
            {!session?.user && <p className="mt-3 text-sm text-[#5b7262]">Log in to review a shop after a completed service.</p>}
            {session?.user && eligibility && !eligibility.eligible && (
              <p className="mt-3 text-sm text-[#5b7262]">You can review this shop only after a completed service, and only once.</p>
            )}
            {session?.user && eligibility?.eligible && (
              <form
                className="mt-4 space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const token = (session.user as { accessToken?: string }).accessToken;
                  if (!token) return;
                  try {
                    await createReview(shop.slug, { score, review: reviewText }, token);
                    setMessage("Review submitted successfully.");
                    setReviewText("");
                    setEligibility({ eligible: false, hasCompletedJob: true, hasExistingReview: true });
                    setReviews(await getShopReviews(shop.slug));
                  } catch (error) {
                    setMessage(error instanceof Error ? error.message : "Could not submit review.");
                  }
                }}
              >
                <select value={score} onChange={(e) => setScore(Number(e.target.value))} className="w-full rounded-2xl border border-[#cfe0c6] px-4 py-3">
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={value}>{value} stars</option>
                  ))}
                </select>
                <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} rows={4} className="w-full rounded-2xl border border-[#cfe0c6] px-4 py-3" placeholder="Tell others about your experience" />
                <button className="rounded-full bg-[#214c34] px-6 py-3 text-sm font-semibold text-white">Submit review</button>
              </form>
            )}
            {message && <p className="mt-3 text-sm text-[#214c34]">{message}</p>}
          </section>
        </aside>
      </div>
    </main>
  );
}
