import { Router } from "express";
import {
  createVendorApplication,
  listVendorApplications,
  approveVendorApplication,
  rejectVendorApplication,
  updateMyVendorApplication,
  deleteVendorApplication
} from "../controllers/vendor-application-controller.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireAdmin } from "../middleware/require-admin.js";
import { vendorApplyRateLimiter } from "../middleware/rate-limit.js";

const router = Router();

router.post("/", vendorApplyRateLimiter, createVendorApplication);

router.get("/admin", requireAuth, requireAdmin, listVendorApplications);
router.patch("/admin/:id/approve", requireAuth, requireAdmin, approveVendorApplication);
router.patch("/admin/:id/reject", requireAuth, requireAdmin, rejectVendorApplication);
router.delete("/admin/:id", requireAuth, requireAdmin, deleteVendorApplication);
router.patch("/vendor/application-status", requireAuth, updateMyVendorApplication);
export default router;