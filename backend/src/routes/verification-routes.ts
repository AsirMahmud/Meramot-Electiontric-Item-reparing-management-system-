import { Router } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { sendVerificationOtp, verifyOtp } from "../controllers/verification-controller.js";

const router = Router();

router.post("/send-otp", requireAuth, sendVerificationOtp);
router.post("/verify-otp", requireAuth, verifyOtp);

export default router;
