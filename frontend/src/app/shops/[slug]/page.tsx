"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Navbar from "@/components/home/Navbar";
import LocationPickerModal from "@/components/location/LocationPickerModal";
import { useSelectedLocation } from "@/components/location/useSelectedLocation";
import type { StoredLocation } from "@/components/location/types";
import {
  addServiceToCart,
  createReview,
  getReviewEligibility,
  getShopBySlug,
  getShopReviews,
  type Shop,
} from "@/lib/api";

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
const GUEST_CART_KEY = "meramot.guestCart";

type Review = {
  id: string;
  score: number;
  review?: string | null;
  createdAt?: string;
  updatedAt?: string;
  canEdit?: boolean;
  editExpiresAt?: string;
  user?: {
    id?: string;
    name?: string | null;
    username?: string | null;
  } | null;
};

type PendingCartItem = {
  shopSlug: string;
  serviceName: string;
  description: string;
  price: number;
  quantity: number;
  metadata: {
    source: string;
    shopName: string;
    pickupLocation?: StoredLocation;
  };
};

type ExistingReview = {
  id: string;
  score: number;
  review?: string | null;
  createdAt?: string;
  updatedAt?: string;
  canEdit?: boolean;
  editExpiresAt?: string;
};

type ReviewEligibilityState = {
  eligible: boolean;
  hasCompletedJob: boolean;
  hasExistingReview: boolean;
  existingReview?: ExistingReview | null;
};

type ShopDetails = Shop & {
  phone?: string | null;
  email?: string | null;
  specialties?: string[];
};

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

function formatDate(value?: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-BD", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function StarDisplay({ value, size = "text-lg" }: { value: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`${size} ${star <= value ? "text-yellow-500" : "text-[var(--border)]"}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function StarInput({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  const [hovered, setHovered] = useState(0);
  const displayValue = hovered || value;

  return (
    <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--mint-50)] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
        Your rating
      </p>
      <div className="mt-3 flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onFocus={() => setHovered(star)}
            onBlur={() => setHovered(0)}
            onClick={() => onChange(star)}
            className="text-4xl leading-none transition hover:scale-110 focus:outline-none"
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
          >
            <span className={star <= displayValue ? "text-yellow-500" : "text-[var(--border)]"}>
              ★
            </span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">
        {value} out of 5 stars
      </p>
    </div>
  );
}

async function updateReviewRequest(
  slug: string,
  reviewId: string,
  payload: { score: number; review?: string },
  token: string,
) {
  const response = await fetch(
    `${API}/api/shops/${encodeURIComponent(slug)}/reviews/${encodeURIComponent(reviewId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || "Could not update review.");
  }

  return data;
}

function addGuestServiceToCart(shop: ShopDetails, item: { name: string; estimate: number; summary: string }) {
  const existing = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || "[]");
  const carts = Array.isArray(existing) ? existing : [];
  const existingCartIndex = carts.findIndex(
    (cart: any) => cart.shop?.slug === shop.slug || cart.shopSlug === shop.slug,
  );

  if (existingCartIndex >= 0) {
    const cart = carts[existingCartIndex];
    const items = Array.isArray(cart.items) ? cart.items : [];
    const existingItemIndex = items.findIndex((cartItem: any) => cartItem.serviceName === item.name);

    if (existingItemIndex >= 0) {
      items[existingItemIndex] = {
        ...items[existingItemIndex],
        quantity: Number(items[existingItemIndex].quantity || 1) + 1,
      };
    } else {
      items.push({
        id: `guest-item-${Date.now()}`,
        cartId: cart.id,
        serviceName: item.name,
        description: item.summary,
        price: item.estimate,
        quantity: 1,
        metadata: { source: "shop-details", shopName: shop.name },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    carts[existingCartIndex] = {
      ...cart,
      items,
      subtotal: items.reduce((sum: number, cartItem: any) => sum + Number(cartItem.price || 0) * Number(cartItem.quantity || 1), 0),
      updatedAt: new Date().toISOString(),
    };
  } else {
    const cartId = `guest-cart-${Date.now()}`;
    carts.push({
      id: cartId,
      userId: "guest",
      shopId: shop.id,
      shopSlug: shop.slug,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      subtotal: item.estimate,
      shop: {
        id: shop.id,
        name: shop.name,
        slug: shop.slug,
        address: shop.address,
        ratingAvg: shop.ratingAvg,
        reviewCount: shop.reviewCount,
      },
      items: [
        {
          id: `guest-item-${Date.now()}`,
          cartId,
          serviceName: item.name,
          description: item.summary,
          price: item.estimate,
          quantity: 1,
          metadata: { source: "shop-details", shopName: shop.name },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });
  }

  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(carts));
  window.dispatchEvent(new Event("meramot-cart-changed"));
}

export default function ShopDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState("");
  const [shop, setShop] = useState<ShopDetails | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [eligibility, setEligibility] = useState<ReviewEligibilityState | null>(null);
  const [score, setScore] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [message, setMessage] = useState("");
  const [cartToast, setCartToast] = useState("");
  const [reviewToast, setReviewToast] = useState("");
  const [addingService, setAddingService] = useState<string | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [pendingCartItem, setPendingCartItem] = useState<PendingCartItem | null>(
  null
);
  const { data: session } = useSession();
  const token = (session?.user as { accessToken?: string } | undefined)?.accessToken;
  const { selectedLocation, saveLocation } = useSelectedLocation(!!session?.user);

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
        }),
      )
      .catch(() => setShop(null));

    getShopReviews(slug).then(setReviews).catch(() => setReviews([]));
  }, [slug]);

  useEffect(() => {
    if (!cartToast) return;
    const timeout = setTimeout(() => setCartToast(""), 2800);
    return () => clearTimeout(timeout);
  }, [cartToast]);

  useEffect(() => {
    if (!reviewToast) return;
    const timeout = setTimeout(() => setReviewToast(""), 2800);
    return () => clearTimeout(timeout);
  }, [reviewToast]);

  useEffect(() => {
    if (!slug || !token) return;

    getReviewEligibility(slug, token)
      .then((result: ReviewEligibilityState) => {
        setEligibility(result);
        if (result.existingReview) {
          setScore(result.existingReview.score);
          setReviewText(result.existingReview.review || "");
        }
      })
      .catch(() =>
        setEligibility({
          eligible: true,
          hasCompletedJob: false,
          hasExistingReview: false,
        }),
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

  const ratingSummary = useMemo(() => {
    if (!reviews.length) return { average: shop?.ratingAvg || 0, counts: [0, 0, 0, 0, 0] };

    const counts = [1, 2, 3, 4, 5].map(
      (star) => reviews.filter((review) => review.score === star).length,
    );
    const average = reviews.reduce((sum, review) => sum + review.score, 0) / reviews.length;
    return { average, counts };
  }, [reviews, shop?.ratingAvg]);

  const existingReview = eligibility?.existingReview || null;
  const isEditingReview = Boolean(existingReview?.canEdit);

  async function refreshReviewsAndEligibility() {
    if (!slug) return;
    const [nextReviews, nextEligibility] = await Promise.all([
      getShopReviews(slug),
      token ? getReviewEligibility(slug, token) : Promise.resolve(null),
    ]);

    setReviews(nextReviews);
    if (nextEligibility) {
      setEligibility(nextEligibility as ReviewEligibilityState);
    }
  }

  async function handleReviewSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token || !shop) return;

    setSubmittingReview(true);
    setMessage("");

    try {
      if (existingReview?.id && existingReview.canEdit) {
        await updateReviewRequest(shop.slug, existingReview.id, { score, review: reviewText }, token);
        setReviewToast("Review updated successfully.");
      } else {
        await createReview(shop.slug, { score, review: reviewText }, token);
        setReviewToast("Review submitted successfully.");
      }

      await refreshReviewsAndEligibility();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save review.");
    } finally {
      setSubmittingReview(false);
    }
  }

  function hasUsableLocation(location: StoredLocation | null) {
    return Boolean(
      location?.address?.trim() ||
        location?.area?.trim() ||
        location?.city?.trim() ||
        (typeof location?.lat === "number" && typeof location?.lng === "number")
    );
  }
  
  function buildCartPayload(item: {
    name: string;
    summary: string;
    estimate: number;
  }): PendingCartItem {
    return {
      shopSlug: shop!.slug,
      serviceName: item.name,
      description: item.summary,
      price: item.estimate,
      quantity: 1,
      metadata: {
        source: "shop-details",
        shopName: shop!.name,
      },
    };
  }
  
  async function addPreparedItemToCart(
    payload: PendingCartItem,
    location: StoredLocation
  ) {
    const payloadWithLocation: PendingCartItem = {
      ...payload,
      metadata: {
        ...payload.metadata,
        pickupLocation: location,
      },
    };
  
    if (token) {
      await addServiceToCart(payloadWithLocation, token);
    } else {
      const key = "meramot.guestCart";
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
  
      const existingShop = existing.find(
        (cart: any) =>
          cart.shop?.slug === shop!.slug || cart.shopSlug === shop!.slug
      );
  
      let updated;
  
      if (existingShop) {
        updated = existing.map((cart: any) => {
          const sameShop =
            cart.shop?.slug === shop!.slug || cart.shopSlug === shop!.slug;
  
          if (!sameShop) return cart;
  
          const items = cart.items || [];
          const existingItem = items.find(
            (cartItem: any) => cartItem.serviceName === payload.serviceName
          );
  
          return {
            ...cart,
            pickupLocation: location,
            items: existingItem
              ? items.map((cartItem: any) =>
                  cartItem.serviceName === payload.serviceName
                    ? {
                        ...cartItem,
                        quantity: Number(cartItem.quantity || 1) + 1,
                        metadata: payloadWithLocation.metadata,
                      }
                    : cartItem
                )
              : [
                  ...items,
                  {
                    id: `guest-item-${Date.now()}`,
                    serviceName: payload.serviceName,
                    description: payload.description,
                    price: payload.price,
                    quantity: 1,
                    metadata: payloadWithLocation.metadata,
                  },
                ],
          };
        });
      } else {
        updated = [
          ...existing,
          {
            id: `guest-cart-${Date.now()}`,
            shopSlug: shop!.slug,
            status: "ACTIVE",
            pickupLocation: location,
            shop: {
              id: shop!.id,
              name: shop!.name,
              slug: shop!.slug,
              address: shop!.address,
              ratingAvg: shop!.ratingAvg,
              reviewCount: shop!.reviewCount,
            },
            items: [
              {
                id: `guest-item-${Date.now()}`,
                serviceName: payload.serviceName,
                description: payload.description,
                price: payload.price,
                quantity: 1,
                metadata: payloadWithLocation.metadata,
              },
            ],
          },
        ];
      }
  
      localStorage.setItem(key, JSON.stringify(updated));
      window.dispatchEvent(new Event("meramot-cart-changed"));
    }
  
    setCartToast(`${payload.serviceName} added to cart.`);
  }
  
  async function handleAddService(item: {
    name: string;
    summary: string;
    estimate: number;
  }) {
    const payload = buildCartPayload(item);
  
    if (!hasUsableLocation(selectedLocation)) {
      setPendingCartItem(payload);
      setCartToast("Choose your pickup location before adding this service.");
      setLocationModalOpen(true);
      return;
    }
  
    try {
      setAddingService(item.name);
      await addPreparedItemToCart(payload, selectedLocation!);
    } catch (error) {
      setCartToast(
        error instanceof Error ? error.message : "Could not add service to cart."
      );
    } finally {
      setAddingService(null);
    }
  }
  
  async function handleLocationConfirm(location: StoredLocation) {
    const savedLocation: StoredLocation = {
      address:
        location.address ||
        (typeof location.lat === "number" && typeof location.lng === "number"
          ? `${location.lat}, ${location.lng}`
          : "Pinned location"),
      city: location.city || "",
      area: location.area || "",
      lat: typeof location.lat === "number" ? location.lat : null,
      lng: typeof location.lng === "number" ? location.lng : null,
      source: location.source || "map",
    };
  
    localStorage.setItem("meramot.selectedLocation", JSON.stringify(savedLocation));
    window.dispatchEvent(
      new CustomEvent("meramot-location-changed", { detail: savedLocation })
    );
  
    setLocationModalOpen(false);
  
    if (!pendingCartItem) return;
  
    try {
      setAddingService(pendingCartItem.serviceName);
      await addPreparedItemToCart(pendingCartItem, savedLocation);
      setPendingCartItem(null);
    } catch (error) {
      setCartToast(
        error instanceof Error ? error.message : "Could not add service to cart."
      );
    } finally {
      setAddingService(null);
    }
  }

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
      <Navbar isLoggedIn={!!session?.user} firstName={session?.user?.name?.split(" ")[0]} />

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
            <Link href="/" className="hover:text-[var(--accent-dark)]">Homepage</Link>
            <span className="mx-2">›</span>
            <Link href="/shops" className="hover:text-[var(--accent-dark)]">Shops</Link>
            <span className="mx-2">›</span>
            <span className="text-[var(--accent-dark)]">{shop.name}</span>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[140px_minmax(0,1fr)_220px] lg:items-start">
            <div className="h-[120px] w-[120px] rounded-[1.5rem] border border-[var(--border)] bg-[var(--mint-100)]" />

            <div>
              <p className="text-sm text-[var(--muted-foreground)]">
                {(shop.specialties?.slice(0, 4) || []).join(" · ") || "Repair services"}
              </p>

              <h1 className="mt-2 text-4xl font-bold tracking-tight text-[var(--foreground)]">
                {shop.name}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--foreground)]">
                <span>⭐ {shop.ratingAvg?.toFixed(1) ?? "0.0"} ({shop.reviewCount ?? 0})</span>
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
              <Link href="/cart" className="inline-flex w-full items-center justify-center rounded-full bg-[var(--accent-dark)] px-5 py-3 text-sm font-semibold text-white">
                Go to cart
              </Link>
              <p className="mt-3 text-center text-xs text-[var(--muted-foreground)]">
                Add one or more services below, then finish checkout in your cart.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:px-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0">
          <div className="mb-4 flex gap-5 overflow-x-auto border-b border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm font-medium text-[var(--muted-foreground)]">
            <span className="border-b-4 border-[var(--accent-dark)] pb-2 text-[var(--foreground)]">Services</span>
            <span className="pb-2">Reviews</span>
          </div>

          <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-3xl font-bold text-[var(--foreground)]">Available services</h2>
              <p className="mt-2 text-[var(--muted-foreground)]">
                Add services to cart first, then choose schedule, payment method, and address during checkout.
              </p>
            </div>

            <div className="space-y-4">
              {serviceItems.map((item) => (
                <article key={item.name} className="flex flex-col gap-4 rounded-[1.5rem] border border-[var(--border)] p-4 transition hover:shadow-sm md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="text-xl font-semibold text-[var(--foreground)]">{item.name}</h3>
                        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{item.summary}</p>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-lg font-bold text-[var(--foreground)]">
                          ৳{item.estimate.toLocaleString("en-BD")}
                        </div>
                        <div className="text-xs text-[var(--muted-foreground)]">starting estimate</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 md:pl-4">
                    <button
                      type="button"
                      onClick={() => void handleAddService(item)}
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
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--muted-foreground)]">
                  Customer reviews
                </p>
                <h2 className="mt-2 text-3xl font-bold text-[var(--foreground)]">
                  What customers are saying
                </h2>
              </div>

              <div className="rounded-[1.5rem] bg-[var(--mint-50)] px-5 py-4 text-right">
                <div className="text-4xl font-black text-[var(--foreground)]">
                  {ratingSummary.average.toFixed(1)}
                </div>
                <StarDisplay value={Math.round(ratingSummary.average)} />
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {reviews.length} review{reviews.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
              <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--mint-50)] p-4">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = ratingSummary.counts[star - 1] || 0;
                  const percentage = reviews.length ? (count / reviews.length) * 100 : 0;

                  return (
                    <div key={star} className="mb-3 flex items-center gap-3 last:mb-0">
                      <span className="w-8 text-sm font-semibold text-[var(--foreground)]">{star} ★</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--mint-200)]">
                        <div className="h-full rounded-full bg-yellow-500" style={{ width: `${percentage}%` }} />
                      </div>
                      <span className="w-6 text-right text-xs text-[var(--muted-foreground)]">{count}</span>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-4">
                {reviews.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-[var(--border)] p-5 text-[var(--muted-foreground)]">
                    No reviews yet.
                  </p>
                )}

                {reviews.map((item) => {
                  const isMine = existingReview?.id === item.id;
                  return (
                    <article key={item.id} className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-[var(--foreground)]">
                              {item.user?.name || item.user?.username || "Customer"}
                            </p>
                            {isMine && (
                              <span className="rounded-full bg-[var(--mint-100)] px-2 py-0.5 text-xs font-semibold text-[var(--accent-dark)]">
                                Your review
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                            {formatDate(item.createdAt)}
                            {item.updatedAt && item.updatedAt !== item.createdAt ? " · edited" : ""}
                          </p>
                        </div>
                        <StarDisplay value={item.score} />
                      </div>

                      {item.review ? (
                        <p className="mt-4 leading-7 text-[var(--muted-foreground)]">{item.review}</p>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        </section>

        {locationModalOpen && (
          <LocationPickerModal
            selectedLocation={selectedLocation}
            onClose={() => {
              setLocationModalOpen(false);
              setPendingCartItem(null);
            }}
            onConfirm={handleLocationConfirm}
          />
        )}

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--muted-foreground)]">
              {isEditingReview ? "Edit your review" : "Write a review"}
            </p>
            <h2 className="mt-2 text-3xl font-bold text-[var(--foreground)]">
              Rate this shop
            </h2>

            {!session?.user && (
              <p className="mt-4 rounded-2xl bg-[var(--mint-50)] p-4 text-sm text-[var(--muted-foreground)]">
                Log in to review this shop.
              </p>
            )}

            {session?.user && eligibility?.hasExistingReview && !existingReview?.canEdit && (
              <p className="mt-4 rounded-2xl bg-[var(--mint-50)] p-4 text-sm text-[var(--muted-foreground)]">
                You already reviewed this shop. The 6-month edit window has expired.
              </p>
            )}

            {session?.user && (!eligibility?.hasExistingReview || existingReview?.canEdit) && (
              <form className="mt-5 space-y-4" onSubmit={handleReviewSubmit}>
                <StarInput value={score} onChange={setScore} />

                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={5}
                  className="w-full rounded-[1.5rem] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent-dark)]"
                  placeholder="Tell others about your experience"
                />

                {existingReview?.canEdit && existingReview.editExpiresAt && (
                  <p className="rounded-2xl bg-[var(--mint-50)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
                    You can edit this review until {formatDate(existingReview.editExpiresAt)}.
                  </p>
                )}

                <button
                  disabled={submittingReview}
                  className="w-full rounded-full bg-[var(--accent-dark)] px-6 py-3 text-sm font-bold text-white transition hover:opacity-95 disabled:opacity-60"
                >
                  {submittingReview
                    ? "Saving..."
                    : isEditingReview
                      ? "Update review"
                      : "Submit review"}
                </button>
              </form>
            )}

            {message && <p className="mt-3 text-sm text-[var(--accent-dark)]">{message}</p>}
          </section>
        </aside>
      </div>
    </main>
  );
}
