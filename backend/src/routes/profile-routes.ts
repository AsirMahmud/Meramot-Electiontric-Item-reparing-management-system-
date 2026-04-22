import { Router } from "express";
import { getProfile, updateProfile } from "../controllers/profile-controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/me", requireAuth, getProfile);
router.patch("/me", requireAuth, updateProfile);

export default router;
