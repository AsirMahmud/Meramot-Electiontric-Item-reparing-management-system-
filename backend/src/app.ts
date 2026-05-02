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
import adminDeliveryRoutes from "./routes/admin-delivery-routes.js";
import deliveryRoutes from "./routes/delivery-routes.js";
import deliveryAuthRoutes from "./routes/delivery-auth-routes.js";
import deliveryAdminRoutes from "./routes/delivery-admin-routes.js";
import deliveryAdminAuthRoutes from "./routes/delivery-admin-auth-routes.js";
import { apiRateLimiter } from "./middleware/rate-limit.js";

export function createApp() {
  const app = express();
  
  // Trust proxy is required when running behind a reverse proxy (e.g., Render)
  // This prevents express-rate-limit ValidationError: 'X-Forwarded-For' header is set but 'trust proxy' is false.
  app.set("trust proxy", 1);

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
  app.use("/api/admin", adminDeliveryRoutes);

  // Delivery system routes — kept separate as in main
  app.use("/api/delivery/auth", deliveryAuthRoutes);
  app.use("/api/delivery", deliveryRoutes);
  app.use("/api/delivery-admin/auth", deliveryAdminAuthRoutes);
  app.use("/api/delivery-admin", deliveryAdminRoutes);

  app.use("/uploads", express.static("uploads"));

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  return app;
}

const app = createApp();

export default app;
