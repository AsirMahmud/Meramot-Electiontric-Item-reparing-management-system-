import { Router } from "express";
import { createVendorApplication, listVendorApplications, approveVendorApplication, rejectVendorApplication, updateMyVendorApplication } from "../controllers/vendor-application-controller.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { vendorApplyRateLimiter } from "../middleware/rate-limit.js";
const router = Router();
router.post("/", vendorApplyRateLimiter, createVendorApplication);
router.get("/admin", requireAuth, requireAdmin, listVendorApplications);
router.patch("/admin/:id/approve", requireAuth, requireAdmin, approveVendorApplication);
router.patch("/admin/:id/reject", requireAuth, requireAdmin, rejectVendorApplication);
router.patch("/vendor/application-status", requireAuth, updateMyVendorApplication);
export default router;
//# sourceMappingURL=vendor-application-routes.js.map