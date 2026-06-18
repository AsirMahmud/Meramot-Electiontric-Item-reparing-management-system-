"use client";

import { useEffect, useState, useCallback } from "react";
import type { Cart } from "@/lib/api";
import type { StoredLocation } from "@/components/location/types";

export type GuestCartItem = Cart["items"][number];
export type GuestCart = Cart & {
  shopSlug?: string;
  pickupLocation?: StoredLocation;
};

export const GUEST_CART_STORAGE_KEY = "meramot.guestCart";
const CART_CHANGED_EVENT = "meramot-cart-changed";

export function useGuestCart() {
  const [carts, setCarts] = useState<GuestCart[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadCarts = useCallback(() => {
    try {
      const raw = localStorage.getItem(GUEST_CART_STORAGE_KEY);
      if (!raw) {
        setCarts([]);
        return;
      }

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setCarts(parsed);
      } else {
        setCarts([]);
      }
    } catch {
      localStorage.removeItem(GUEST_CART_STORAGE_KEY);
      setCarts([]);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadCarts();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === GUEST_CART_STORAGE_KEY) {
        loadCarts();
      }
    };

    const handleCustomEvent = () => {
      loadCarts();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(CART_CHANGED_EVENT, handleCustomEvent);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(CART_CHANGED_EVENT, handleCustomEvent);
    };
  }, [loadCarts]);

  const saveCarts = useCallback((nextCarts: GuestCart[]) => {
    localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(nextCarts));
    setCarts(nextCarts);
    window.dispatchEvent(new Event(CART_CHANGED_EVENT));
  }, []);

  const addServiceToCart = useCallback(
    (
      payload: {
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
      },
      shopDetails: {
        id: string;
        name: string;
        address: string;
        ratingAvg: number;
        reviewCount: number;
      }
    ) => {
      setCarts((prevCarts) => {
        const existingCarts = [...prevCarts];
        const existingCartIndex = existingCarts.findIndex(
          (cart) => cart.shopSlug === payload.shopSlug || cart.shop?.slug === payload.shopSlug
        );

        const newItem = {
          id: `guest-item-${Date.now()}`,
          serviceName: payload.serviceName,
          description: payload.description,
          price: payload.price,
          quantity: payload.quantity,
          metadata: payload.metadata,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (existingCartIndex >= 0) {
          const cart = existingCarts[existingCartIndex];
          const items = Array.isArray(cart.items) ? [...cart.items] : [];
          const existingItemIndex = items.findIndex(
            (item) => item.serviceName === payload.serviceName
          );

          if (existingItemIndex >= 0) {
            items[existingItemIndex] = {
              ...items[existingItemIndex],
              quantity: Number(items[existingItemIndex].quantity || 1) + payload.quantity,
              updatedAt: new Date().toISOString(),
              metadata: payload.metadata, // Update location metadata
            };
          } else {
            items.push({ ...newItem, cartId: cart.id });
          }

          existingCarts[existingCartIndex] = {
            ...cart,
            items,
            pickupLocation: payload.metadata.pickupLocation || cart.pickupLocation,
            subtotal: items.reduce(
              (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
              0
            ),
            updatedAt: new Date().toISOString(),
          };
        } else {
          const cartId = `guest-cart-${Date.now()}`;
          existingCarts.push({
            id: cartId,
            userId: "guest",
            shopId: shopDetails.id,
            shopSlug: payload.shopSlug,
            status: "ACTIVE",
            pickupLocation: payload.metadata.pickupLocation,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            subtotal: payload.price * payload.quantity,
            shop: {
              ...shopDetails,
              slug: payload.shopSlug,
            },
            items: [{ ...newItem, cartId }],
          } as GuestCart);
        }

        localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(existingCarts));
        window.dispatchEvent(new Event(CART_CHANGED_EVENT));
        return existingCarts;
      });
    },
    []
  );

  const updateItemQuantity = useCallback((itemId: string, quantity: number) => {
    setCarts((prevCarts) => {
      const nextCarts = prevCarts.map((cart) => {
        const hasItem = cart.items.some((item) => item.id === itemId);
        if (!hasItem) return cart;

        const nextItems = cart.items.map((item) =>
          item.id === itemId ? { ...item, quantity, updatedAt: new Date().toISOString() } : item
        );

        return {
          ...cart,
          items: nextItems,
          subtotal: nextItems.reduce(
            (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
            0
          ),
          updatedAt: new Date().toISOString(),
        };
      });

      localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(nextCarts));
      window.dispatchEvent(new Event(CART_CHANGED_EVENT));
      return nextCarts;
    });
  }, []);

  const removeCartItem = useCallback((itemId: string) => {
    setCarts((prevCarts) => {
      const nextCarts = prevCarts
        .map((cart) => {
          const nextItems = cart.items.filter((item) => item.id !== itemId);
          return {
            ...cart,
            items: nextItems,
            subtotal: nextItems.reduce(
              (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
              0
            ),
            updatedAt: new Date().toISOString(),
          };
        })
        .filter((cart) => cart.items.length > 0);

      localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(nextCarts));
      window.dispatchEvent(new Event(CART_CHANGED_EVENT));
      return nextCarts;
    });
  }, []);

  return {
    carts,
    isLoaded,
    addServiceToCart,
    updateItemQuantity,
    removeCartItem,
  };
}
