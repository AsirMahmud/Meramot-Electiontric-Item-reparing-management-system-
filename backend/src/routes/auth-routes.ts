import { Router } from "express";
import { login, signup } from "../controllers/auth-controller.js";
import { loginRateLimiter } from "../middleware/rate-limit.js";

const router = Router();

router.post("/signup", signup);
router.post("/login", loginRateLimiter, login);

export default router;