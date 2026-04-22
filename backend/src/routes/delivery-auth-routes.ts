import { Router } from "express";
import { deliveryLogin, deliveryRegister } from "../controllers/delivery-auth-controller.js";

const router = Router();

router.post("/register", deliveryRegister);
router.post("/login", deliveryLogin);

export default router;
