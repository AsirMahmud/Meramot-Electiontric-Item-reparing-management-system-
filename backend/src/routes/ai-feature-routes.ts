import { Router } from "express";
import { suggestModel, summarizeIssue } from "../controllers/ai-feature-controller.js";

const router = Router();

router.post("/suggest-model", suggestModel);
router.post("/summarize-issue", summarizeIssue);

export default router;
