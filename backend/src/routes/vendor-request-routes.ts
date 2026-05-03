import { Router } from "express";
import {
  acceptPendingRequest,
  getVendorAnalytics,
  getVendorDashboard,
  getVendorMyBids,
  rejectPendingRequest,
  submitVendorFinalQuote,
  updateVendorAssignedJobStatus,
  upsertVendorBid,
} from "../controllers/vendor-request-controller.js";
import { requireAuth } from "../middleware/require-auth.js";

const router = Router();

router.use(requireAuth);
router.get("/dashboard", getVendorDashboard);
router.get("/analytics", getVendorAnalytics);
router.get("/my-bids", getVendorMyBids);
router.post("/:requestId/bids", upsertVendorBid);
router.patch("/:requestId/accept", acceptPendingRequest);
router.patch("/:requestId/reject", rejectPendingRequest);
router.patch("/jobs/:jobId/status", updateVendorAssignedJobStatus);
router.patch("/jobs/:jobId/final-quote", submitVendorFinalQuote);

export default router;
