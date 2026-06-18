import { Router } from "express";
import { suggestModel, summarizeIssue, classifyIssue } from "../controllers/ai-feature-controller.js";

const router = Router();

router.post("/suggest-model", suggestModel);
router.post("/summarize-issue", summarizeIssue);
router.post("/classify-issue", classifyIssue);

export default router;
