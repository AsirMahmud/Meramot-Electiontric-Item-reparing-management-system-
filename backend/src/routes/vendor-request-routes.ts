import { Router } from "express";
import {
  getVendorAnalytics,
  getVendorDashboard,
  submitVendorFinalQuote,
  updateVendorAssignedJobStatus,
  upsertVendorBid,
} from "../controllers/vendor-request-controller.js";
import { requireAuth } from "../middleware/require-auth.js";

const router = Router();

router.use(requireAuth);
router.get("/dashboard", getVendorDashboard);
router.get("/analytics", getVendorAnalytics);
router.post("/:requestId/bids", upsertVendorBid);
router.patch("/jobs/:jobId/status", updateVendorAssignedJobStatus);
router.patch("/jobs/:jobId/final-quote", submitVendorFinalQuote);

export default router;
