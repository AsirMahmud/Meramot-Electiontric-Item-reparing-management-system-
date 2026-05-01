import { Router } from "express";
import {
  getVendorApplicationStatus,
  updateVendorApplicationStatus,
  completeVendorShopSetup,
  updateVendorNotificationPreferences,
} from "../controllers/vendor-status-controller.js";

const router = Router();

router.get("/", getVendorApplicationStatus);
router.patch("/", updateVendorApplicationStatus);
router.patch("/setup-shop", completeVendorShopSetup);
router.patch("/notifications", updateVendorNotificationPreferences);

export default router;