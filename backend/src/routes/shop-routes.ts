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
} from "../controllers/review-controller.js";
import { requireAuth } from "../middleware/require-auth.js";

const router = Router();

router.get("/", getShops);
router.get("/featured", getFeaturedShops);
router.get("/:slug", getShopBySlug);

router.get("/:shopSlug/reviews", getShopReviews);
router.get("/:shopSlug/review-eligibility", requireAuth, canReviewShop);
router.post("/:shopSlug/reviews", requireAuth, createReview);
router.patch("/:shopSlug/reviews/:reviewId", requireAuth, updateReview);

export default router;
