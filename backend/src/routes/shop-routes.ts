import { Router } from "express";
import {
  getFeaturedShops,
  getShopBySlug,
  getShops,
} from "../controllers/shop-controllers";

const router = Router();

router.get("/", getShops);
router.get("/featured", getFeaturedShops);
router.get("/:slug", getShopBySlug);

export default router;