import { Router } from "express";
import authRoutes from "./auth-routes.js";
import shopRoutes from "./shop-routes.js";
import notificationRoutes from "./notification-routes.js";
import { APP_DISPLAY_NAME, APP_SLUG } from "../config/app.js";
import profileRoutes from "./profile-routes.js";
import cartRoutes from "./cart-routes.js";
import requestRoutes from "./request-routes.js";
import aiRoutes from "./ai-routes.js";


const router = Router();

router.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      ok: true,
      app: APP_DISPLAY_NAME,
      slug: APP_SLUG,
      database: { connected: true },
    });
  } catch (error) {
    console.error("health check error:", error);
    res.status(503).json({
      ok: false,
      app: APP_DISPLAY_NAME,
      slug: APP_SLUG,
      database: { connected: false },
      message: "Database unavailable",
    });
  }
});

router.use("/auth", authRoutes);
router.use("/shops", shopRoutes);
router.use("/profile", profileRoutes);
router.use("/notifications", notificationRoutes);
router.use("/cart", cartRoutes);
router.use("/requests", requestRoutes);
router.use("/ai", aiRoutes);

export default router;