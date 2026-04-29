import { Router } from "express";
import {
  getFeaturedShops,
  getShopBySlug,
  getShops,
} from "../controllers/shop-controllers.js";
import {
  canReviewShop,
  createReview,
  getShopReviews,
  updateReview,
  optionalAuth,
} from "../controllers/review-controller.js";
import { requireAuth } from "../middleware/require-auth.js";

const router = Router();

router.get("/", getShops);
router.get("/featured", getFeaturedShops);

// --- Review routes (must be BEFORE /:slug to avoid route collision) ---
router.get("/:shopSlug/reviews", optionalAuth, getShopReviews);
router.get("/:shopSlug/review-eligibility", requireAuth, canReviewShop);
router.post("/:shopSlug/reviews", requireAuth, createReview);
router.patch("/:shopSlug/reviews/:reviewId", requireAuth, updateReview);

// --- Shop detail ---
router.get("/:slug", getShopBySlug);

export default router;