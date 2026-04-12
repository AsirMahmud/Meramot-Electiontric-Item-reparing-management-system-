import { Router } from "express";
import authRoutes from "./auth-routes.js";
import shopRoutes from "./shop-routes.js";
import { APP_DISPLAY_NAME, APP_SLUG } from "../config/app.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    ok: true,
    app: APP_DISPLAY_NAME,
    slug: APP_SLUG,
  });
});

router.use("/auth", authRoutes);
router.use("/shops", shopRoutes);

export default router;
