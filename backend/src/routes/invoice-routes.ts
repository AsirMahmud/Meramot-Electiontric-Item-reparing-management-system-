import { Router, Request, Response } from "express";
import prisma from "../models/prisma.js";
import { requireAuth } from "../middleware/require-auth.js";

const router = Router();

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    role: string;
  };
};

// ─── Invoice API ──────────────────────────────────────────────────────────────
// GET /api/payments/:paymentId/invoice
//
// Returns a structured invoice document for a payment.
// Access: the customer who made the payment OR any ADMIN.
//
// Response shape:
// {
//   success: true,
//   data: {
//     invoiceNumber: string,       // human-readable reference
//     issuedAt: string,            // ISO date
//     payment: { id, transactionRef, amount, currency, method, status, paidAt },
//     customer: { id, name, email, phone, address, city },
//     repairRequest: { id, title, deviceType, brand, model, problem } | null,
//     shop: { id, name, address, phone, email } | null,
//     lineItems: [{ description, amount }],
//     subtotal: number,
//     refundsTotal: number,
//     netTotal: number,
//     escrowStatus: string,
//     refunds: [{ id, amount, reason, status, processedAt }]
//   }
// }

router.get(
  "/payments/:paymentId/invoice",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const paymentId = String(req.params.paymentId || "").trim();

      if (!paymentId) {
        return res.status(400).json({ success: false, message: "paymentId is required" });
      }

      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              address: true,
              city: true,
            },
          },
          repairRequest: {
            select: {
              id: true,
              title: true,
              deviceType: true,
              brand: true,
              model: true,
              problem: true,
              assignedShop: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                  phone: true,
                  email: true,
                },
              },
              repairJob: {
                select: {
                  shop: {
                    select: {
                      id: true,
                      name: true,
                      address: true,
                      phone: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
          refunds: {
            select: {
              id: true,
              amount: true,
              reason: true,
              status: true,
              processedAt: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!payment) {
        return res.status(404).json({ success: false, message: "Payment not found" });
      }

      // Access control: owner or admin
      const requesterId = req.user?.id;
      const requesterRole = req.user?.role;
      if (payment.userId !== requesterId && requesterRole !== "ADMIN") {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      // Determine which shop is associated
      const shop =
        payment.repairRequest?.assignedShop ??
        payment.repairRequest?.repairJob?.shop ??
        null;

      // Build line items
      const lineItems: Array<{ description: string; amount: number }> = [
        {
          description: payment.repairRequest
            ? `Repair service: ${payment.repairRequest.title ?? payment.repairRequest.deviceType}`
            : "Service payment",
          amount: Number(payment.amount),
        },
      ];

      // Approved/processed refunds reduce the net total
      const approvedRefunds = payment.refunds.filter((r) =>
        ["APPROVED", "PROCESSED"].includes(r.status),
      );
      const refundsTotal = approvedRefunds.reduce((sum, r) => sum + Number(r.amount), 0);
      const subtotal = Number(payment.amount);
      const netTotal = Math.max(subtotal - refundsTotal, 0);

      // Human-readable invoice number
      const invoiceNumber = payment.transactionRef
        ? `INV-${payment.transactionRef}`
        : `INV-${payment.id.slice(0, 8).toUpperCase()}`;

      return res.json({
        success: true,
        data: {
          invoiceNumber,
          issuedAt: (payment.paidAt ?? payment.createdAt).toISOString(),
          payment: {
            id: payment.id,
            transactionRef: payment.transactionRef,
            amount: Number(payment.amount),
            currency: payment.currency,
            method: payment.method,
            status: payment.status,
            escrowStatus: payment.escrowStatus,
            paidAt: payment.paidAt?.toISOString() ?? null,
            createdAt: payment.createdAt.toISOString(),
          },
          customer: payment.user,
          repairRequest: payment.repairRequest
            ? {
                id: payment.repairRequest.id,
                title: payment.repairRequest.title,
                deviceType: payment.repairRequest.deviceType,
                brand: payment.repairRequest.brand,
                model: payment.repairRequest.model,
                problem: payment.repairRequest.problem,
              }
            : null,
          shop,
          lineItems,
          subtotal,
          refundsTotal,
          netTotal,
          refunds: payment.refunds,
        },
      });
    } catch (error) {
      console.error("GET /api/payments/:paymentId/invoice error:", error);
      return res.status(500).json({ success: false, message: "Failed to generate invoice" });
    }
  },
);

export default router;
