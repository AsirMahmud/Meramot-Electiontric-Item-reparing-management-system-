import { Router } from "express";
import prisma from "../models/prisma.js";
import authRoutes from "./auth-routes.js";
import shopRoutes from "./shop-routes.js";
import paymentRoutes from "./payment-routes.js";
import { APP_DISPLAY_NAME, APP_SLUG } from "../config/app.js";
const router = Router();
router.get("/health", async (_req, res) => {
    try {
        await prisma.$queryRaw `SELECT 1`;
        res.json({
            ok: true,
            app: APP_DISPLAY_NAME,
            slug: APP_SLUG,
            database: { connected: true },
        });
    }
    catch (error) {
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
router.use("/payments", paymentRoutes);
export default router;
//# sourceMappingURL=index.js.map