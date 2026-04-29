import express from "express";
import {
  createAiChatSession,
  deleteAiChatSession,
  getAiChatSessions,
  saveAiChatMessage,
} from "../controllers/ai-chat-history-controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/sessions", requireAuth, getAiChatSessions);
router.post("/sessions", requireAuth, createAiChatSession);
router.post("/sessions/:sessionId/messages", requireAuth, saveAiChatMessage);
router.delete("/sessions/:sessionId", requireAuth, deleteAiChatSession);

export default router;