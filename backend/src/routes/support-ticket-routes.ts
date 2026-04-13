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
        assignedAdmin: {
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
        assignedAdmin: true,
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
  try {
    const ticketId = String(req.params.id);
    const { status, priority, adminNotes, assignedAdminId } = req.body;

    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status,
        priority,
        adminNotes,
        assignedAdminId: assignedAdminId || req.user.id,
      },
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

    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: "IN_PROGRESS",
        assignedAdminId: req.user.id,
      },
    });

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
      await tx.supportTicket.update({
        where: { id: ticket.id },
        data: {
          status: "ESCALATED",
          assignedAdminId: req.user.id,
        },
      });

      return tx.disputeCase.create({
        data: {
          supportTicketId: ticket.id,
          repairRequestId: ticket.repairRequestId,
          openedByUserId: ticket.userId,
          assignedAdminId: req.user.id,
          filedByType: "CUSTOMER",
          reason: ticket.subject,
          description: ticket.message,
          status: "OPEN",
        },
      });
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