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

  app.use("/api", apiRateLimiter);

  app.use("/api", routes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/admin", vendorReviewRoutes);
  app.use("/api/admin", supportTicketRoutes);
  app.use("/api/admin", disputeRoutes);
  app.use("/api/admin", refundRoutes);
  app.use("/api/admin", financialLedgerRoutes);

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  return app;
}

const app = createApp();

export default app;


