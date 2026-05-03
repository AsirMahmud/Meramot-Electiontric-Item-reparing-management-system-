import { Router } from "express";
import {
  acceptRequestBid,
  cancelRequest,
  createRepairRequest,
  declineRequestBid,
  deleteRequest,
  listMyRequests,
  respondToFinalQuote,
  updateRequestStatus,
} from "../controllers/request-controller.js";
import { requireAuth } from "../middleware/require-auth.js";

const router = Router();

router.use(requireAuth);
router.get("/mine", listMyRequests);
router.post("/", createRepairRequest);
router.patch("/:requestId/status", updateRequestStatus);
router.patch("/:requestId/cancel", cancelRequest);
router.delete("/:requestId", deleteRequest);
router.patch("/:requestId/bids/:bidId/accept", acceptRequestBid);
router.patch("/:requestId/bids/:bidId/decline", declineRequestBid);
router.patch("/:requestId/final-quote/respond", respondToFinalQuote);

export default router;
