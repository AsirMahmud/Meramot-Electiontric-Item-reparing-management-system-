import { Router } from "express";
import {
  getFeaturedShops,
  getShopBySlug,
  getShops,
<<<<<<< HEAD
} from "../controllers/shop-controllers";
import {
  canReviewShop,
  createReview,
  getShopReviews,
} from "../controllers/review-controller";
import { requireAuth } from "../middleware/auth.js";
=======
} from "../controllers/shop-controllers.js";
>>>>>>> origin/main

const router = Router();

router.get("/", getShops);
router.get("/featured", getFeaturedShops);
router.get("/:slug", getShopBySlug);

router.get("/:shopSlug/reviews", getShopReviews);
router.get("/:shopSlug/review-eligibility", requireAuth, canReviewShop);
router.post("/:shopSlug/reviews", requireAuth, createReview);

export default router;