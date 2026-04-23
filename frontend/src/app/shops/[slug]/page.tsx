"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Navbar from "@/components/home/Navbar";
import {
  addServiceToCart,
  createReview,
  getReviewEligibility,
  getShopBySlug,
  getShopReviews,
  type Shop,
} from "@/lib/api";

<<<<<<< HEAD
type Review = {
  id: string;
  score: number;
  review?: string | null;
  user?: {
    name?: string | null;
    username?: string | null;
  } | null;
};

type ReviewEligibilityState = {
  eligible: boolean;
  hasCompletedJob: boolean;
  hasExistingReview: boolean;
};

type ShopDetails = Shop & {
  phone?: string | null;
  email?: string | null;
  specialties?: string[];
};
=======
function formatPrice(basePrice?: number | null, priceMax?: number | null, pricingType?: string | null) {
  if (pricingType === "INSPECTION_REQUIRED") return "Inspection required";
  if (basePrice == null) return "Contact shop";
  if (priceMax != null && priceMax > basePrice) return `৳${basePrice.toLocaleString()} - ৳${priceMax.toLocaleString()}`;
  if (pricingType === "STARTING_FROM") return `From ৳${basePrice.toLocaleString()}`;
  return `৳${basePrice.toLocaleString()}`;
}
>>>>>>> origin/main

function getServiceSummary(service: string) {
  const lower = service.toLowerCase();

  if (lower.includes("screen") || lower.includes("display")) {
    return {
      estimate: 1800,
      summary:
        "Panel check, part replacement, fitting, and post-repair testing.",
    };
  }

  if (lower.includes("battery")) {
    return {
      estimate: 1200,
      summary:
        "Battery health diagnostics, replacement, and charging checks.",
    };
  }

  if (lower.includes("keyboard")) {
    return {
      estimate: 900,
      summary: "Key and connector inspection, replacement, and typing tests.",
    };
  }

  if (lower.includes("motherboard") || lower.includes("board")) {
    return {
      estimate: 2800,
      summary: "Board-level diagnosis and repair for complex hardware faults.",
    };
  }

  if (lower.includes("charging") || lower.includes("port")) {
    return {
      estimate: 850,
      summary:
        "Port cleaning, connector repair, and charging stability checks.",
    };
  }

  return {
    estimate: 650,
    summary: `Diagnosis and repair support for ${service.toLowerCase()}.`,
  };
}

export default function ShopDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [slug, setSlug] = useState("");
  const [shop, setShop] = useState<ShopDetails | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [eligibility, setEligibility] = useState<ReviewEligibilityState | null>(
    null
  );
  const [score, setScore] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [message, setMessage] = useState("");
  const [cartToast, setCartToast] = useState("");
  const [reviewToast, setReviewToast] = useState("");
  const [addingService, setAddingService] = useState<string | null>(null);

  const { data: session } = useSession();
  const token = (session?.user as { accessToken?: string } | undefined)
    ?.accessToken;

  useEffect(() => {
    params.then((value) => setSlug(value.slug));
  }, [params]);

  useEffect(() => {
    if (!slug) return;

    getShopBySlug(slug)
      .then((data) =>
        setShop({
          ...data,
          specialties: data.specialties ?? [],
        })
      )
      .catch(() => setShop(null));

    getShopReviews(slug).then(setReviews).catch(() => setReviews([]));
  }, [slug]);

  useEffect(() => {
    if (!cartToast) return;

    const timeout = setTimeout(() => {
      setCartToast("");
    }, 2800);

    return () => clearTimeout(timeout);
  }, [cartToast]);

  useEffect(() => {
    if (!reviewToast) return;
  
    const timeout = setTimeout(() => {
      setReviewToast("");
    }, 2800);
  
    return () => clearTimeout(timeout);
  }, [reviewToast]);

  useEffect(() => {
    if (!slug || !token) return;

    getReviewEligibility(slug, token)
      .then((result) => {
        // TESTING MODE:
        // allow review for any logged-in user as long as they have not already reviewed
        setEligibility({
          eligible: !result.hasExistingReview,
          hasCompletedJob: result.hasCompletedJob,
          hasExistingReview: result.hasExistingReview,
        });
      })
      .catch(() =>
        setEligibility({
          eligible: true,
          hasCompletedJob: false,
          hasExistingReview: false,
        })
      );
  }, [slug, token]);

  const serviceItems = useMemo(() => {
    const items =
      shop?.specialties && shop.specialties.length > 0
        ? shop.specialties
        : ["General diagnostics", "Battery replacement", "Screen repair"];

    return items.map((item) => ({
      name: item,
      ...getServiceSummary(item),
    }));
  }, [shop]);

  if (!shop) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <Navbar />
        <div className="mx-auto max-w-6xl px-4 py-10 text-[var(--foreground)]">
          Loading shop...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Navbar
        isLoggedIn={!!session?.user}
        firstName={session?.user?.name?.split(" ")[0]}
      />

      {cartToast && (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center px-4">
          <div className="rounded-2xl bg-[var(--accent-dark)] px-5 py-3 text-sm font-medium text-white shadow-xl">
            {cartToast}
          </div>
        </div>
      )}

      {reviewToast && (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-[101] flex justify-center px-4">
          <div className="rounded-2xl bg-[var(--accent-dark)] px-5 py-3 text-sm font-medium text-white shadow-xl">
            {reviewToast}
          </div>
        </div>
      )}

      <div className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
          <div className="text-sm text-[var(--muted-foreground)]">
            <Link href="/" className="hover:text-[var(--accent-dark)]">
              Homepage
            </Link>
            <span className="mx-2">›</span>
            <Link href="/shops" className="hover:text-[var(--accent-dark)]">
              Shops
            </Link>
            <span className="mx-2">›</span>
            <span className="text-[var(--accent-dark)]">{shop.name}</span>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[140px_minmax(0,1fr)_220px] lg:items-start">
            <div className="h-[120px] w-[120px] rounded-[1.5rem] border border-[var(--border)] bg-[var(--mint-100)]" />

            <div>
              <p className="text-sm text-[var(--muted-foreground)]">
                {(shop.specialties?.slice(0, 4) || []).join(" · ") ||
                  "Repair services"}
              </p>

              <h1 className="mt-2 text-4xl font-bold tracking-tight text-[var(--foreground)]">
                {shop.name}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--foreground)]">
                <span>
                  ⭐ {shop.ratingAvg?.toFixed(1) ?? "0.0"} (
                  {shop.reviewCount ?? 0})
                </span>
                <span>{shop.address}</span>
                {shop.phone ? <span>{shop.phone}</span> : null}
                {shop.email ? <span>{shop.email}</span> : null}
              </div>

              <p className="mt-4 max-w-3xl text-[var(--muted-foreground)]">
                {shop.description ||
                  "Professional device repair support with diagnostics, updates, and service handling from this shop."}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
              <Link
                href="/cart"
                className="inline-flex w-full items-center justify-center rounded-full bg-[var(--accent-dark)] px-5 py-3 text-sm font-semibold text-white"
              >
                Go to cart
              </Link>
              <p className="mt-3 text-center text-xs text-[var(--muted-foreground)]">
                Add one or more services below, then finish checkout in your
                cart.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:px-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0">
          <div className="mb-4 flex gap-5 overflow-x-auto border-b border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm font-medium text-[var(--muted-foreground)]">
            <span className="border-b-4 border-[var(--accent-dark)] pb-2 text-[var(--foreground)]">
              Services
            </span>
            <span className="pb-2">Reviews</span>
          </div>

          <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-3xl font-bold text-[var(--foreground)]">
                Available services
              </h2>
              <p className="mt-2 text-[var(--muted-foreground)]">
                Add services to cart first, then choose schedule, payment
                method, and address during checkout.
              </p>
            </div>

            <div className="space-y-4">
              {serviceItems.map((item) => (
                <article
                  key={item.name}
                  className="flex flex-col gap-4 rounded-[1.5rem] border border-[var(--border)] p-4 transition hover:shadow-sm md:flex-row md:items-start md:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="text-xl font-semibold text-[var(--foreground)]">
                          {item.name}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                          {item.summary}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-lg font-bold text-[var(--foreground)]">
                          ৳{item.estimate.toLocaleString("en-BD")}
                        </div>
                        <div className="text-xs text-[var(--muted-foreground)]">
                          starting estimate
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 md:pl-4">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!token) {
                          setCartToast(
                            "Please log in first to add services to your cart."
                          );
                          return;
                        }

                        try {
                          setAddingService(item.name);

                          await addServiceToCart(
                            {
                              shopSlug: shop.slug,
                              serviceName: item.name,
                              description: item.summary,
                              price: item.estimate,
                              quantity: 1,
                              metadata: {
                                source: "shop-details",
                                shopName: shop.name,
                              },
                            },
                            token
                          );

                          setCartToast(`${item.name} added to cart.`);
                        } catch (error) {
                          setCartToast(
                            error instanceof Error
                              ? error.message
                              : "Could not add service to cart."
                          );
                        } finally {
                          setAddingService(null);
                        }
                      }}
                      className="inline-flex h-11 items-center rounded-full bg-[var(--accent-dark)] px-5 text-sm font-semibold text-white"
                    >
                      {addingService === item.name ? "Adding..." : "Add to cart"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <section className="mt-6 rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-[var(--foreground)]">
              Customer reviews
            </h2>

            <div className="mt-5 space-y-4">
              {reviews.length === 0 && (
                <p className="text-[var(--muted-foreground)]">No reviews yet.</p>
              )}

              {reviews.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-[var(--border)] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-[var(--foreground)]">
                      {item.user?.name || item.user?.username || "Customer"}
                    </p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {item.score}/5
                    </p>
                  </div>

                  {item.review ? (
                    <p className="mt-2 text-[var(--muted-foreground)]">
                      {item.review}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </section>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-[var(--foreground)]">
              Write a review
            </h2>

            {!session?.user && (
              <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                Log in to review this shop.
              </p>
            )}

            {session?.user && eligibility && !eligibility.eligible && (
              <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                You have already submitted a review for this shop.
              </p>
            )}

            {session?.user && eligibility?.eligible && (
              <form
                className="mt-4 space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!token) return;

                  try {
                    await createReview(
                      shop.slug,
                      { score, review: reviewText },
                      token
                    );

                    setMessage("");
                    setReviewToast("Review submitted successfully.");
                    setReviewText("");
                    setEligibility({
                      eligible: false,
                      hasCompletedJob: false,
                      hasExistingReview: true,
                    });

                    setReviews(await getShopReviews(shop.slug));
                  } catch (error) {
                    setMessage(
                      error instanceof Error
                        ? error.message
                        : "Could not submit review."
                    );
                  }
                }}
              >
                <select
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--foreground)]"
                >
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={value}>
                      {value} stars
                    </option>
                  ))}
                </select>

                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                  placeholder="Tell others about your experience"
                />

                <button className="rounded-full bg-[var(--accent-dark)] px-6 py-3 text-sm font-semibold text-white">
                  Submit review
                </button>
              </form>
            )}

            {message && (
              <p className="mt-3 text-sm text-[var(--accent-dark)]">
                {message}
              </p>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}