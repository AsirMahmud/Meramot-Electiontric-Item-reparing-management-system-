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

import { suggestDeviceModel, summarizeDeviceIssue } from "../services/ai-feature-service.js";
import prisma from "../models/prisma.js";

export async function suggestModel(req: Request, res: Response) {
  try {
    const brand = typeof req.body?.brand === "string" ? req.body.brand.trim() : "";
    const model = typeof req.body?.model === "string" ? req.body.model.trim() : "";
    const deeperSearch = !!req.body?.deeperSearch;

    if (!brand && !model) {
      return res.status(400).json({ message: "brand or model is required" });
    }

    const result = await suggestDeviceModel({ brand, model, deeperSearch });
    return res.json(result);
  } catch (error) {
    console.error("suggestModel error:", error);
    return res.status(500).json({ message: "Failed to suggest device model" });
  }
}

export async function summarizeIssue(req: Request, res: Response) {
  try {
    const requestId = req.body?.requestId;
    if (!requestId) {
      return res.status(400).json({ message: "requestId is required" });
    }

    const repairRequest = await prisma.repairRequest.findUnique({
      where: { id: requestId },
      select: { deviceType: true, brand: true, model: true, issueCategory: true, problem: true, aiSummary: true }
    });

    if (!repairRequest) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (repairRequest.aiSummary) {
      return res.json({ ok: true, summary: repairRequest.aiSummary, cached: true });
    }

    const result = await summarizeDeviceIssue({
      deviceType: repairRequest.deviceType,
      brand: repairRequest.brand,
      model: repairRequest.model,
      issueCategory: repairRequest.issueCategory,
      problem: repairRequest.problem
    });

    if (result.ok && result.summary) {
      await prisma.repairRequest.update({
        where: { id: requestId },
        data: { aiSummary: result.summary }
      });
    }

    return res.json(result);
  } catch (error) {
    console.error("summarizeIssue error:", error);
    return res.status(500).json({ message: "Failed to summarize issue" });
  }
}