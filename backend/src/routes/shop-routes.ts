import { Router } from "express";
import { getShops } from "../controllers/shop-controllers.ts";
const router = Router();
router.get("/", getShops);
export default router;