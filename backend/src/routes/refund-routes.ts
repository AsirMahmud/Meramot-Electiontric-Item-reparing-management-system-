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

    const refund = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const createdRefund = await tx.refund.create({
        data: {
          paymentId: normalizedPaymentId,
          disputeCaseId: caseId,
          approvedById: req.user.id,
          amount: normalizedAmount,
          reason,
          status: "APPROVED",
          processedAt: new Date(),
        },
      });

      await tx.payment.update({
        where: { id: normalizedPaymentId },
        data: {
          status: "REFUNDED",
          escrowStatus: "REFUNDED",
        },
      });

      await tx.disputeCase.update({
        where: { id: caseId },
        data: {
          status: "REFUNDED",
          resolution: reason || "Refund approved by admin",
          resolvedAt: new Date(),
          assignedAdminId: req.user.id,
        },
      });

      await tx.escrowLedger.create({
        data: {
          paymentId: normalizedPaymentId,
          disputeCaseId: caseId,
          amount: normalizedAmount,
          action: "FULL_REFUND",
          note: reason || "Full refund issued by admin",
        },
      });

      return createdRefund;
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

    const refund = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const createdRefund = await tx.refund.create({
        data: {
          paymentId: normalizedPaymentId,
          disputeCaseId: caseId,
          approvedById: req.user.id,
          amount: normalizedAmount,
          reason,
          status: "APPROVED",
          processedAt: new Date(),
        },
      });

      await tx.payment.update({
        where: { id: normalizedPaymentId },
        data: {
          status: "PARTIALLY_REFUNDED",
          escrowStatus: "PARTIALLY_REFUNDED",
        },
      });

      await tx.disputeCase.update({
        where: { id: caseId },
        data: {
          status: "PARTIALLY_REFUNDED",
          resolution: reason || "Partial refund approved by admin",
          resolvedAt: new Date(),
          assignedAdminId: req.user.id,
        },
      });

      await tx.escrowLedger.create({
        data: {
          paymentId: normalizedPaymentId,
          disputeCaseId: caseId,
          amount: normalizedAmount,
          action: "PARTIAL_REFUND",
          note: reason || "Partial refund issued by admin",
        },
      });

      return createdRefund;
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

    const refund = await prisma.refund.create({
      data: {
        paymentId: normalizedPaymentId,
        disputeCaseId: caseId,
        approvedById: req.user.id,
        amount: normalizedAmount,
        reason: reason || "Refund denied by admin",
        status: "DENIED",
      },
    });

    await prisma.disputeCase.update({
      where: { id: caseId },
      data: {
        status: "REJECTED",
        resolution: reason || "Refund denied by admin",
        resolvedAt: new Date(),
        assignedAdminId: req.user.id,
      },
    });

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