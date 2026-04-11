import { Router } from "express";
import { checkUsername, login, signup } from "../controllers/auth-controller";

const router = Router();

router.get("/check-username", checkUsername);
router.post("/signup", signup);
router.post("/login", login);

export default router;