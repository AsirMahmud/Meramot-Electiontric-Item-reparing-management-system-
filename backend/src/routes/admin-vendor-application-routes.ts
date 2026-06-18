import { Router } from "express";
import {
  listVendorApplications,
  approveVendorApplication,
  rejectVendorApplication,
  deleteVendorApplication,
  updateMyVendorApplication,
  getVendorApplication,
} from "../controllers/vendor-application-controller.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireAdmin } from "../middleware/require-admin.js";

const router = Router();

router.use(requireAuth, requireAdmin);

// List all vendor applications (admin view)
router.get("/", listVendorApplications);
router.get("/:id", getVendorApplication);

// Approve / reject
router.patch("/:id/approve", approveVendorApplication);
router.patch("/:id/reject", rejectVendorApplication);
router.delete("/:id", deleteVendorApplication);

// Update my own application (used by vendor portal)
router.patch("/vendor/application-status", updateMyVendorApplication);

export default router;
