import { Router } from "express";
import {
	adminDemoLogin,
	login,
	signup,
} from "../controllers/auth-controller.js";
import { loginRateLimiter } from "../middleware/rate-limit.js";

const router = Router();

router.post("/signup", signup);
router.post("/login", loginRateLimiter, login);
router.post("/admin-demo-login", loginRateLimiter, adminDemoLogin);

export default router;