import { Router } from "express";
import { APP_DISPLAY_NAME, APP_SLUG } from "../config/app.js";
import authRoutes from "./auth-routes.js";
import notificationRoutes from "./notification-routes.js";
import profileRoutes from "./profile-routes.js";
import requestRoutes from "./request-routes.js";
import shopRoutes from "./shop-routes.js";
import vendorApplicationRoutes from "./vendor-application-routes.js";
import vendorRequestRoutes from "./vendor-request-routes.js";
import vendorStatusRoutes from "./vendor-status-routes.js";
import uploadRoutes from "./upload-routes.js";
import paymentRoutes from "./payment-routes.js";
import invoiceRoutes from "./invoice-routes.js";
import aiChatHistoryRoutes from "./ai-chat-history-routes.js";
import cartRoutes from "./cart-routes.js";
import aiRoutes from "./ai-routes.js";

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
router.use("/profile", profileRoutes);
router.use("/notifications", notificationRoutes);
router.use("/requests", requestRoutes);
router.use("/vendor/applications", vendorApplicationRoutes);
router.use("/vendor/application-status", vendorStatusRoutes);
router.use("/vendor/requests", vendorRequestRoutes);
router.use("/uploads", uploadRoutes);
router.use("/payments", paymentRoutes);
router.use("/invoices", invoiceRoutes);
router.use("/ai-chat", aiChatHistoryRoutes);
router.use("/cart", cartRoutes);
router.use("/ai", aiRoutes);

export default router;
