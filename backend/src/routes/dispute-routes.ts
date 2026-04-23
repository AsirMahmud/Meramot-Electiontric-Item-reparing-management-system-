import { Router, Request, Response } from "express";
import prisma from "../models/prisma.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireAdmin } from "../middleware/require-admin.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/disputes", async (req: Request, res: Response) => {
  try {
    const status = String(req.query.status || "").trim();

    const disputes = await prisma.disputeCase.findMany({
      where: status ? { status: status as any } : {},
      orderBy: { createdAt: "desc" },
      include: {
        openedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        against: {
          select: { id: true, name: true, email: true, role: true },
        },
        assignedAdmin: {
          select: { id: true, name: true, email: true },
        },
        payment: true,
        repairRequest: true,
      },
    });

    return res.json({
      success: true,
      data: disputes,
    });
  } catch (error) {
    console.error("GET /disputes error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load disputes",
    });
  }
});

router.get("/disputes/:id", async (req: Request, res: Response) => {
  try {
    const disputeId = String(req.params.id);

    const dispute = await prisma.disputeCase.findUnique({
      where: { id: disputeId },
      include: {
        openedBy: true,
        against: true,
        assignedAdmin: true,
        payment: true,
        repairRequest: true,
        supportTicket: true,
        notes: {
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
        refunds: true,
      },
    });

    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: "Dispute not found",
      });
    }

    return res.json({
      success: true,
      data: dispute,
    });
  } catch (error) {
    console.error("GET /disputes/:id error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load dispute",
    });
  }
});

router.post("/disputes/:id/note", async (req: Request & { user?: any }, res: Response) => {
  try {
    const disputeId = String(req.params.id);
    const { note, isInternal = true } = req.body;

    if (!note || !String(note).trim()) {
      return res.status(400).json({
        success: false,
        message: "Note is required",
      });
    }

    const createdNote = await prisma.disputeNote.create({
      data: {
        disputeCaseId: disputeId,
        authorId: req.user.id,
        note: String(note).trim(),
        isInternal,
      },
    });

    await prisma.disputeCase.update({
      where: { id: disputeId },
      data: {
        assignedAdminId: req.user.id,
        status: "INVESTIGATING",
      },
    });

    return res.json({
      success: true,
      message: "Note added successfully",
      data: createdNote,
    });
  } catch (error) {
    console.error("POST /disputes/:id/note error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add note",
    });
  }
});

router.patch("/disputes/:id/resolve", async (req: Request & { user?: any }, res: Response) => {
  try {
    const disputeId = String(req.params.id);
    const { resolution, status = "RESOLVED" } = req.body;

    const dispute = await prisma.disputeCase.update({
      where: { id: disputeId },
      data: {
        assignedAdminId: req.user.id,
        resolution,
        status,
        resolvedAt: new Date(),
      },
    });

    return res.json({
      success: true,
      message: "Dispute resolved successfully",
      data: dispute,
    });
  } catch (error) {
    console.error("PATCH /disputes/:id/resolve error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to resolve dispute",
    });
  }
});

router.patch("/disputes/:id/hold", async (req: Request & { user?: any }, res: Response) => {
  try {
    const disputeId = String(req.params.id);
    const dispute = await prisma.disputeCase.update({
      where: { id: disputeId },
      data: {
        assignedAdminId: req.user.id,
        status: "WAITING_EVIDENCE",
      },
    });

    return res.json({
      success: true,
      message: "Dispute moved to waiting evidence",
      data: dispute,
    });
  } catch (error) {
    console.error("PATCH /disputes/:id/hold error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update dispute",
    });
  }
});

export default router;