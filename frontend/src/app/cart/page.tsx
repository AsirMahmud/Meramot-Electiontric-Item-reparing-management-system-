"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "@/components/home/Navbar";
import {
  checkoutCart,
  getMyCarts,
  initSslCommerzPayment,
  removeCartItem,
  updateCartItem,
  type Cart,
} from "@/lib/api";
import { LOCATION_STORAGE_KEY, type StoredLocation } from "@/components/location/types";
import { buildLocationLabel, parseStoredLocation } from "@/components/location/location-utils";

type ScheduleType = "NOW" | "LATER";
type PaymentMethod = "CASH" | "SSLCOMMERZ";
type AddressMode = "PROFILE" | "MANUAL" | "MAP";

type GuestCartItem = Cart["items"][number];
type GuestCart = Cart;

const GUEST_CART_STORAGE_KEY = "meramot.guestCart";
const REGULAR_DELIVERY_FEE = 80;
const EXPRESS_DELIVERY_FEE = 150;
const SERVICE_CHARGE_RATE = 0.05;
const MIN_SERVICE_CHARGE = 30;

function formatMoney(value: number) {
  return `৳${value.toLocaleString("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function cardClass(selected: boolean) {
  return selected
    ? "border-[var(--accent-dark)] bg-[var(--mint-50)] shadow-[0_18px_45px_rgba(67,100,64,0.12)]"
    : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent-dark)]/50 hover:bg-[var(--mint-50)]/40";
}

function readGuestCarts(): GuestCart[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(GUEST_CART_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem(GUEST_CART_STORAGE_KEY);
    return [];
  }
}

function writeGuestCarts(carts: GuestCart[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(carts));
  window.dispatchEvent(new Event("meramot-cart-changed"));
}

function getLocationAddress(location: StoredLocation | null) {
  return {
    address: location?.address?.trim() || "",
    city: location?.city?.trim() || "",
    area: location?.area?.trim() || "",
    lat: typeof location?.lat === "number" ? location.lat : undefined,
    lng: typeof location?.lng === "number" ? location.lng : undefined,
  };
}

export default function CartPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const token = (session?.user as { accessToken?: string } | undefined)
    ?.accessToken;
  const isLoggedIn = !!token;

  const [carts, setCarts] = useState<Cart[]>([]);
  const [message, setMessage] = useState("Loading cart...");
  const [busy, setBusy] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<StoredLocation | null>(null);

  const [scheduleType, setScheduleType] = useState<ScheduleType>("NOW");
  const [scheduledAt, setScheduledAt] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("SSLCOMMERZ");
  const [deliveryType, setDeliveryType] = useState<"REGULAR" | "EXPRESS">("REGULAR");
  const [addressMode, setAddressMode] = useState<AddressMode>("MANUAL");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [problemNote, setProblemNote] = useState("");

  function applySelectedLocation(location: StoredLocation | null) {
    setSelectedLocation(location);

    if (!location) return;

    const normalized = getLocationAddress(location);
    setAddressMode("MAP");
    setAddress(normalized.address);
    setCity(normalized.city);
    setArea(normalized.area);
    setLat(normalized.lat);
    setLng(normalized.lng);
  }

  async function loadCart() {
    if (!isLoggedIn || !token) {
      const guestCarts = readGuestCarts();
      setCarts(guestCarts);
      setMessage(guestCarts.length ? "" : "Your cart is empty.");
      return;
    }

    try {
      const data = await getMyCarts(token);
      setCarts(data);
      setMessage(data.length ? "" : "Your cart is empty.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load cart.");
    }
  }

  useEffect(() => {
    void loadCart();
  }, [token]);

  useEffect(() => {
    applySelectedLocation(parseStoredLocation());

    function handleLocationChange(event: Event) {
      const customEvent = event as CustomEvent<StoredLocation>;
      applySelectedLocation(customEvent.detail || parseStoredLocation());
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === LOCATION_STORAGE_KEY) {
        applySelectedLocation(parseStoredLocation());
      }
    }

    window.addEventListener("meramot-location-changed", handleLocationChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("meramot-location-changed", handleLocationChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const primaryCart = carts[0] || null;

  const subtotal = useMemo(() => {
    if (!primaryCart) return 0;
    return primaryCart.items.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0,
    );
  }, [primaryCart]);

  const itemCount = useMemo(() => {
    if (!primaryCart) return 0;
    return primaryCart.items.reduce((sum, item) => sum + item.quantity, 0);
  }, [primaryCart]);

  const serviceCharge = useMemo(() => {
    if (!primaryCart || subtotal <= 0) return 0;
    return Math.max(MIN_SERVICE_CHARGE, Math.round(subtotal * SERVICE_CHARGE_RATE));
  }, [primaryCart, subtotal]);

  const deliveryFee = useMemo(() => {
    if (!primaryCart) return 0;
    return deliveryType === "EXPRESS" ? EXPRESS_DELIVERY_FEE : REGULAR_DELIVERY_FEE;
  }, [primaryCart, deliveryType]);

  const total = subtotal + serviceCharge + deliveryFee;
  const shopRating = primaryCart?.shop.ratingAvg
    ? Number(primaryCart.shop.ratingAvg).toFixed(1)
    : "0.0";
  const locationLabel = buildLocationLabel(selectedLocation);

  function updateGuestItemQuantity(itemId: string, quantity: number) {
    const nextCarts = carts.map((cart) => ({
      ...cart,
      items: cart.items.map((item) =>
        item.id === itemId ? { ...item, quantity, updatedAt: new Date().toISOString() } : item,
      ),
    }));

    setCarts(nextCarts);
    writeGuestCarts(nextCarts);
  }

  function removeGuestItem(itemId: string) {
    const nextCarts = carts
      .map((cart) => ({
        ...cart,
        items: cart.items.filter((item) => item.id !== itemId),
      }))
      .filter((cart) => cart.items.length > 0);

    setCarts(nextCarts);
    writeGuestCarts(nextCarts);
    setMessage(nextCarts.length ? "" : "Your cart is empty.");
  }

  async function handleQuantityChange(item: GuestCartItem, quantity: number) {
    if (!primaryCart) return;

    if (!isLoggedIn || !token) {
      updateGuestItemQuantity(item.id, quantity);
      return;
    }

    setBusy(true);
    try {
      await updateCartItem(item.id, quantity, token);
      await loadCart();
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveItem(item: GuestCartItem) {
    if (!primaryCart) return;

    if (!isLoggedIn || !token) {
      removeGuestItem(item.id);
      return;
    }

    setBusy(true);
    try {
      await removeCartItem(item.id, token);
      await loadCart();
    } finally {
      setBusy(false);
    }
  }

  async function useSavedMapLocation() {
    const storedLocation = parseStoredLocation();

    if (!storedLocation) {
      setMessage("Choose your location from the navbar first, then return to cart.");
      return;
    }

    applySelectedLocation(storedLocation);
    setMessage("Map location attached to this order.");
  }

  async function handleConfirmOrder() {
    if (!primaryCart) return;

    if (!isLoggedIn || !token) {
      setMessage("Please sign in before confirming the order. Your guest cart will stay saved here.");
      router.push("/login?redirect=/cart");
      return;
    }

    if (scheduleType === "LATER" && !scheduledAt) {
      setMessage("Choose a pickup date and time before confirming.");
      return;
    }

    if (!address.trim() && addressMode !== "PROFILE") {
      setMessage("Please add a pickup address before confirming. Use the saved map location or manual address below.");
      return;
    }

    try {
      setBusy(true);
      setMessage("");

      const checkoutResponse = (await checkoutCart(
        primaryCart.id,
        {
          scheduleType,
          scheduledAt: scheduleType === "LATER" ? scheduledAt : undefined,
          paymentMethod,
          addressMode,
          address,
          city,
          area,
          lat,
          lng,
          deliveryType,
          problemNote,
        },
        token,
      )) as {
        order?: {
          request?: { id?: string };
        };
      };

      const repairRequestId = checkoutResponse?.order?.request?.id;

      if (paymentMethod === "SSLCOMMERZ") {
        const paymentResponse = await initSslCommerzPayment(
          {
            amount: total,
            currency: "BDT",
            productName:
              primaryCart.items.length === 1
                ? primaryCart.items[0].serviceName
                : `${primaryCart.items.length} repair services from ${primaryCart.shop.name}`,
            ...(repairRequestId ? { repairRequestId } : {}),
          },
          token,
        );

        const gatewayUrl = paymentResponse?.data?.gatewayUrl;
        if (!gatewayUrl) {
          throw new Error("SSLCommerz did not return a payment gateway URL.");
        }

        window.location.href = gatewayUrl;
        return;
      }

      router.push("/orders");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not confirm order.");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Navbar
        isLoggedIn={!!session?.user}
        firstName={session?.user?.name?.split(" ")[0]}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <section className="overflow-hidden rounded-[2.5rem] border border-[var(--border)] bg-gradient-to-br from-[var(--mint-50)] via-[var(--card)] to-[var(--background)] p-6 shadow-[0_24px_70px_rgba(67,100,64,0.14)] md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                Service checkout
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-[var(--foreground)] md:text-5xl">
                Review your cart
              </h1>
              <p className="mt-3 max-w-2xl text-base text-[var(--muted-foreground)]">
                Confirm the services, pickup details, and payment method before the repair shop receives your order.
              </p>
            </div>

            <div className="grid grid-cols-3 overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--card)] shadow-sm">
              <div className="px-5 py-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Items</p>
                <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">{itemCount}</p>
              </div>
              <div className="border-x border-[var(--border)] px-5 py-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Shop</p>
                <p className="mt-1 max-w-[130px] truncate text-sm font-bold text-[var(--foreground)]">
                  {primaryCart?.shop.name || "—"}
                </p>
              </div>
              <div className="px-5 py-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Total</p>
                <p className="mt-1 text-2xl font-bold text-[var(--accent-dark)]">{formatMoney(total)}</p>
              </div>
            </div>
          </div>
        </section>

        {message ? (
          <div
            className={`mt-6 rounded-[1.6rem] border px-5 py-4 text-sm font-semibold shadow-sm ${
              message.toLowerCase().includes("failed") ||
              message.toLowerCase().includes("required") ||
              message.toLowerCase().includes("please") ||
              message.toLowerCase().includes("could not") ||
              message.toLowerCase().includes("sign in")
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]"
            }`}
          >
            {message}
          </div>
        ) : null}

        {primaryCart ? (
          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
            <section className="space-y-6">
              <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                      Ordering from
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-[var(--foreground)]">
                      {primaryCart.shop.name}
                    </h2>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                      {primaryCart.shop.address}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-[var(--mint-50)] px-4 py-2 text-sm font-semibold text-[var(--accent-dark)]">
                      ⭐ {shopRating} · {primaryCart.shop.reviewCount} reviews
                    </span>
                    <span className="rounded-full bg-[var(--mint-100)] px-4 py-2 text-sm font-semibold text-[var(--accent-dark)]">
                      {isLoggedIn ? "Direct repair order" : "Guest cart"}
                    </span>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {primaryCart.items.map((item) => {
                    const lineTotal = Number(item.price) * item.quantity;

                    return (
                      <article
                        key={item.id}
                        className="rounded-[1.7rem] border border-[var(--border)] bg-[var(--background)] p-4 transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--mint-100)] text-lg">
                                🛠️
                              </div>
                              <div className="min-w-0">
                                <h3 className="truncate text-lg font-bold text-[var(--foreground)]">
                                  {item.serviceName}
                                </h3>
                                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                                  {formatMoney(Number(item.price))} each · {formatMoney(lineTotal)} total
                                </p>
                              </div>
                            </div>

                            {item.description ? (
                              <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
                                {item.description}
                              </p>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 md:justify-end">
                            <select
                              value={item.quantity}
                              disabled={busy}
                              onChange={(e) => void handleQuantityChange(item, Number(e.target.value))}
                              className="rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] outline-none"
                            >
                              {[1, 2, 3, 4, 5].map((qty) => (
                                <option key={qty} value={qty}>
                                  Qty {qty}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleRemoveItem(item)}
                              className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm md:p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--mint-100)] text-lg">⏱️</span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Step 1</p>
                      <h2 className="text-2xl font-bold text-[var(--foreground)]">Schedule</h2>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setScheduleType("NOW")}
                      className={`rounded-[1.5rem] border px-4 py-4 text-left transition ${cardClass(scheduleType === "NOW")}`}
                    >
                      <div className="font-bold text-[var(--foreground)]">ASAP pickup</div>
                      <div className="mt-1 text-sm text-[var(--muted-foreground)]">Book the soonest slot.</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setScheduleType("LATER")}
                      className={`rounded-[1.5rem] border px-4 py-4 text-left transition ${cardClass(scheduleType === "LATER")}`}
                    >
                      <div className="font-bold text-[var(--foreground)]">Schedule later</div>
                      <div className="mt-1 text-sm text-[var(--muted-foreground)]">Pick a specific time.</div>
                    </button>
                  </div>

                  {scheduleType === "LATER" ? (
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="mt-4 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-[var(--foreground)] outline-none focus:border-[var(--accent-dark)]"
                    />
                  ) : null}

                  <div className="mt-5 border-t border-[var(--border)] pt-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                      Delivery speed
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setDeliveryType("REGULAR")}
                        className={`rounded-[1.35rem] border px-4 py-3 text-left transition ${cardClass(deliveryType === "REGULAR")}`}
                      >
                        <div className="font-bold text-[var(--foreground)]">Regular delivery</div>
                        <div className="mt-1 text-sm text-[var(--muted-foreground)]">{formatMoney(REGULAR_DELIVERY_FEE)} courier fee</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeliveryType("EXPRESS")}
                        className={`rounded-[1.35rem] border px-4 py-3 text-left transition ${cardClass(deliveryType === "EXPRESS")}`}
                      >
                        <div className="font-bold text-[var(--foreground)]">Express delivery</div>
                        <div className="mt-1 text-sm text-[var(--muted-foreground)]">{formatMoney(EXPRESS_DELIVERY_FEE)} courier fee</div>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm md:p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--mint-100)] text-lg">💳</span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Step 2</p>
                      <h2 className="text-2xl font-bold text-[var(--foreground)]">Payment</h2>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("SSLCOMMERZ")}
                      className={`rounded-[1.5rem] border px-4 py-4 text-left transition ${cardClass(paymentMethod === "SSLCOMMERZ")}`}
                    >
                      <div className="font-bold text-[var(--foreground)]">SSLCommerz</div>
                      <div className="mt-1 text-sm text-[var(--muted-foreground)]">Pay securely online.</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("CASH")}
                      className={`rounded-[1.5rem] border px-4 py-4 text-left transition ${cardClass(paymentMethod === "CASH")}`}
                    >
                      <div className="font-bold text-[var(--foreground)]">Cash</div>
                      <div className="mt-1 text-sm text-[var(--muted-foreground)]">Pay after service confirmation.</div>
                    </button>
                  </div>

                  {!isLoggedIn ? (
                    <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                      You can review and edit this cart as a guest. Sign in before final confirmation so we can create the repair order.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--mint-100)] text-lg">📍</span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Step 3</p>
                      <h2 className="text-2xl font-bold text-[var(--foreground)]">Pickup location</h2>
                    </div>
                  </div>

                  {selectedLocation ? (
                    <div className="rounded-full bg-[var(--mint-100)] px-4 py-2 text-sm font-semibold text-[var(--accent-dark)]">
                      {locationLabel}
                    </div>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => {
                      setAddressMode("MAP");
                      void useSavedMapLocation();
                    }}
                    className={`rounded-[1.35rem] border px-4 py-3 text-left transition ${cardClass(addressMode === "MAP")}`}
                  >
                    <div className="font-bold text-[var(--foreground)]">Use map location</div>
                    <div className="mt-1 text-sm text-[var(--muted-foreground)]">
                      Pulls from the navbar picker.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAddressMode("MANUAL")}
                    className={`rounded-[1.35rem] border px-4 py-3 text-left transition ${cardClass(addressMode === "MANUAL")}`}
                  >
                    <div className="font-bold text-[var(--foreground)]">Manual address</div>
                    <div className="mt-1 text-sm text-[var(--muted-foreground)]">Type a pickup address.</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAddressMode("PROFILE")}
                    className={`rounded-[1.35rem] border px-4 py-3 text-left transition ${cardClass(addressMode === "PROFILE")}`}
                  >
                    <div className="font-bold text-[var(--foreground)]">Profile address</div>
                    <div className="mt-1 text-sm text-[var(--muted-foreground)]">Use saved account info.</div>
                  </button>
                </div>

                {selectedLocation ? (
                  <div className="mt-4 rounded-[1.4rem] border border-[var(--border)] bg-[var(--mint-50)] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                      Selected from map
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-[var(--foreground)]">
                      {selectedLocation.address || locationLabel}
                    </p>
                    {(selectedLocation.area || selectedLocation.city) && (
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                        {[selectedLocation.area, selectedLocation.city].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 rounded-[1.4rem] border border-dashed border-[var(--border)] bg-[var(--background)] p-4 text-sm font-semibold text-[var(--muted-foreground)]">
                    No map location selected yet. Use the location button in the navbar to pin one.
                  </div>
                )}

                {addressMode !== "PROFILE" ? (
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <label className="md:col-span-2">
                      <span className="text-sm font-semibold text-[var(--foreground)]">Pickup address</span>
                      <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        rows={3}
                        placeholder="House, road, block, landmark"
                        className="mt-2 w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent-dark)]"
                      />
                    </label>

                    <label>
                      <span className="text-sm font-semibold text-[var(--foreground)]">City</span>
                      <input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Dhaka"
                        className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent-dark)]"
                      />
                    </label>

                    <label>
                      <span className="text-sm font-semibold text-[var(--foreground)]">Area</span>
                      <input
                        value={area}
                        onChange={(e) => setArea(e.target.value)}
                        placeholder="Banani, Dhanmondi, Mirpur..."
                        className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent-dark)]"
                      />
                    </label>
                  </div>
                ) : (
                  <p className="mt-5 rounded-2xl bg-[var(--mint-50)] px-4 py-3 text-sm font-semibold text-[var(--muted-foreground)]">
                    We will use the address saved in your profile. Use map/manual mode if this order needs a different pickup point.
                  </p>
                )}

                <label className="mt-5 block">
                  <span className="text-sm font-semibold text-[var(--foreground)]">Problem note</span>
                  <textarea
                    value={problemNote}
                    onChange={(e) => setProblemNote(e.target.value)}
                    rows={3}
                    placeholder="Optional: describe the issue, pickup instruction, or fragile device notes."
                    className="mt-2 w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent-dark)]"
                  />
                </label>
              </div>
            </section>

            <aside className="h-fit rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[0_18px_50px_rgba(67,100,64,0.12)] md:p-6 xl:sticky xl:top-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                Order summary
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[var(--foreground)]">Ready to book?</h2>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--muted-foreground)]">Shop</span>
                  <span className="max-w-[190px] truncate font-semibold text-[var(--foreground)]">{primaryCart.shop.name}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--muted-foreground)]">Services</span>
                  <span className="font-semibold text-[var(--foreground)]">{primaryCart.items.length}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--muted-foreground)]">Items</span>
                  <span className="font-semibold text-[var(--foreground)]">{itemCount}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--muted-foreground)]">Pickup</span>
                  <span className="font-semibold text-[var(--foreground)]">
                    {scheduleType === "NOW" ? "ASAP" : scheduledAt || "Not selected"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--muted-foreground)]">Location</span>
                  <span className="max-w-[190px] truncate font-semibold text-[var(--foreground)]">
                    {addressMode === "PROFILE" ? "Profile address" : address || locationLabel}
                  </span>
                </div>
              </div>

              <div className="my-5 border-t border-[var(--border)]" />

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted-foreground)]">Subtotal</span>
                  <span className="font-semibold text-[var(--foreground)]">{formatMoney(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted-foreground)]">Service charge</span>
                  <span className="font-semibold text-[var(--foreground)]">{formatMoney(serviceCharge)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted-foreground)]">
                    {deliveryType === "EXPRESS" ? "Express delivery" : "Regular delivery"}
                  </span>
                  <span className="font-semibold text-[var(--foreground)]">{formatMoney(deliveryFee)}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-[var(--mint-100)] px-4 py-3">
                  <span className="font-bold text-[var(--foreground)]">Total</span>
                  <span className="text-xl font-black text-[var(--accent-dark)]">{formatMoney(total)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleConfirmOrder}
                disabled={busy}
                className="mt-6 w-full rounded-full bg-[var(--accent-dark)] px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
              >
                {busy
                  ? "Processing..."
                  : !isLoggedIn
                    ? "Sign in to confirm order"
                    : paymentMethod === "SSLCOMMERZ"
                      ? "Confirm & pay with SSLCommerz"
                      : "Confirm with cash"}
              </button>

              {!isLoggedIn ? (
                <p className="mt-3 text-center text-xs leading-5 text-[var(--muted-foreground)]">
                  You can keep editing this cart as a guest. Final order creation needs login.
                </p>
              ) : null}
            </aside>
          </div>
        ) : (
          <div className="mt-6 rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-10 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--mint-100)] text-3xl">
              🛒
            </div>
            <h2 className="mt-4 text-2xl font-bold text-[var(--foreground)]">Your cart is empty</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted-foreground)]">
              Add repair services from a shop page, then come back here to review pickup, location, and payment details.
            </p>
            <button
              type="button"
              onClick={() => router.push("/shops")}
              className="mt-6 rounded-full bg-[var(--accent-dark)] px-6 py-3 text-sm font-bold text-white transition hover:opacity-95"
            >
              Browse shops
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
