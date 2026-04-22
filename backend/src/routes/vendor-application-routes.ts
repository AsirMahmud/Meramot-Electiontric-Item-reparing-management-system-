import { Router } from "express";
import {
  createVendorApplication,
  listVendorApplications,
  approveVendorApplication,
  rejectVendorApplication,
  updateMyVendorApplication
} from "../controllers/vendor-application-controller.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", createVendorApplication);

router.get("/admin", requireAuth, requireAdmin, listVendorApplications);
router.patch("/admin/:id/approve", requireAuth, requireAdmin, approveVendorApplication);
router.patch("/admin/:id/reject", requireAuth, requireAdmin, rejectVendorApplication);
router.patch("/vendor/application-status", requireAuth, updateMyVendorApplication);
export default router;