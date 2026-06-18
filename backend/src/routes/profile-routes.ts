import { Router } from "express";
import { getProfile, updateProfile, deleteProfile} from "../controllers/profile-controller.js";
import { requireAuth } from "../middleware/require-auth.js";

const router = Router();

router.get("/me", requireAuth, getProfile);
router.patch("/me", requireAuth, updateProfile);
router.delete("/me", requireAuth, deleteProfile);

export default router;
