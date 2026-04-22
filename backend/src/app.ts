import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import adminRoutes from "./routes/admin-routes.js";
import vendorReviewRoutes from "./routes/vendor-review-routes.js";
import supportTicketRoutes from "./routes/support-ticket-routes.js";
import disputeRoutes from "./routes/dispute-routes.js";
import refundRoutes from "./routes/refund-routes.js";
import financialLedgerRoutes from "./routes/financial-ledger-routes.js";
import invoiceRoutes from "./routes/invoice-routes.js";
import profileRoutes from "./routes/profile-routes.js";
import requestRoutes from "./routes/request-routes.js";
import notificationRoutes from "./routes/notification-routes.js";
import vendorStatusRoutes from "./routes/vendor-status-routes.js";
import deliveryRoutes from "./routes/delivery-routes.js";
import deliveryAuthRoutes from "./routes/delivery-auth-routes.js";
import deliveryAdminRoutes from "./routes/delivery-admin-routes.js";
import deliveryAdminAuthRoutes from "./routes/delivery-admin-auth-routes.js";
import { apiRateLimiter } from "./middleware/rate-limit.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.frontendOrigin,
      credentials: true,
    }),
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use("/api", apiRateLimiter);

  app.use("/api", routes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/admin", vendorReviewRoutes);
  app.use("/api/admin", supportTicketRoutes);
  app.use("/api/admin", disputeRoutes);
  app.use("/api/admin", refundRoutes);
  app.use("/api/admin", financialLedgerRoutes);
  app.use("/api", invoiceRoutes);
  
  // Mounted customer/vendor orphaned routes
  app.use("/api/profile", profileRoutes);
  app.use("/api/requests", requestRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/vendor", vendorStatusRoutes);

  // Mounted delivery system routes
  app.use("/api/delivery/auth", deliveryAuthRoutes);
  app.use("/api/delivery", deliveryRoutes);
  app.use("/api/delivery-admin/auth", deliveryAdminAuthRoutes);
  app.use("/api/delivery-admin", deliveryAdminRoutes);

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  return app;
}

const app = createApp();

export const APP_DISPLAY_NAME = "Meramot Electric Item Repairing Management System";

export default app;
