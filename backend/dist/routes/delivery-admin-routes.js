import { Router } from "express";
import { approveDeliveryPartner, getDeliveryAdminStats, listDeliveryPartners, rejectDeliveryPartner, } from "../controllers/delivery-admin-controller.js";
import { getDeliveryAdminMe } from "../controllers/delivery-admin-auth-controller.js";
import { requireDeliveryAdminAuth } from "../middleware/delivery-admin-auth-middleware.js";
const router = Router();
router.use(requireDeliveryAdminAuth);
router.get("/me", getDeliveryAdminMe);
router.get("/stats", getDeliveryAdminStats);
router.get("/partners", listDeliveryPartners);
router.patch("/partners/:id/approve", approveDeliveryPartner);
router.patch("/partners/:id/reject", rejectDeliveryPartner);
export default router;
//# sourceMappingURL=delivery-admin-routes.js.map