import { Response } from "express";
import prisma from "../models/prisma.js";
import type { AuthedRequest } from "../middleware/auth.js";

export async function getAiChatSessions(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const sessions = await prisma.aiChatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return res.json(
      sessions.map((session) => ({
        id: session.id,
        title: session.title,
        messages: session.messages.map((msg) => ({
          role: msg.role,
          text: msg.text,
        })),
      }))
    );
  } catch (error) {
    console.error("Failed to load AI chat history:", error);
    return res.status(500).json({ message: "Failed to load AI chat history" });
  }
}

export async function createAiChatSession(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const session = await prisma.aiChatSession.create({
      data: {
        userId,
        title: req.body?.title || "New Chat",
      },
    });

    return res.status(201).json({
      id: session.id,
      title: session.title,
      messages: [],
    });
  } catch (error) {
    console.error("Failed to create AI chat:", error);
    return res.status(500).json({ message: "Failed to create AI chat" });
  }
}

export async function saveAiChatMessage(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { sessionId } = req.params;
    const { role, text } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!sessionId) {
      return res.status(400).json({ message: "Missing chat session id" });
    }

    if (!role || !text || !["user", "assistant"].includes(role)) {
      return res.status(400).json({ message: "Invalid message" });
    }

    const session = await prisma.aiChatSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      return res.status(404).json({ message: "Chat session not found" });
    }

    const message = await prisma.aiChatMessage.create({
      data: {
        sessionId,
        role,
        text,
      },
    });

    if (role === "user" && session.title === "New Chat") {
      const title = text.trim();

      await prisma.aiChatSession.update({
        where: { id: sessionId },
        data: {
          title: title.length > 38 ? `${title.slice(0, 38)}...` : title,
        },
      });
    } else {
      await prisma.aiChatSession.update({
        where: { id: sessionId },
        data: {
          updatedAt: new Date(),
        },
      });
    }

    return res.status(201).json({
      id: message.id,
      role: message.role,
      text: message.text,
    });
  } catch (error) {
    console.error("Failed to save AI message:", error);
    return res.status(500).json({ message: "Failed to save AI message" });
  }
}

export async function deleteAiChatSession(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { sessionId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!sessionId) {
      return res.status(400).json({ message: "Missing chat session id" });
    }

    await prisma.aiChatSession.deleteMany({
      where: {
        id: sessionId,
        userId,
      },
    });

    return res.json({ message: "Chat deleted" });
  } catch (error) {
    console.error("Failed to delete AI chat:", error);
    return res.status(500).json({ message: "Failed to delete AI chat" });
  }
}