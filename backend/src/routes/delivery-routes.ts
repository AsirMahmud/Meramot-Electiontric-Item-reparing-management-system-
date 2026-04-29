import { Router } from "express";
import {
  acceptMyDelivery,
  getDeliveryMe,
  listMyDeliveries,
  updateMyDeliveryStatus,
  updateLocation,
} from "../controllers/delivery-controller.js";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { Response, NextFunction } from "express";

const router = Router();

// Middleware to ensure the user is specifically a DELIVERY role
function requireDeliveryRole(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "DELIVERY") {
    return res.status(403).json({ message: "Only delivery partners can access this" });
  }
  return next();
}

router.get("/me", requireAuth, requireDeliveryRole, getDeliveryMe);
router.get("/deliveries", requireAuth, requireDeliveryRole, listMyDeliveries);
router.patch("/deliveries/:id/accept", requireAuth, requireDeliveryRole, acceptMyDelivery);
router.patch("/deliveries/:id/status", requireAuth, requireDeliveryRole, updateMyDeliveryStatus);
router.patch("/location", requireAuth, requireDeliveryRole, updateLocation);

export default router;
