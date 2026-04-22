import { Router } from "express";
import {
  getVendorApplicationStatus,
  updateVendorApplicationStatus,
} from "../controllers/vendor-status-controller.js";

const router = Router();

router.get("/", getVendorApplicationStatus);
router.patch("/", updateVendorApplicationStatus);

export default router;