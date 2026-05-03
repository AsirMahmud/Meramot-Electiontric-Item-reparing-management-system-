import { Router } from "express";
import { chatWithAi, suggestModel, summarizeIssue } from "../controllers/ai-controller.js";

const router = Router();

router.post("/chat", chatWithAi);
router.post("/suggest-model", suggestModel);
router.post("/summarize-issue", summarizeIssue);

export default router;