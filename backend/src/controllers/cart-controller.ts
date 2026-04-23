import { PaymentMethod, RequestMode, RequestStatus, RepairJobStatus, DeliveryType, DeliveryDirection, DeliveryStatus, CartStatus, PaymentStatus } from "@prisma/client";
import type { Response } from "express";
import prisma from "../models/prisma.js";
import type { AuthedRequest } from "../middleware/auth.js";

function normalizePaymentMethod(method?: string): PaymentMethod {
  if (method === "BKASH") return PaymentMethod.BKASH;
  return PaymentMethod.CASH;
}

function normalizeScheduledAt(input?: string, when?: "NOW" | "LATER") {
  if (when === "NOW") return new Date();

  if (!input) return null;
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export async function getMyActiveCarts(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const carts = await prisma.cart.findMany({
      where: {
        userId,
        status: CartStatus.ACTIVE,
      },
      orderBy: { updatedAt: "desc" },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
            address: true,
            ratingAvg: true,
            reviewCount: true,
          },
        },
        items: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const enriched = carts.map((cart) => {
      const subtotal = cart.items.reduce(
        (sum, item) => sum + Number(item.price) * item.quantity,
        0
      );

      return {
        ...cart,
        subtotal,
      };
    });

    return res.json(enriched);
  } catch (error) {
    console.error("getMyActiveCarts error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function addItemToCart(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const {
      shopSlug,
      serviceName,
      description,
      price,
      quantity,
      metadata,
    } = req.body as {
      shopSlug?: string;
      serviceName?: string;
      description?: string;
      price?: number | string;
      quantity?: number;
      metadata?: unknown;
    };

    if (!shopSlug || !serviceName || price == null) {
      return res.status(400).json({
        message: "shopSlug, serviceName, and price are required",
      });
    }

    const shop = await prisma.shop.findUnique({
      where: { slug: shopSlug.trim() },
      select: { id: true, slug: true, name: true },
    });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const unitPrice = Number(price);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return res.status(400).json({ message: "Valid price is required" });
    }

    const qty = Math.max(1, Number(quantity || 1));

    const cart = await prisma.cart.upsert({
      where: {
        id:
          (
            await prisma.cart.findFirst({
              where: {
                userId,
                shopId: shop.id,
                status: CartStatus.ACTIVE,
              },
              select: { id: true },
            })
          )?.id || "___create___",
      },
      update: {},
      create: {
        userId,
        shopId: shop.id,
        status: CartStatus.ACTIVE,
      },
      select: {
        id: true,
        userId: true,
        shopId: true,
      },
    }).catch(async () => {
      return prisma.cart.create({
        data: {
          userId,
          shopId: shop.id,
          status: CartStatus.ACTIVE,
        },
        select: { id: true, userId: true, shopId: true },
      });
    });

    const existing = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        serviceName: serviceName.trim(),
      },
      select: { id: true, quantity: true },
    });

    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: {
          quantity: existing.quantity + qty,
          price: unitPrice,
          description: description?.trim() || null,
          metadata: metadata ?? undefined,
        },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          serviceName: serviceName.trim(),
          description: description?.trim() || null,
          price: unitPrice,
          quantity: qty,
          metadata: (metadata as object | undefined) ?? undefined,
        },
      });
    }

    const fullCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
            address: true,
            ratingAvg: true,
            reviewCount: true,
          },
        },
        items: true,
      },
    });

    return res.status(201).json({
      message: "Service added to cart",
      cart: {
        ...fullCart,
        subtotal: (fullCart?.items || []).reduce(
          (sum, item) => sum + Number(item.price) * item.quantity,
          0
        ),
      },
    });
  } catch (error) {
    console.error("addItemToCart error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function updateCartItem(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { itemId } = req.params;
    const { quantity } = req.body as { quantity?: number };

    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: {
          select: {
            id: true,
            userId: true,
            status: true,
          },
        },
      },
    });

    if (!item || item.cart.userId !== userId || item.cart.status !== CartStatus.ACTIVE) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    const nextQty = Math.max(1, Number(quantity || 1));

    const updated = await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: nextQty },
    });

    return res.json({ message: "Cart item updated", item: updated });
  } catch (error) {
    console.error("updateCartItem error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function removeCartItem(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { itemId } = req.params;

    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: {
          select: {
            id: true,
            userId: true,
            status: true,
          },
        },
      },
    });

    if (!item || item.cart.userId !== userId || item.cart.status !== CartStatus.ACTIVE) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    await prisma.cartItem.delete({ where: { id: itemId } });

    const remainingCount = await prisma.cartItem.count({
      where: { cartId: item.cart.id },
    });

    if (remainingCount === 0) {
      await prisma.cart.update({
        where: { id: item.cart.id },
        data: { status: CartStatus.ABANDONED },
      });
    }

    return res.json({ message: "Cart item removed" });
  } catch (error) {
    console.error("removeCartItem error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function checkoutCart(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { cartId } = req.params;
    const {
      scheduleType,
      scheduledAt,
      paymentMethod,
      addressMode,
      address,
      city,
      area,
      lat,
      lng,
      deliveryType,
      problemNote,
    } = req.body as {
      scheduleType?: "NOW" | "LATER";
      scheduledAt?: string;
      paymentMethod?: "CASH" | "BKASH";
      addressMode?: "PROFILE" | "MANUAL" | "MAP";
      address?: string;
      city?: string;
      area?: string;
      lat?: number;
      lng?: number;
      deliveryType?: "REGULAR" | "EXPRESS";
      problemNote?: string;
    };

    const cart = await prisma.cart.findFirst({
      where: {
        id: cartId,
        userId,
        status: CartStatus.ACTIVE,
      },
      include: {
        shop: true,
        items: true,
        user: true,
      },
    });

    if (!cart) {
      return res.status(404).json({ message: "Active cart not found" });
    }

    if (!cart.items.length) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const chosenAddress =
      addressMode === "PROFILE"
        ? cart.user.address || address
        : address;

    if (!chosenAddress?.trim()) {
      return res.status(400).json({ message: "Address is required" });
    }

    const pickupTime = normalizeScheduledAt(scheduledAt, scheduleType);
    if (scheduleType === "LATER" && !pickupTime) {
      return res.status(400).json({ message: "Valid scheduledAt is required for later bookings" });
    }

    const subtotal = cart.items.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0
    );

    const serviceLines = cart.items
      .map(
        (item, index) =>
          `${index + 1}. ${item.serviceName} × ${item.quantity} — ৳${Number(item.price).toFixed(2)}`
      )
      .join("\n");

    const title =
      cart.items.length === 1
        ? cart.items[0].serviceName
        : `${cart.items.length} services from ${cart.shop.name}`;

    const created = await prisma.$transaction(async (tx) => {
      if (addressMode === "MANUAL" || addressMode === "MAP") {
        await tx.user.update({
          where: { id: userId },
          data: {
            address: chosenAddress.trim(),
            city: city?.trim() || cart.user.city,
            area: area?.trim() || cart.user.area,
            lat: typeof lat === "number" ? lat : cart.user.lat,
            lng: typeof lng === "number" ? lng : cart.user.lng,
          },
        });
      }

      const request = await tx.repairRequest.create({
        data: {
          userId,
          title,
          description:
            `Direct order cart checkout\n\n` +
            `Schedule: ${scheduleType === "NOW" ? "Now" : pickupTime?.toISOString()}\n` +
            `Payment: ${paymentMethod || "CASH"}\n` +
            `Address: ${chosenAddress.trim()}\n` +
            `City: ${city || cart.user.city || ""}\n` +
            `Area: ${area || cart.user.area || ""}\n\n` +
            `Cart items:\n${serviceLines}`,
          deviceType: "Service Order",
          brand: cart.shop.name,
          model: null,
          issueCategory: "Direct Order",
          problem: problemNote?.trim() || `Direct order services:\n${serviceLines}`,
          imageUrls: [],
          mode: RequestMode.DIRECT_REPAIR,
          preferredPickup: true,
          deliveryType: deliveryType === "EXPRESS" ? DeliveryType.EXPRESS : DeliveryType.REGULAR,
          status: RequestStatus.ASSIGNED,
        },
      });

      const repairJob = await tx.repairJob.create({
        data: {
          repairRequestId: request.id,
          shopId: cart.shopId,
          status: RepairJobStatus.CREATED,
        },
      });

      const delivery = await tx.delivery.create({
        data: {
          repairJobId: repairJob.id,
          direction: DeliveryDirection.TO_SHOP,
          type: deliveryType === "EXPRESS" ? DeliveryType.EXPRESS : DeliveryType.REGULAR,
          status: DeliveryStatus.SCHEDULED,
          pickupAddress: chosenAddress.trim(),
          dropAddress: cart.shop.address,
          scheduledAt: pickupTime,
        },
      });

      const payment = await tx.payment.create({
        data: {
          userId,
          repairRequestId: request.id,
          amount: subtotal,
          currency: "BDT",
          method: normalizePaymentMethod(paymentMethod),
          status: PaymentStatus.PENDING,
        },
      });

      await tx.cart.update({
        where: { id: cart.id },
        data: { status: CartStatus.CHECKED_OUT },
      });

      return { request, repairJob, delivery, payment };
    });

    return res.status(201).json({
      message: "Direct order confirmed",
      order: created,
    });
  } catch (error) {
    console.error("checkoutCart error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}