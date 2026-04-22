import { Router } from "express";
import { deliveryAdminLogin } from "../controllers/delivery-admin-auth-controller.js";

const router = Router();

router.post("/login", deliveryAdminLogin);

export default router;
