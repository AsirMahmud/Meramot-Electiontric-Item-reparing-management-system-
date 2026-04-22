import { Router } from "express";
import { adminDemoLogin, checkUsername, googleExchange, login, signup, } from "../controllers/auth-controller.js";
import { loginRateLimiter } from "../middleware/rate-limit.js";
const router = Router();
router.post("/signup", signup);
router.post("/login", loginRateLimiter, login);
router.post("/admin-demo-login", loginRateLimiter, adminDemoLogin);
router.get("/check-username", checkUsername);
router.post("/google-exchange", googleExchange);
export default router;
//# sourceMappingURL=auth-routes.js.map