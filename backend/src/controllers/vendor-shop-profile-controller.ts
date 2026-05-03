import { Response } from "express";
import { prisma } from "../lib/prisma.js";
import { suggestVendorServices } from "../services/ai-feature-service.js";
import { AuthedRequest } from "../middleware/require-auth.js";
import { isHttpError } from "../lib/errors.js";

async function getVendorContext(userId: string) {
  const application = await prisma.vendorApplication.findUnique({
    where: { userId },
  });

  if (!application) {
    throw Object.assign(new Error("Vendor application not found"), { statusCode: 404 });
  }

  if (application.status !== "APPROVED") {
    throw Object.assign(new Error("Vendor application is not approved"), { statusCode: 403 });
  }

  const shop = await prisma.shop.findFirst({
    where: { ownerId: userId },
  });

  if (!shop) {
    throw Object.assign(new Error("Shop not found"), { statusCode: 404 });
  }

  return { application, shop };
}

export async function getVendorShopProfile(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Authentication required" });

    const { shop } = await getVendorContext(userId);

    const services = await prisma.shopService.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: "desc" },
    });

    const spareParts = await prisma.sparePart.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: "desc" },
    });

    const aiSuggestions = await prisma.aiServiceSuggestion.findMany({
      where: { shopId: shop.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      shop,
      services,
      spareParts,
      aiSuggestions,
    });
  } catch (error) {
    console.error("getVendorShopProfile error:", error);
    if (isHttpError(error)) return res.status(error.statusCode).json({ message: error.message });
    return res.status(500).json({ message: "Server error" });
  }
}

export async function addVendorService(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Authentication required" });

    const { shop } = await getVendorContext(userId);

    const { name, shortDescription, deviceType, issueCategory, pricingType, basePrice, estimatedDaysMin, estimatedDaysMax } = req.body;
    
    // Auto-generate slug
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 8)}`;

    const service = await prisma.shopService.create({
      data: {
        shopId: shop.id,
        name,
        slug,
        shortDescription,
        deviceType,
        issueCategory,
        pricingType: pricingType || "INSPECTION_REQUIRED",
        basePrice: basePrice ? Number(basePrice) : null,
        estimatedDaysMin: estimatedDaysMin ? Number(estimatedDaysMin) : null,
        estimatedDaysMax: estimatedDaysMax ? Number(estimatedDaysMax) : null,
        isActive: true,
      },
    });

    // If adding a service, auto-add IN_SHOP_REPAIR if not present
    if (!shop.categories.includes("IN_SHOP_REPAIR")) {
      await prisma.shop.update({
        where: { id: shop.id },
        data: { categories: { push: "IN_SHOP_REPAIR" } }
      });
    }

    return res.status(201).json({ message: "Service added successfully", service });
  } catch (error) {
    console.error("addVendorService error:", error);
    if (isHttpError(error)) return res.status(error.statusCode).json({ message: error.message });
    return res.status(500).json({ message: "Server error" });
  }
}

export async function removeVendorService(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Authentication required" });

    const { shop } = await getVendorContext(userId);
    const serviceId = req.params.serviceId;

    const existing = await prisma.shopService.findFirst({
      where: { id: serviceId, shopId: shop.id },
    });

    if (!existing) return res.status(404).json({ message: "Service not found" });

    await prisma.shopService.delete({ where: { id: serviceId } });

    return res.json({ message: "Service removed successfully" });
  } catch (error) {
    console.error("removeVendorService error:", error);
    if (isHttpError(error)) return res.status(error.statusCode).json({ message: error.message });
    return res.status(500).json({ message: "Server error" });
  }
}

export async function addVendorSparePart(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Authentication required" });

    const { shop } = await getVendorContext(userId);

    const { name, description, deviceType, brand, basePrice, inStock } = req.body;

    const sparePart = await prisma.sparePart.create({
      data: {
        shopId: shop.id,
        name,
        description,
        deviceType,
        brand,
        basePrice: basePrice ? Number(basePrice) : null,
        inStock: typeof inStock === "boolean" ? inStock : true,
        isActive: true,
      },
    });

    // Auto-add SPARE_PARTS if not present
    if (!shop.categories.includes("SPARE_PARTS")) {
      await prisma.shop.update({
        where: { id: shop.id },
        data: { categories: { push: "SPARE_PARTS" } }
      });
    }

    return res.status(201).json({ message: "Spare part added successfully", sparePart });
  } catch (error) {
    console.error("addVendorSparePart error:", error);
    if (isHttpError(error)) return res.status(error.statusCode).json({ message: error.message });
    return res.status(500).json({ message: "Server error" });
  }
}

export async function updateVendorSparePart(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Authentication required" });

    const { shop } = await getVendorContext(userId);
    const sparePartId = req.params.sparePartId;

    const existing = await prisma.sparePart.findFirst({
      where: { id: sparePartId, shopId: shop.id },
    });

    if (!existing) return res.status(404).json({ message: "Spare part not found" });

    const { name, description, deviceType, brand, basePrice, inStock } = req.body;

    const sparePart = await prisma.sparePart.update({
      where: { id: sparePartId },
      data: {
        name,
        description,
        deviceType,
        brand,
        basePrice: basePrice !== undefined ? (basePrice ? Number(basePrice) : null) : undefined,
        inStock: typeof inStock === "boolean" ? inStock : undefined,
      },
    });

    return res.json({ message: "Spare part updated successfully", sparePart });
  } catch (error) {
    console.error("updateVendorSparePart error:", error);
    if (isHttpError(error)) return res.status(error.statusCode).json({ message: error.message });
    return res.status(500).json({ message: "Server error" });
  }
}

export async function removeVendorSparePart(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Authentication required" });

    const { shop } = await getVendorContext(userId);
    const sparePartId = req.params.sparePartId;

    const existing = await prisma.sparePart.findFirst({
      where: { id: sparePartId, shopId: shop.id },
    });

    if (!existing) return res.status(404).json({ message: "Spare part not found" });

    await prisma.sparePart.delete({ where: { id: sparePartId } });

    return res.json({ message: "Spare part removed successfully" });
  } catch (error) {
    console.error("removeVendorSparePart error:", error);
    if (isHttpError(error)) return res.status(error.statusCode).json({ message: error.message });
    return res.status(500).json({ message: "Server error" });
  }
}

export async function updateAiPreferences(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Authentication required" });

    const { shop } = await getVendorContext(userId);
    const { aiSuggestionsEnabled, aiSuggestionFrequency } = req.body;

    await prisma.shop.update({
      where: { id: shop.id },
      data: {
        aiSuggestionsEnabled: typeof aiSuggestionsEnabled === "boolean" ? aiSuggestionsEnabled : undefined,
        aiSuggestionFrequency: typeof aiSuggestionFrequency === "string" ? aiSuggestionFrequency : undefined,
      },
    });

    return res.json({ message: "AI preferences updated successfully" });
  } catch (error) {
    console.error("updateAiPreferences error:", error);
    if (isHttpError(error)) return res.status(error.statusCode).json({ message: error.message });
    return res.status(500).json({ message: "Server error" });
  }
}

export async function acceptAiServiceSuggestion(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Authentication required" });

    const { shop } = await getVendorContext(userId);
    const suggestionId = req.params.suggestionId;

    const suggestion = await prisma.aiServiceSuggestion.findFirst({
      where: { id: suggestionId, shopId: shop.id, status: "PENDING" },
    });

    if (!suggestion) return res.status(404).json({ message: "Pending suggestion not found" });

    // Accept it - create a shop service
    const baseSlug = suggestion.suggestedName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 8)}`;

    const result = await prisma.$transaction(async (tx) => {
      const service = await tx.shopService.create({
        data: {
          shopId: shop.id,
          name: suggestion.suggestedName,
          slug,
          shortDescription: suggestion.suggestedDesc,
          deviceType: suggestion.deviceType,
          issueCategory: suggestion.issueCategory,
          pricingType: "INSPECTION_REQUIRED",
          basePrice: suggestion.suggestedPrice || null,
          isActive: true,
        },
      });

      await tx.aiServiceSuggestion.update({
        where: { id: suggestion.id },
        data: { status: "ACCEPTED" },
      });

      return service;
    });

    if (!shop.categories.includes("IN_SHOP_REPAIR")) {
      await prisma.shop.update({
        where: { id: shop.id },
        data: { categories: { push: "IN_SHOP_REPAIR" } }
      });
    }

    return res.json({ message: "Suggestion accepted and service created", service: result });
  } catch (error) {
    console.error("acceptAiServiceSuggestion error:", error);
    if (isHttpError(error)) return res.status(error.statusCode).json({ message: error.message });
    return res.status(500).json({ message: "Server error" });
  }
}

export async function rejectAiServiceSuggestion(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Authentication required" });

    const { shop } = await getVendorContext(userId);
    const suggestionId = req.params.suggestionId;

    const suggestion = await prisma.aiServiceSuggestion.findFirst({
      where: { id: suggestionId, shopId: shop.id, status: "PENDING" },
    });

    if (!suggestion) return res.status(404).json({ message: "Pending suggestion not found" });

    await prisma.aiServiceSuggestion.update({
      where: { id: suggestion.id },
      data: { status: "DISMISSED" },
    });

    return res.json({ message: "Suggestion dismissed" });
  } catch (error) {
    console.error("rejectAiServiceSuggestion error:", error);
    if (isHttpError(error)) return res.status(error.statusCode).json({ message: error.message });
    return res.status(500).json({ message: "Server error" });
  }
}

export async function getAiServiceSuggestions(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Authentication required" });

    const { shop } = await getVendorContext(userId);

    if (!shop.aiSuggestionsEnabled) {
      return res.status(400).json({ message: "AI suggestions are disabled for this shop" });
    }

    const services = await prisma.shopService.findMany({
      where: { shopId: shop.id },
      select: { name: true },
    });
    const existingServiceNames = services.map(s => s.name);

    const aiResponse = await suggestVendorServices({
      specialties: shop.specialties,
      existingServiceNames,
    });

    if (!aiResponse.ok || !aiResponse.suggestions || aiResponse.suggestions.length === 0) {
      return res.json({ message: "No new suggestions right now", suggestions: [] });
    }

    const createdSuggestions = [];
    for (const sug of aiResponse.suggestions) {
      // Avoid duplicate AI suggestions for the same deviceType+issueCategory
      const existing = await prisma.aiServiceSuggestion.findUnique({
        where: {
          shopId_deviceType_issueCategory: {
            shopId: shop.id,
            deviceType: sug.deviceType,
            issueCategory: sug.issueCategory,
          }
        }
      });

      if (!existing) {
        const created = await prisma.aiServiceSuggestion.create({
          data: {
            shopId: shop.id,
            deviceType: sug.deviceType,
            issueCategory: sug.issueCategory,
            suggestedName: sug.suggestedName,
            suggestedDesc: sug.suggestedDesc,
            suggestedPrice: sug.suggestedPrice || null,
            status: "PENDING",
          }
        });
        createdSuggestions.push(created);
      }
    }

    await prisma.shop.update({
      where: { id: shop.id },
      data: { lastAiSuggestionPingAt: new Date() }
    });

    return res.json({
      message: "AI suggestions generated successfully",
      suggestions: createdSuggestions
    });

  } catch (error) {
    console.error("getAiServiceSuggestions error:", error);
    if (isHttpError(error)) return res.status(error.statusCode).json({ message: error.message });
    return res.status(500).json({ message: "Server error" });
  }
}

