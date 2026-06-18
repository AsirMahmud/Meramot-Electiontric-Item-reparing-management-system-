import { Router } from "express";
import { createRepairRequest, listMyRequests, updateRequestStatus, getRequestById, cancelRequest } from "../controllers/request-controller.js";
import { acceptBid, createSupportTicket, createDispute } from "../controllers/request-vendor-controller.js";
import { requireAuth } from "../middleware/require-auth.js";

const router = Router();

router.use(requireAuth);
router.get("/mine", listMyRequests);
router.get("/:requestId", getRequestById);
router.post("/", createRepairRequest);
router.patch("/:requestId/status", updateRequestStatus);
router.post("/:requestId/cancel", cancelRequest);
router.patch("/:requestId/bids/:bidId/accept", acceptBid);
router.post("/:requestId/support-ticket", createSupportTicket);
router.post("/:requestId/dispute", createDispute);

export default router;
