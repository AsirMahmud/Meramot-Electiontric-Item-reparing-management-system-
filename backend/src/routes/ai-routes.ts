import { Router } from "express";
import { chatWithAi } from "../controllers/ai-chat-controller.js";
import { suggestModel, summarizeIssue } from "../controllers/ai-feature-controller.js";

const router = Router();

router.post("/chat", chatWithAi);
router.post("/suggest-model", suggestModel);
router.post("/summarize-issue", summarizeIssue);

export default router;