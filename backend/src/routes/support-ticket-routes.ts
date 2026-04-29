// @ts-nocheck
import { Router, Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import prisma from "../models/prisma.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireAdmin } from "../middleware/require-admin.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/tickets", async (req: Request, res: Response) => {
  try {
    const status = String(req.query.status || "").trim();

    const tickets = await prisma.supportTicket.findMany({
      where: status ? { status: status as any } : {},
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
          },
        },
        assigneeAdmin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    console.error("GET /tickets error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load tickets",
    });
  }
});

router.get("/tickets/:id", async (req: Request, res: Response) => {
  try {
    const ticketId = String(req.params.id);

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: true,
        assigneeAdmin: true,
        repairRequest: true,
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    return res.json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    console.error("GET /tickets/:id error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load ticket",
    });
  }
});

router.patch("/tickets/:id", async (req: Request & { user?: any }, res: Response) => {
  const ticketId = String(req.params.id);
  try {
    const { status, priority, adminNotes, assignedAdminId } = req.body;

    // Using raw SQL to bypass stale Prisma Client validation
    await prisma.$executeRawUnsafe(
      `UPDATE "SupportTicket" SET status = $1::"SupportTicketStatus", priority = $2, "adminNotes" = $3, "assigneeAdminId" = $4 WHERE id = $5`,
      status,
      priority,
      adminNotes,
      assignedAdminId || req.user.id,
      ticketId
    );

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: true,
        assigneeAdmin: true,
        repairRequest: true,
      }
    });

    return res.json({
      success: true,
      message: "Ticket updated successfully",
      data: ticket,
    });
  } catch (error) {
    console.error("PATCH /tickets/:id error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update ticket",
    });
  }
});

router.post("/tickets/:id/reply", async (req: Request & { user?: any }, res: Response) => {
  try {
    const ticketId = String(req.params.id);
    const { message, attachmentUrls = [] } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        success: false,
        message: "Reply message is required",
      });
    }

    const reply = await prisma.supportMessage.create({
      data: {
        ticketId,
        authorId: req.user.id,
        senderType: "ADMIN",
        message: String(message).trim(),
        attachmentUrls,
      },
    });

    await prisma.$executeRawUnsafe(
      `UPDATE "SupportTicket" SET status = $1::"SupportTicketStatus", "assigneeAdminId" = $2 WHERE id = $3`,
      "IN_PROGRESS",
      req.user.id,
      ticketId
    );

    return res.json({
      success: true,
      message: "Reply sent successfully",
      data: reply,
    });
  } catch (error) {
    console.error("POST /tickets/:id/reply error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send reply",
    });
  }
});

router.post("/tickets/:id/escalate", async (req: Request & { user?: any }, res: Response) => {
  try {
    const ticketId = String(req.params.id);
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    const dispute = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRawUnsafe(
        `UPDATE "SupportTicket" SET status = $1::"SupportTicketStatus", "assigneeAdminId" = $2 WHERE id = $3`,
        "ESCALATED",
        req.user.id,
        ticket.id
      );

      const disputeId = `cm${Math.random().toString(36).substring(2, 15)}`;
      await tx.$executeRawUnsafe(
        `INSERT INTO "DisputeCase" (id, "supportTicketId", "repairRequestId", "openedById", "assignedAdminId", status, "createdAt", "updatedAt") 
         VALUES ($1, $2, $3, $4, $5, $6::"DisputeStatus", NOW(), NOW())`,
        disputeId,
        ticket.id,
        ticket.repairRequestId,
        ticket.userId,
        req.user.id,
        "OPEN"
      );

      return { id: disputeId };
    });

    return res.json({
      success: true,
      message: "Ticket escalated to dispute successfully",
      data: dispute,
    });
  } catch (error) {
    console.error("POST /tickets/:id/escalate error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to escalate ticket",
    });
  }
});

export default router;