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
  deleteReview,
  getReviewEligibility,
  getShopBySlug,
  getShopReviews,
  type Shop,
} from "@/lib/api";
import { pushLocalNotification } from "@/lib/notifications";

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
  const [loadingShop, setLoadingShop] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [eligibility, setEligibility] = useState<ReviewEligibilityState | null>(null);
  const [score, setScore] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [message, setMessage] = useState("");
  const [cartToast, setCartToast] = useState("");
  const [reviewToast, setReviewToast] = useState("");
  const [addingService, setAddingService] = useState<string | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [deletingReview, setDeletingReview] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"services" | "reviews">("services");
  const [pendingCartItem, setPendingCartItem] = useState<PendingCartItem | null>(null);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [selectedReviewText, setSelectedReviewText] = useState<string | null>(null);
  const { data: session } = useSession();
  const token = (session?.user as { accessToken?: string } | undefined)?.accessToken;
  const { selectedLocation, saveLocation } = useSelectedLocation(!!session?.user);

  useEffect(() => {
    params.then((value) => setSlug(value.slug));
  }, [params]);

  useEffect(() => {
    if (!slug) return;

    setLoadingShop(true);
    getShopBySlug(slug)
      .then((data) =>
        setShop({
          ...data,
          specialties: data.specialties ?? [],
        }),
      )
      .catch(() => setShop(null))
      .finally(() => setLoadingShop(false));

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

    return items.map((item) => {
      let name = item;
      let estimate = undefined;
      
      if (item.includes("|")) {
        const parts = item.split("|");
        name = parts[0];
        estimate = Number(parts[1]);
      }

      const summaryData = getServiceSummary(name);
      return {
        name,
        summary: summaryData.summary,
        estimate: estimate !== undefined && !isNaN(estimate) ? estimate : summaryData.estimate,
      };
    });
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

    const finalReviewText = reviewText.trim();
    const payload = { 
      score, 
      ...(finalReviewText ? { review: finalReviewText } : {}) 
    };

    try {
      if (existingReview?.id && existingReview.canEdit) {
        await updateReviewRequest(shop.slug, existingReview.id, payload, token);
        setReviewToast("Review updated successfully.");
      } else {
        await createReview(shop.slug, payload, token);
        setReviewToast("Review submitted successfully.");

        pushLocalNotification({
          title: "Review submitted",
          message: "Your review has been posted.",
          type: "review",
        });
      }

      await refreshReviewsAndEligibility();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save review.");
    } finally {
      setSubmittingReview(false);
    }
  }

  async function handleDeleteReview(reviewId: string) {
    if (!token || !shop) return;
    if (!window.confirm("Are you sure you want to delete your review?")) return;

    setDeletingReview(true);
    try {
      await deleteReview(shop.slug, reviewId, token);
      setReviewToast("Review deleted successfully.");
      await refreshReviewsAndEligibility();
      setScore(5);
      setReviewText("");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not delete review.");
    } finally {
      setDeletingReview(false);
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
  
    const msg = `${payload.serviceName} added to cart.`;

    setCartToast(msg);

    pushLocalNotification({
      title: "Added to cart",
      message: msg,
      type: "cart",
      href: "/cart",
    });
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

  if (loadingShop) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <Navbar isLoggedIn={!!session?.user} firstName={session?.user?.name?.split(" ")[0]} />
        <div className="mx-auto max-w-6xl px-4 py-10 text-[var(--foreground)]">
          Loading shop...
        </div>
      </main>
    );
  }

  if (!shop) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <Navbar isLoggedIn={!!session?.user} firstName={session?.user?.name?.split(" ")[0]} />
        <div className="mx-auto max-w-6xl px-4 py-10 text-[var(--foreground)]">
          Shop not found or could not be loaded.
        </div>
      </main>
    );
  }

  const WriteReviewForm = (
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
            className="w-full rounded-full bg-[var(--accent-dark)] px-6 py-3 text-sm font-bold text-[var(--accent-foreground)] transition hover:opacity-95 disabled:opacity-60"
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
  );

  return (
    <main className="min-h-screen bg-[var(--background)] pb-24 lg:pb-0">
      <Navbar isLoggedIn={!!session?.user} firstName={session?.user?.name?.split(" ")[0]} />

      {cartToast && (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-[100] flex justify-center px-4">
          <div className="rounded-2xl bg-[var(--accent-dark)] px-5 py-3 text-sm font-medium text-[var(--accent-foreground)] shadow-xl">
            {cartToast}
          </div>
        </div>
      )}

      {reviewToast && (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-[101] flex justify-center px-4">
          <div className="rounded-2xl bg-[var(--accent-dark)] px-5 py-3 text-sm font-medium text-[var(--accent-foreground)] shadow-xl">
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

          <div className="mt-4 md:mt-5 grid gap-4 md:gap-5 lg:grid-cols-[140px_minmax(0,1fr)_220px] lg:items-start">
            
            <div className="flex items-start gap-4 lg:contents">
              {shop.logoUrl ? (
                <div className="h-20 w-20 lg:h-[120px] lg:w-[120px] shrink-0 overflow-hidden rounded-2xl md:rounded-[1.5rem] border border-[var(--border)] bg-[var(--card)] lg:row-span-2">
                  <img src={shop.logoUrl} alt={shop.name} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-20 w-20 lg:h-[120px] lg:w-[120px] shrink-0 items-center justify-center rounded-2xl md:rounded-[1.5rem] border border-[var(--border)] bg-[var(--mint-100)] dark:bg-[#15201A] lg:row-span-2">
                  <span className="text-3xl md:text-4xl font-bold text-[var(--accent-dark)] opacity-40">
                    {shop.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              <div className="min-w-0 flex-1 lg:col-start-2 lg:row-start-1">
                <p className="text-xs md:text-sm text-[var(--muted-foreground)] truncate">
                  {(shop.specialties?.slice(0, 4) || []).join(" · ") || "Repair services"}
                </p>

                <h1 className="mt-1 text-2xl md:text-4xl font-bold tracking-tight text-[var(--foreground)] leading-tight">
                  {shop.name}
                </h1>

                <div className="mt-1.5 md:mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm text-[var(--foreground)]">
                  <span className="font-medium text-yellow-600 dark:text-yellow-500">⭐ {shop.ratingAvg?.toFixed(1) ?? "0.0"} ({shop.reviewCount ?? 0})</span>
                  <span className="text-[var(--muted-foreground)]">{shop.address}</span>
                </div>
              </div>
            </div>

            <div className="text-sm md:text-base text-[var(--muted-foreground)] lg:col-start-2 lg:row-start-2">
              <p className="line-clamp-3 lg:line-clamp-none">
                {shop.description ||
                  "Professional device repair support with diagnostics, updates, and service handling from this shop."}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium lg:text-sm">
                {shop.phone && <span>📞 {shop.phone}</span>}
                {shop.email && <span>✉️ {shop.email}</span>}
              </div>
            </div>

            <div className="hidden lg:block rounded-2xl md:rounded-[1.5rem] border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm lg:col-start-3 lg:row-span-2">
              <Link href="/cart" className="inline-flex w-full items-center justify-center rounded-full bg-[var(--accent-dark)] px-5 py-3 text-sm font-semibold text-[var(--accent-foreground)] shadow-sm hover:opacity-95 transition">
                Go to cart
              </Link>
              <p className="mt-3 text-center text-xs text-[var(--muted-foreground)]">
                Add one or more services below, then finish checkout in your cart.
              </p>
            </div>
            
            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] lg:hidden">
              <Link href="/cart" className="inline-flex w-full items-center justify-center rounded-full bg-[var(--accent-dark)] px-5 py-3.5 text-[15px] font-bold text-[var(--accent-foreground)] shadow-sm hover:opacity-95 transition">
                Go to cart
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:px-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0">
          <div className="mb-4 md:mb-6 flex overflow-x-auto border-b border-[var(--border)] bg-[var(--card)] text-sm font-medium text-[var(--muted-foreground)] scrollbar-hide">
            <button
              onClick={() => { setActiveTab("services"); setShowAllReviews(false); }}
              className={`px-5 py-3.5 transition ${activeTab === "services" ? "border-b-2 border-[var(--accent-dark)] text-[var(--foreground)]" : "hover:text-[var(--foreground)]"}`}
            >
              Services
            </button>
            <button
              onClick={() => { setActiveTab("reviews"); setShowAllReviews(false); }}
              className={`px-5 py-3.5 transition ${activeTab === "reviews" ? "border-b-2 border-[var(--accent-dark)] text-[var(--foreground)]" : "hover:text-[var(--foreground)]"}`}
            >
              Reviews ({shop.reviewCount ?? 0})
            </button>
          </div>

          {activeTab === "services" ? (
            <section className="rounded-2xl md:rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-4 md:p-5 shadow-sm">
              <div className="mb-4 md:mb-5">
                <h2 className="text-xl md:text-3xl font-bold text-[var(--foreground)]">Available services</h2>
                <p className="mt-1 text-sm md:text-base text-[var(--muted-foreground)]">
                  Add services to cart first, then choose schedule, payment method, and address during checkout.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:block lg:space-y-4">
                {serviceItems.map((item) => (
                  <article
                    key={item.name}
                    className="group flex flex-col justify-between rounded-xl md:rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 transition hover:-translate-y-0.5 hover:shadow-md lg:flex-row lg:items-start lg:justify-between lg:hover:shadow-sm lg:hover:-translate-y-0 lg:p-5"
                  >
                    <div className="lg:flex lg:flex-1 lg:items-start lg:justify-between lg:gap-4">
                      <div className="lg:min-w-0">
                        <h3 className="font-bold text-[var(--foreground)] lg:text-xl lg:font-semibold">{item.name}</h3>
                        <p className="mt-1 text-xs md:text-sm text-[var(--muted-foreground)] lg:mt-2 lg:leading-6">
                          {item.summary}
                        </p>
                        {/* Price on mobile: */}
                        <p className="mt-3 text-lg md:text-xl font-extrabold text-[var(--accent-dark)] lg:hidden">
                          ৳{item.estimate.toLocaleString("en-BD")}
                        </p>
                      </div>
                      
                      {/* Price on desktop: */}
                      <div className="hidden lg:block lg:shrink-0 lg:text-right">
                        <div className="text-lg font-bold text-[var(--foreground)]">
                          ৳{item.estimate.toLocaleString("en-BD")}
                        </div>
                        <div className="text-xs text-[var(--muted-foreground)]">starting estimate</div>
                      </div>
                    </div>
                    
                    <div className="lg:flex lg:items-center lg:gap-3 lg:pl-6 lg:mt-0 lg:self-center">
                      <button
                        type="button"
                        onClick={() => handleAddService(item)}
                        className="mt-4 w-full rounded-full bg-[var(--mint-100)] px-4 py-2 text-sm font-bold text-[var(--accent-dark)] transition hover:bg-[var(--accent-dark)] hover:text-white lg:mt-0 lg:h-11 lg:w-auto lg:inline-flex lg:items-center lg:px-6"
                      >
                        Add to cart
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <section className="space-y-6">
              {showAllReviews ? (
                <div className="mb-6 flex flex-col-reverse items-start justify-between gap-4 border-b border-[var(--border)] pb-4 md:flex-row md:items-center">
                  <button onClick={() => setShowAllReviews(false)} className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-bold text-[var(--foreground)] shadow-sm transition hover:bg-[var(--mint-50)]">
                    <svg className="h-5 w-5 text-[var(--accent-dark)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to shop profile
                  </button>
                  <h2 className="text-2xl font-bold text-[var(--foreground)]">All Reviews</h2>
                </div>
              ) : (
                <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
                  <h2 className="mb-4 text-3xl font-bold text-[var(--foreground)]">Customer reviews</h2>
                  <div className="flex flex-col gap-6 md:flex-row md:items-center">
                    <div className="flex shrink-0 flex-col items-center justify-center md:w-32">
                      <div className="text-5xl font-extrabold tracking-tighter text-[var(--foreground)]">
                        {ratingSummary.average.toFixed(1)}
                      </div>
                      <StarDisplay value={Math.round(ratingSummary.average)} />
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {shop?.reviewCount ?? 0} review{(shop?.reviewCount ?? 0) === 1 ? "" : "s"}
                      </p>
                    </div>

                    <div className="flex-1 space-y-1.5">
                      {[5, 4, 3, 2, 1].map((star, idx) => {
                        const count = ratingSummary.counts[4 - idx] || 0;
                        const total = reviews.length || 1;
                        const percentage = (count / total) * 100;

                        return (
                          <div key={star} className="flex items-center gap-3">
                            <span className="w-12 text-sm font-semibold text-[var(--muted-foreground)]">{star} stars</span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                              <div
                                className="h-full bg-yellow-500"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="w-6 text-right text-xs text-[var(--muted-foreground)]">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {reviews.length === 0 && !showAllReviews && (
                  <p className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm text-[var(--muted-foreground)]">
                    No written reviews.
                  </p>
                )}

                {(showAllReviews ? reviews : reviews.slice(0, 3)).map((item) => {
                  const isMine = existingReview?.id === item.id;
                  return (
                    <article key={item.id} className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-[var(--foreground)]">
                              {item.user?.name || item.user?.username || "Customer"}
                            </p>
                            {isMine && (
                              <div className="flex items-center gap-3">
                                <span className="rounded-full bg-[var(--mint-100)] px-2 py-0.5 text-xs font-semibold text-[var(--accent-dark)]">
                                  Your review
                                </span>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteReview(item.id)}
                                  disabled={deletingReview}
                                  className="text-xs font-medium text-red-500 underline hover:text-red-700 disabled:opacity-50"
                                >
                                  {deletingReview ? "Deleting..." : "Delete"}
                                </button>
                              </div>
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
                        <div
                          className="mt-4 cursor-pointer rounded-xl bg-[var(--mint-50)] p-3 transition hover:bg-[var(--mint-100)] active:scale-[0.99]"
                          onClick={() => setSelectedReviewText(item.review!)}
                        >
                          <p className="line-clamp-3 leading-7 text-[var(--muted-foreground)]">
                            {item.review}
                          </p>
                          <p className="mt-1 text-[11px] font-bold uppercase text-[var(--accent-dark)] opacity-80">
                            Read full review
                          </p>
                        </div>
                      ) : null}
                    </article>
                  );
                })}

                {!showAllReviews && reviews.length > 3 && (
                  <button
                    onClick={() => setShowAllReviews(true)}
                    className="mt-2 w-full rounded-[1.5rem] border-2 border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm font-bold text-[var(--foreground)] transition hover:bg-[var(--mint-50)]"
                  >
                    See all {reviews.length} written reviews
                  </button>
                )}
              </div>

              {!showAllReviews && (
                <div className="xl:hidden pt-2">
                  {WriteReviewForm}
                </div>
              )}
            </section>
          )}
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

        <aside className="hidden xl:block space-y-6 xl:sticky xl:top-6 xl:self-start">
          {WriteReviewForm}
        </aside>
        {selectedReviewText && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setSelectedReviewText(null)}>
            <div className="w-full max-w-md rounded-3xl bg-[var(--background)] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between border-b border-[var(--border)] pb-3">
                <h3 className="text-xl font-bold text-[var(--foreground)]">Review Details</h3>
                <button
                  onClick={() => setSelectedReviewText(null)}
                  className="rounded-full bg-[var(--mint-100)] p-2 text-[var(--accent-dark)] transition hover:bg-[var(--accent-dark)] hover:text-white"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto pr-2">
                <p className="leading-7 text-[var(--foreground)] whitespace-pre-wrap">
                  {selectedReviewText}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
