import { Router } from "express";
import { chatWithAi } from "../controllers/ai-controller.js";

const router = Router();

router.post("/chat", chatWithAi);

export default router;