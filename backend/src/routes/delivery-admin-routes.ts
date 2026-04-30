import { Router } from "express";
import {
  assignDeliveryOrder,
  blockDeliveryPartner,
  deleteDeliveryPartner,
  getAdminDeliveryChatMessages,
  getDeliveryOrderTimeline,
  approveDeliveryPayoutRequest,
  approveDeliveryPartner,
  getDeliveryAdminStats,
  listDeliveryOrders,
  listDeliveryPayoutRequests,
  listDeliveryPartners,
  rejectDeliveryPartner,
  sendAdminDeliveryChatMessage,
} from "../controllers/delivery-admin-controller.js";
import { getDeliveryAdminMe } from "../controllers/delivery-admin-auth-controller.js";
import { requireDeliveryAdminAuth } from "../middleware/delivery-admin-auth-middleware.js";

const router = Router();

router.use(requireDeliveryAdminAuth);

router.get("/me", getDeliveryAdminMe);
router.get("/stats", getDeliveryAdminStats);
router.get("/partners", listDeliveryPartners);
router.patch("/partners/:id/approve", approveDeliveryPartner);
router.patch("/partners/:id/reject", rejectDeliveryPartner);
router.patch("/partners/:id/block", blockDeliveryPartner);
router.delete("/partners/:id", deleteDeliveryPartner);
router.get("/payout-requests", listDeliveryPayoutRequests);
router.patch("/payout-requests/:id/approve", approveDeliveryPayoutRequest);
router.get("/deliveries", listDeliveryOrders);
router.patch("/deliveries/:id/assign", assignDeliveryOrder);
router.get("/deliveries/:id/timeline", getDeliveryOrderTimeline);
router.get("/deliveries/:id/chat", getAdminDeliveryChatMessages);
router.post("/deliveries/:id/chat", sendAdminDeliveryChatMessage);

export default router;
