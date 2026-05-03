import { Request, Response } from "express";
import { suggestDeviceModel, summarizeDeviceIssue } from "../services/ai-feature-service.js";
import prisma from "../models/prisma.js";

export async function suggestModel(req: Request, res: Response) {
  try {
    const brand = typeof req.body?.brand === "string" ? req.body.brand.trim() : "";
    const model = typeof req.body?.model === "string" ? req.body.model.trim() : "";
    const deeperSearch = !!req.body?.deeperSearch;

    if (!model && !brand) {
      return res.json({ ok: false, suggestions: [] });
    }

    const result = await suggestDeviceModel({ brand, model, deeperSearch });
    return res.json(result);
  } catch (error) {
    console.error("suggestModel error:", error);
    return res.json({ ok: false, suggestions: [] });
  }
}

export async function summarizeIssue(req: Request, res: Response) {
  try {
    const { requestId, deviceType, brand, model, issueCategory, problem } = req.body;
    
    if (!requestId || !problem) {
      return res.status(400).json({ ok: false, message: "Request ID and problem description are required" });
    }

    // 1. Check if summary already exists in DB
    const request = await prisma.repairRequest.findUnique({
      where: { id: requestId },
      select: { aiSummary: true }
    });

    if (request?.aiSummary) {
      return res.json({ ok: true, summary: request.aiSummary });
    }

    // 2. If not, generate a new one
    const result = await summarizeDeviceIssue({
      deviceType: String(deviceType || ""),
      brand: String(brand || ""),
      model: String(model || ""),
      issueCategory: String(issueCategory || ""),
      problem: String(problem)
    });

    if (result.ok && result.summary) {
      // 3. Save to DB for future use
      await prisma.repairRequest.update({
        where: { id: requestId },
        data: { aiSummary: result.summary }
      });
    }

    return res.json(result);
  } catch (error) {
    console.error("summarizeIssue error:", error);
    return res.status(500).json({ ok: false, message: "Failed to summarize issue" });
  }
}
