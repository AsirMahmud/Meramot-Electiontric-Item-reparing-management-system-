import { Router, Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import prisma from "../models/prisma.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireAdmin } from "../middleware/require-admin.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/refunds", async (_req: Request, res: Response) => {
  try {
    const refunds = await prisma.refund.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        payment: true,
        disputeCase: true,
        approvedBy: {
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
      data: refunds,
    });
  } catch (error) {
    console.error("GET /refunds error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load refunds",
    });
  }
});

router.post("/refunds/:caseId/issue", async (req: Request & { user?: any }, res: Response) => {
  try {
    const caseId = String(req.params.caseId);
    const { paymentId, amount, reason } = req.body;
    const normalizedPaymentId = String(paymentId || "").trim();
    const normalizedAmount = Number(amount);

    if (!normalizedPaymentId) {
      return res.status(400).json({
        success: false,
        message: "paymentId is required",
      });
    }

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "amount must be a positive number",
      });
    }

    const refund = await prisma.$transaction(async (tx: any) => {
      const refundId = `re${Math.random().toString(36).substring(2, 15)}`;
      
      // Use raw SQL for Refund creation
      await tx.$executeRawUnsafe(
        `INSERT INTO "Refund" (id, "paymentId", "disputeCaseId", "approvedById", amount, status, reason, "processedAt", "createdAt", "updatedAt") 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        refundId, normalizedPaymentId, caseId, req.user.id, normalizedAmount, "APPROVED", reason, new Date()
      );

      // Use raw SQL for Payment update
      await tx.$executeRawUnsafe(
        `UPDATE "Payment" SET status = $1, "escrowStatus" = $2 WHERE id = $3`,
        "REFUNDED", "REFUNDED", normalizedPaymentId
      );

      // Use raw SQL for DisputeCase update
      await tx.$executeRawUnsafe(
        `UPDATE "DisputeCase" SET status = $1::"DisputeStatus", resolution = $2, "resolvedAt" = $3, "assignedAdminId" = $4 WHERE id = $5`,
        "REFUNDED", reason || "Refund approved by admin", new Date(), req.user.id, caseId
      );

      // Use raw SQL for EscrowLedger creation
      await tx.$executeRawUnsafe(
        `INSERT INTO "EscrowLedger" (id, "paymentId", "disputeCaseId", amount, action, note, "createdAt") 
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        `el${Math.random().toString(36).substring(2, 15)}`, normalizedPaymentId, caseId, normalizedAmount, "FULL_REFUND", reason || "Full refund issued by admin"
      );

      return { id: refundId };
    });

    return res.json({
      success: true,
      message: "Full refund issued successfully",
      data: refund,
    });
  } catch (error) {
    console.error("POST /refunds/:caseId/issue error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to issue refund",
    });
  }
});

router.post("/refunds/:caseId/partial", async (req: Request & { user?: any }, res: Response) => {
  try {
    const caseId = String(req.params.caseId);
    const { paymentId, amount, reason } = req.body;
    const normalizedPaymentId = String(paymentId || "").trim();
    const normalizedAmount = Number(amount);

    if (!normalizedPaymentId) {
      return res.status(400).json({
        success: false,
        message: "paymentId is required",
      });
    }

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "amount must be a positive number",
      });
    }

    const refund = await prisma.$transaction(async (tx: any) => {
      const refundId = `re${Math.random().toString(36).substring(2, 15)}`;
      
      await tx.$executeRawUnsafe(
        `INSERT INTO "Refund" (id, "paymentId", "disputeCaseId", "approvedById", amount, status, reason, "processedAt", "createdAt", "updatedAt") 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        refundId, normalizedPaymentId, caseId, req.user.id, normalizedAmount, "APPROVED", reason, new Date()
      );

      await tx.$executeRawUnsafe(
        `UPDATE "Payment" SET status = $1, "escrowStatus" = $2 WHERE id = $3`,
        "PARTIALLY_REFUNDED", "PARTIALLY_REFUNDED", normalizedPaymentId
      );

      await tx.$executeRawUnsafe(
        `UPDATE "DisputeCase" SET status = $1::"DisputeStatus", resolution = $2, "resolvedAt" = $3, "assignedAdminId" = $4 WHERE id = $5`,
        "PARTIALLY_REFUNDED", reason || "Partial refund approved by admin", new Date(), req.user.id, caseId
      );

      await tx.$executeRawUnsafe(
        `INSERT INTO "EscrowLedger" (id, "paymentId", "disputeCaseId", amount, action, note, "createdAt") 
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        `el${Math.random().toString(36).substring(2, 15)}`, normalizedPaymentId, caseId, normalizedAmount, "PARTIAL_REFUND", reason || "Partial refund issued by admin"
      );

      return { id: refundId };
    });

    return res.json({
      success: true,
      message: "Partial refund issued successfully",
      data: refund,
    });
  } catch (error) {
    console.error("POST /refunds/:caseId/partial error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to issue partial refund",
    });
  }
});

router.post("/refunds/:caseId/deny", async (req: Request & { user?: any }, res: Response) => {
  try {
    const caseId = String(req.params.caseId);
    const { paymentId, amount = 0, reason } = req.body;
    const normalizedPaymentId = String(paymentId || "").trim();
    const normalizedAmount = Number(amount);

    if (!normalizedPaymentId) {
      return res.status(400).json({
        success: false,
        message: "paymentId is required",
      });
    }

    if (!Number.isFinite(normalizedAmount) || normalizedAmount < 0) {
      return res.status(400).json({
        success: false,
        message: "amount must be a non-negative number",
      });
    }

    const refundId = `re${Math.random().toString(36).substring(2, 15)}`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Refund" (id, "paymentId", "disputeCaseId", "approvedById", amount, status, reason, "createdAt", "updatedAt") 
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
      refundId, normalizedPaymentId, caseId, req.user.id, normalizedAmount, "DENIED", reason || "Refund denied by admin"
    );

    await prisma.$executeRawUnsafe(
      `UPDATE "DisputeCase" SET status = $1::"DisputeStatus", resolution = $2, "resolvedAt" = $3, "assignedAdminId" = $4 WHERE id = $5`,
      "REJECTED", reason || "Refund denied by admin", new Date(), req.user.id, caseId
    );

    const refund = { id: refundId };

    return res.json({
      success: true,
      message: "Refund denied successfully",
      data: refund,
    });
  } catch (error) {
    console.error("POST /refunds/:caseId/deny error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to deny refund",
    });
  }
});

export default router;