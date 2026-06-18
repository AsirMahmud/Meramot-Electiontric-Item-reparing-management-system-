import { Router } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import {
  getVendorShopProfile,
  addVendorService,
  removeVendorService,
  addVendorSparePart,
  removeVendorSparePart,
  updateVendorSparePart,
  updateAiPreferences,
  acceptAiServiceSuggestion,
  rejectAiServiceSuggestion,
  getAiServiceSuggestions
} from "../controllers/vendor-shop-profile-controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", getVendorShopProfile);

// Services
router.post("/services", addVendorService);
router.delete("/services/:serviceId", removeVendorService);

// Spare Parts
router.post("/spare-parts", addVendorSparePart);
router.put("/spare-parts/:sparePartId", updateVendorSparePart);
router.delete("/spare-parts/:sparePartId", removeVendorSparePart);

// AI Suggestions
router.post("/ai-suggestions/generate", getAiServiceSuggestions);
router.patch("/ai-suggestions/preferences", updateAiPreferences);
router.post("/ai-suggestions/:suggestionId/accept", acceptAiServiceSuggestion);
router.post("/ai-suggestions/:suggestionId/reject", rejectAiServiceSuggestion);

export { router as vendorShopProfileRoutes };
