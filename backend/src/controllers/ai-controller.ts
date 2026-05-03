import { Request, Response } from "express";
import { generateAiRepairReply } from "../services/ai-chat-service.js";

export async function chatWithAi(req: Request, res: Response) {
  try {
    const message =
      typeof req.body?.message === "string" ? req.body.message.trim() : "";

    const history = Array.isArray(req.body?.history)
      ? req.body.history
          .filter(
            (item: unknown) =>
              typeof item === "object" &&
              item !== null &&
              "role" in item &&
              "text" in item
          )
          .map((item: any) => ({
            role: item.role === "assistant" ? "assistant" : "user",
            text: String(item.text ?? ""),
          }))
      : [];

    if (!message) {
      return res.status(400).json({ message: "message is required" });
    }

    const result = await generateAiRepairReply({
      message,
      history,
    });

    return res.json({
      ok: true,
      reply: result.reply,
    });
  } catch (error) {
    console.error("chatWithAi error:", error);
    return res.status(500).json({
      message:
        error instanceof Error ? error.message : "Failed to generate AI reply",
    });
  }
}