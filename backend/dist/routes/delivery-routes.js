import { Router } from "express";
import { acceptMyDelivery, getDeliveryMe, listMyDeliveries, updateMyDeliveryStatus, updateLocation, } from "../controllers/delivery-controller.js";
import { requireApprovedDeliveryPartner, requireDeliveryAuth, } from "../middleware/delivery-auth-middleware.js";
const router = Router();
router.get("/me", requireDeliveryAuth, getDeliveryMe);
router.get("/deliveries", requireDeliveryAuth, requireApprovedDeliveryPartner, listMyDeliveries);
router.patch("/deliveries/:id/accept", requireDeliveryAuth, requireApprovedDeliveryPartner, acceptMyDelivery);
router.patch("/deliveries/:id/status", requireDeliveryAuth, requireApprovedDeliveryPartner, updateMyDeliveryStatus);
router.patch("/location", requireDeliveryAuth, requireApprovedDeliveryPartner, updateLocation);
export default router;
//# sourceMappingURL=delivery-routes.js.map