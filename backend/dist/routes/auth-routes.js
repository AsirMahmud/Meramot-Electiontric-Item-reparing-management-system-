import { Router } from "express";
import { checkUsername, login, signup } from "../controllers/auth-controller.js";
const router = Router();
router.get("/check-username", checkUsername);
router.post("/signup", signup);
router.post("/login", login);
export default router;
//# sourceMappingURL=auth-routes.js.map