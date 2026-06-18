// @ts-nocheck
import { Router, Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import prisma from "../models/prisma.js";
import { requireAuth } from "../middleware/require-auth.js";

const router = Router();

// All routes require user authentication
router.use(requireAuth);

// ==========================================
// SUPPORT TICKETS
// ==========================================

// GET /tickets - List user's tickets
router.get("/tickets", async (req: Request & { user?: any }, res: Response) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        assignedAdmin: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return res.json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    console.error("GET /customer-support/tickets error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load tickets",
    });
  }
});

// GET /tickets/:id - View specific ticket
router.get("/tickets/:id", async (req: Request & { user?: any }, res: Response) => {
  try {
    const ticketId = String(req.params.id);

    const ticket = await prisma.supportTicket.findFirst({
      where: { id: ticketId, userId: req.user.id },
      include: {
        assignedAdmin: true,
        repairRequest: true,
        supportMessages: {
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

    // Rename supportMessages -> messages for frontend consistency if needed
    const { supportMessages, ...rest } = ticket;
    return res.json({
      success: true,
      data: { ...rest, messages: supportMessages },
    });
  } catch (error) {
    console.error("GET /customer-support/tickets/:id error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load ticket",
    });
  }
});

// POST /tickets - Create a new ticket
router.post("/tickets", async (req: Request & { user?: any }, res: Response) => {
  try {
    const { subject, message, priority = "NORMAL", repairRequestId } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Subject and message are required",
      });
    }

    // Wrap in a transaction to create the ticket and the initial message
    const ticket = await prisma.$transaction(async (tx) => {
      const newTicket = await tx.supportTicket.create({
        data: {
          userId: req.user.id,
          subject: String(subject).trim(),
          message: String(message).trim(),
          priority: String(priority),
          status: "OPEN",
          repairRequestId: repairRequestId ? String(repairRequestId) : null,
        },
      });

      await tx.supportMessage.create({
        data: {
          ticketId: newTicket.id,
          authorId: req.user.id,
          senderType: "CUSTOMER",
          message: String(message).trim(),
        },
      });

      return newTicket;
    });

    return res.status(201).json({
      success: true,
      message: "Ticket created successfully",
      data: ticket,
    });
  } catch (error) {
    console.error("POST /customer-support/tickets error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create ticket",
    });
  }
});

// POST /tickets/:id/reply - Reply to a ticket
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

    const ticket = await prisma.supportTicket.findFirst({
      where: { id: ticketId, userId: req.user.id },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    const reply = await prisma.supportMessage.create({
      data: {
        ticketId,
        authorId: req.user.id,
        senderType: "CUSTOMER",
        message: String(message).trim(),
        attachmentUrls,
      },
    });

    // Optionally update status to OPEN if it was resolved, so admin sees it again
    if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") {
      await prisma.$executeRawUnsafe(
        `UPDATE "SupportTicket" 
          SET status = $1::"SupportTicketStatus" 
          WHERE id = $2`,
        "OPEN",
        ticketId
      );
    }

    return res.json({
      success: true,
      message: "Reply sent successfully",
      data: reply,
    });
  } catch (error) {
    console.error("POST /customer-support/tickets/:id/reply error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send reply",
    });
  }
});

// ==========================================
// DISPUTES
// ==========================================

// GET /disputes - List user's disputes
router.get("/disputes", async (req: Request & { user?: any }, res: Response) => {
  try {
    const disputes = await prisma.disputeCase.findMany({
      where: {
        OR: [
          { openedById: req.user.id },
          { againstId: req.user.id },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        openedBy: {
          select: { id: true, name: true, role: true },
        },
        against: {
          select: { id: true, name: true, role: true },
        },
        repairRequest: {
          select: { id: true, title: true },
        },
      },
    });

    const enriched = disputes.map((d: any) => ({
      ...d,
      reason: d.repairRequest?.title || `Dispute #\${d.id.slice(-6)}`,
      description: d.resolution || null,
      filedByType: d.openedBy?.role || "CUSTOMER",
    }));

    return res.json({
      success: true,
      data: enriched,
    });
  } catch (error) {
    console.error("GET /customer-support/disputes error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load disputes",
    });
  }
});

// GET /disputes/:id - View specific dispute
router.get("/disputes/:id", async (req: Request & { user?: any }, res: Response) => {
  try {
    const disputeId = String(req.params.id);

    const dispute = await prisma.disputeCase.findFirst({
      where: {
        id: disputeId,
        OR: [
          { openedById: req.user.id },
          { againstId: req.user.id },
        ],
      },
      include: {
        openedBy: true,
        against: true,
        payment: true,
        repairRequest: true,
        notes: {
          // Only show notes that are not internal to the customer
          where: { isInternal: false },
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

    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: "Dispute not found",
      });
    }

    const enriched = {
      ...dispute,
      reason: (dispute as any).repairRequest?.title || `Dispute #\${dispute.id.slice(-6)}`,
      description: dispute.resolution || null,
      filedByType: (dispute as any).openedBy?.role || "CUSTOMER",
    };

    return res.json({
      success: true,
      data: enriched,
    });
  } catch (error) {
    console.error("GET /customer-support/disputes/:id error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load dispute",
    });
  }
});

// POST /disputes - Open a dispute
router.post("/disputes", async (req: Request & { user?: any }, res: Response) => {
  try {
    const { repairRequestId, paymentId, againstId, reason } = req.body;

    if (!againstId) {
      return res.status(400).json({
        success: false,
        message: "Who you are opening a dispute against (againstId) is required",
      });
    }

    const disputeId = `cm\${Math.random().toString(36).substring(2, 15)}`;

    await prisma.$executeRawUnsafe(
      `INSERT INTO "DisputeCase" (id, "repairRequestId", "paymentId", "openedById", "againstId", status, "createdAt", "updatedAt") 
       VALUES ($1, $2, $3, $4, $5, $6::"DisputeStatus", NOW(), NOW())`,
      disputeId,
      repairRequestId || null,
      paymentId || null,
      req.user.id,
      againstId,
      "OPEN"
    );

    if (reason && String(reason).trim()) {
      await prisma.disputeNote.create({
        data: {
          disputeCaseId: disputeId,
          authorId: req.user.id,
          note: String(reason).trim(),
          isInternal: false,
        },
      });
    }

    const dispute = await prisma.disputeCase.findUnique({
      where: { id: disputeId }
    });

    return res.status(201).json({
      success: true,
      message: "Dispute opened successfully",
      data: dispute,
    });
  } catch (error) {
    console.error("POST /customer-support/disputes error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to open dispute",
    });
  }
});

// POST /disputes/:id/note - Add a note/evidence
router.post("/disputes/:id/note", async (req: Request & { user?: any }, res: Response) => {
  try {
    const disputeId = String(req.params.id);
    const { note } = req.body;

    if (!note || !String(note).trim()) {
      return res.status(400).json({
        success: false,
        message: "Note is required",
      });
    }

    const dispute = await prisma.disputeCase.findFirst({
      where: {
        id: disputeId,
        OR: [
          { openedById: req.user.id },
          { againstId: req.user.id },
        ],
      },
    });

    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: "Dispute not found",
      });
    }

    const createdNote = await prisma.disputeNote.create({
      data: {
        disputeCaseId: disputeId,
        authorId: req.user.id,
        note: String(note).trim(),
        isInternal: false, // Customer notes are always visible to admin and them
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      message: "Note added successfully",
      data: createdNote,
    });
  } catch (error) {
    console.error("POST /customer-support/disputes/:id/note error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add note",
    });
  }
});

export default router;
