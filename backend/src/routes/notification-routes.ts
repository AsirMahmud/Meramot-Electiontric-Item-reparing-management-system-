import { Router } from "express";
import { sendTestOrderStatusNotification } from "../controllers/notification-controller.js";

const router = Router();

router.post("/test-order-status", sendTestOrderStatusNotification);

export default router;
