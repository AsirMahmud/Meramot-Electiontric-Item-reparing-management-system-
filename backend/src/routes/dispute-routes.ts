// @ts-nocheck
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
    });

    // Using raw SQL to bypass stale Prisma Client enum validation
    await prisma.$executeRawUnsafe(
      `UPDATE "DisputeCase" SET "assignedAdminId" = $1, status = $2::"DisputeStatus" WHERE id = $3`,
      req.user.id,
      "INVESTIGATING",
      disputeId
    );

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

    // Using raw SQL to bypass stale Prisma Client enum validation
    await prisma.$executeRawUnsafe(
      `UPDATE "DisputeCase" SET status = $1::"DisputeStatus", resolution = $2, "assignedAdminId" = $3, "resolvedAt" = $4 WHERE id = $5`,
      status, 
      resolution, 
      req.user.id, 
      new Date(), 
      disputeId
    );

    const dispute = await prisma.disputeCase.findUnique({
      where: { id: disputeId },
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
    // Using raw SQL to bypass stale Prisma Client enum validation
    await prisma.$executeRawUnsafe(
      `UPDATE "DisputeCase" SET "assignedAdminId" = $1, status = $2::"DisputeStatus" WHERE id = $3`,
      req.user.id,
      "WAITING_EVIDENCE",
      disputeId
    );

    const dispute = await prisma.disputeCase.findUnique({
      where: { id: disputeId },
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

router.delete("/disputes/:id/notes/:noteId", async (req: Request & { user?: any }, res: Response) => {
  try {
    const noteId = String(req.params.noteId);

    const note = await prisma.disputeNote.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    await prisma.disputeNote.delete({
      where: { id: noteId },
    });

    return res.json({
      success: true,
      message: "Note deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /disputes/:id/notes/:noteId error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete note",
    });
  }
});

export default router;