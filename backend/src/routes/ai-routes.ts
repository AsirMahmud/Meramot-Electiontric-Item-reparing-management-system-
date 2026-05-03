import { Router } from "express";
import { chatWithAi, suggestModel } from "../controllers/ai-controller.js";

const router = Router();

router.post("/chat", chatWithAi);
router.post("/suggest-model", suggestModel);

export default router;