import { Router } from "express";
import {
  acceptMyDelivery,
  getDeliveryChatMessages,
  getDeliveryMe,
  getDeliveryPayoutSummary,
  listMyDeliveries,
  requestDeliveryPayout,
  sendDeliveryChatMessage,
  updateMyDeliveryStatus,
  updateLocation,
} from "../controllers/delivery-controller.js";
import {
  requireApprovedDeliveryPartner,
  requireDeliveryAuth,
} from "../middleware/delivery-auth-middleware.js";

const router = Router();

router.get("/me", requireDeliveryAuth, getDeliveryMe);
router.get("/deliveries", requireDeliveryAuth, requireApprovedDeliveryPartner, listMyDeliveries);
router.patch("/deliveries/:id/accept", requireDeliveryAuth, requireApprovedDeliveryPartner, acceptMyDelivery);
router.patch(
  "/deliveries/:id/status",
  requireDeliveryAuth,
  requireApprovedDeliveryPartner,
  updateMyDeliveryStatus,
);
router.patch("/location", requireDeliveryAuth, requireApprovedDeliveryPartner, updateLocation);
router.get("/payouts", requireDeliveryAuth, requireApprovedDeliveryPartner, getDeliveryPayoutSummary);
router.post("/payouts/request", requireDeliveryAuth, requireApprovedDeliveryPartner, requestDeliveryPayout);
router.get("/deliveries/:id/chat", requireDeliveryAuth, requireApprovedDeliveryPartner, getDeliveryChatMessages);
router.post("/deliveries/:id/chat", requireDeliveryAuth, requireApprovedDeliveryPartner, sendDeliveryChatMessage);

export default router;
