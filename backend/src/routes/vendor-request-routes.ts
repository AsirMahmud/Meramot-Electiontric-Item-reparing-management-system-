import { Router } from "express";
import {
  acceptPendingRequest,
  declineExplicitRequest,
  getVendorAnalytics,
  getVendorDashboard,
  getVendorMyBids,
  rejectPendingRequest,
  submitVendorFinalQuote,
  updateVendorAssignedJobStatus,
  upsertVendorBid,
  getBiddingRequests,
  submitEarningFeedback,
  getEarningFeedbackCounts,
  getMyEarningFeedback,
} from "../controllers/vendor-request-controller.js";
import { requireAuth } from "../middleware/require-auth.js";

const router = Router();

// Public route — no auth required (anyone can view feedback counts)
router.get("/earning-feedback/counts", getEarningFeedbackCounts);

router.use(requireAuth);
router.get("/dashboard", getVendorDashboard);
router.get("/bidding-requests", getBiddingRequests);
router.get("/analytics", getVendorAnalytics);
router.get("/my-bids", getVendorMyBids);
router.get("/earning-feedback/mine", getMyEarningFeedback);
router.post("/earning-feedback", submitEarningFeedback);
router.post("/:requestId/bids", upsertVendorBid);
router.patch("/:requestId/accept", acceptPendingRequest);
router.patch("/:requestId/reject", rejectPendingRequest);
router.patch("/:requestId/decline-explicit", declineExplicitRequest);
router.patch("/jobs/:jobId/status", updateVendorAssignedJobStatus);
router.patch("/jobs/:jobId/final-quote", submitVendorFinalQuote);

export default router;

