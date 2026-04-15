import { Prisma } from "@prisma/client";
import { Request, Response, Router } from "express";
import prisma from "../models/prisma.js";
import { requireAdmin } from "../middleware/require-admin.js";
import { requireAuth } from "../middleware/require-auth.js";

const router = Router();

const PLATFORM_COMMISSION_RATE = 0.05;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    role: string;
  };
};

function parseDateQuery(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function buildCreatedAtFilter(fromValue: unknown, toValue: unknown): Prisma.DateTimeFilter | undefined {
  const from = parseDateQuery(fromValue);
  const to = parseDateQuery(toValue);

  if (!from && !to) {
    return undefined;
  }

  if (from && to) {
    return { gte: from, lte: to };
  }

  if (from) {
    return { gte: from };
  }

  return { lte: to as Date };
}

function toMoneyNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value == null) {
    return 0;
  }

  return Number(value);
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function settlePaymentWithCommission(
  tx: Prisma.TransactionClient,
  paymentId: string,
  settledByAdminId: string,
  note?: string,
) {
  const payment = await tx.payment.findUnique({
    where: { id: paymentId },
    include: {
      repairRequest: {
        select: {
          id: true,
          title: true,
          assignedShop: {
            select: {
              id: true,
              name: true,
              ownerId: true,
            },
          },
          repairJob: {
            select: {
              id: true,
              shop: {
                select: {
                  id: true,
                  name: true,
                  ownerId: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!payment) {
    throw new HttpError(404, "Payment not found");
  }

  if (!["PAID", "PARTIALLY_REFUNDED"].includes(payment.status)) {
    throw new HttpError(400, "Payment must be PAID or PARTIALLY_REFUNDED to settle");
  }

  if (payment.escrowStatus === "RELEASED") {
    throw new HttpError(409, "Payment already settled");
  }

  const existingPayout = await tx.escrowLedger.findFirst({
    where: {
      paymentId,
      action: "VENDOR_EARNING_RELEASED",
    },
    select: { id: true },
  });

  if (existingPayout) {
    throw new HttpError(409, "Vendor payout already recorded for this payment");
  }

  const vendorFromAssignedShop = payment.repairRequest?.assignedShop?.ownerId ?? null;
  const vendorFromRepairJob = payment.repairRequest?.repairJob?.shop.ownerId ?? null;
  const vendorUserId = vendorFromAssignedShop ?? vendorFromRepairJob;

  if (!vendorUserId) {
    throw new HttpError(400, "Unable to resolve vendor account from repair request");
  }

  const approvedRefunds = await tx.refund.aggregate({
    where: {
      paymentId,
      status: {
        in: ["APPROVED", "PROCESSED"],
      },
    },
    _sum: {
      amount: true,
    },
  });

  const grossAmount = roundMoney(toMoneyNumber(payment.amount));
  const refundedAmount = roundMoney(toMoneyNumber(approvedRefunds._sum.amount));
  const distributableAmount = roundMoney(Math.max(grossAmount - refundedAmount, 0));

  if (distributableAmount <= 0) {
    throw new HttpError(400, "No distributable amount remains after refunds");
  }

  const platformCommissionAmount = roundMoney(distributableAmount * PLATFORM_COMMISSION_RATE);
  const vendorNetAmount = roundMoney(Math.max(distributableAmount - platformCommissionAmount, 0));

  const ledgerNote = note?.trim() || "Automated settlement with 5% platform commission";

  let commissionEntry = null;
  if (platformCommissionAmount > 0) {
    commissionEntry = await tx.escrowLedger.create({
      data: {
        paymentId,
        repairRequestId: payment.repairRequestId,
        customerUserId: payment.userId,
        vendorUserId,
        amount: platformCommissionAmount,
        grossAmount,
        platformCommissionAmount,
        vendorNetAmount,
        action: "PLATFORM_COMMISSION_DEDUCTED",
        note: `${ledgerNote} (admin: ${settledByAdminId})`,
      },
    });
  }

  let payoutEntry = null;
  if (vendorNetAmount > 0) {
    payoutEntry = await tx.escrowLedger.create({
      data: {
        paymentId,
        repairRequestId: payment.repairRequestId,
        customerUserId: payment.userId,
        vendorUserId,
        amount: vendorNetAmount,
        grossAmount,
        platformCommissionAmount,
        vendorNetAmount,
        action: "VENDOR_EARNING_RELEASED",
        note: `${ledgerNote} (admin: ${settledByAdminId})`,
      },
    });
  }

  await tx.payment.update({
    where: { id: paymentId },
    data: {
      escrowStatus: "RELEASED",
    },
  });

  return {
    paymentId,
    repairRequestId: payment.repairRequestId,
    vendorUserId,
    grossAmount,
    refundedAmount,
    distributableAmount,
    platformCommissionAmount,
    vendorNetAmount,
    commissionEntry,
    payoutEntry,
  };
}

router.use(requireAuth, requireAdmin);

router.get("/financial-ledger/summary", async (req: Request, res: Response) => {
  try {
    const createdAtFilter = buildCreatedAtFilter(req.query.from, req.query.to);

    const paymentWhere: Prisma.PaymentWhereInput = {
      status: {
        in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"],
      },
      ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
    };

    const refundWhere: Prisma.RefundWhereInput = {
      status: {
        in: ["APPROVED", "PROCESSED"],
      },
      ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
    };

    const commissionWhere: Prisma.EscrowLedgerWhereInput = {
      action: "PLATFORM_COMMISSION_DEDUCTED",
      ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
    };

    const vendorWhere: Prisma.EscrowLedgerWhereInput = {
      action: "VENDOR_EARNING_RELEASED",
      ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
    };

    const heldWhere: Prisma.PaymentWhereInput = {
      status: {
        in: ["PAID", "PARTIALLY_REFUNDED"],
      },
      escrowStatus: {
        in: ["HELD", "NOT_APPLICABLE", "PARTIALLY_REFUNDED"],
      },
      ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
    };

    const [
      customerPaymentTotal,
      refundTotal,
      commissionTotal,
      vendorPayoutTotal,
      heldEscrowTotal,
      pendingSettlementCount,
    ] = await Promise.all([
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: paymentWhere,
      }),
      prisma.refund.aggregate({
        _sum: { amount: true },
        where: refundWhere,
      }),
      prisma.escrowLedger.aggregate({
        _sum: { amount: true },
        where: commissionWhere,
      }),
      prisma.escrowLedger.aggregate({
        _sum: { amount: true },
        where: vendorWhere,
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: heldWhere,
      }),
      prisma.payment.count({ where: heldWhere }),
    ]);

    return res.json({
      success: true,
      data: {
        commissionRate: PLATFORM_COMMISSION_RATE,
        totalCustomerPayments: roundMoney(toMoneyNumber(customerPaymentTotal._sum.amount)),
        totalRefundedToCustomers: roundMoney(toMoneyNumber(refundTotal._sum.amount)),
        totalPlatformCommission: roundMoney(toMoneyNumber(commissionTotal._sum.amount)),
        totalVendorEarningsReleased: roundMoney(toMoneyNumber(vendorPayoutTotal._sum.amount)),
        escrowHeldAmount: roundMoney(toMoneyNumber(heldEscrowTotal._sum.amount)),
        pendingSettlementCount,
      },
    });
  } catch (error) {
    console.error("GET /financial-ledger/summary error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load financial summary",
    });
  }
});

router.get("/financial-ledger/entries", async (req: Request, res: Response) => {
  try {
    const action = typeof req.query.action === "string" ? req.query.action.trim() : "";
    const paymentId = typeof req.query.paymentId === "string" ? req.query.paymentId.trim() : "";
    const vendorUserId =
      typeof req.query.vendorUserId === "string" ? req.query.vendorUserId.trim() : "";

    const requestedTake = Number(req.query.take ?? DEFAULT_PAGE_SIZE);
    const requestedPage = Number(req.query.page ?? 1);

    const take = Number.isFinite(requestedTake)
      ? Math.min(Math.max(Math.trunc(requestedTake), 1), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
    const page = Number.isFinite(requestedPage) ? Math.max(Math.trunc(requestedPage), 1) : 1;
    const skip = (page - 1) * take;

    const createdAtFilter = buildCreatedAtFilter(req.query.from, req.query.to);

    const where: Prisma.EscrowLedgerWhereInput = {
      ...(action ? { action } : {}),
      ...(paymentId ? { paymentId } : {}),
      ...(vendorUserId ? { vendorUserId } : {}),
      ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
    };

    const [entries, total] = await Promise.all([
      prisma.escrowLedger.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          payment: {
            select: {
              id: true,
              amount: true,
              currency: true,
              status: true,
              escrowStatus: true,
              transactionRef: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          vendor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          repairRequest: {
            select: {
              id: true,
              title: true,
            },
          },
          disputeCase: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      }),
      prisma.escrowLedger.count({ where }),
    ]);

    return res.json({
      success: true,
      data: entries,
      meta: {
        page,
        take,
        total,
        totalPages: Math.max(Math.ceil(total / take), 1),
      },
    });
  } catch (error) {
    console.error("GET /financial-ledger/entries error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load ledger entries",
    });
  }
});

router.post(
  "/financial-ledger/settle/:paymentId",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const paymentId = String(req.params.paymentId || "").trim();
      if (!paymentId) {
        return res.status(400).json({
          success: false,
          message: "paymentId is required",
        });
      }

      const settlement = await prisma.$transaction((tx) =>
        settlePaymentWithCommission(tx, paymentId, req.user!.id, req.body?.note),
      );

      return res.json({
        success: true,
        message: "Payment settled and 5% platform commission recorded",
        data: settlement,
      });
    } catch (error) {
      console.error("POST /financial-ledger/settle/:paymentId error:", error);
      if (error instanceof HttpError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to settle payment",
      });
    }
  },
);

router.post("/financial-ledger/auto-settle", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const requestedLimit = Number(req.body?.limit ?? 20);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(Math.trunc(requestedLimit), 1), MAX_PAGE_SIZE)
      : 20;

    const candidates = await prisma.payment.findMany({
      where: {
        status: {
          in: ["PAID", "PARTIALLY_REFUNDED"],
        },
        escrowStatus: {
          in: ["HELD", "NOT_APPLICABLE", "PARTIALLY_REFUNDED"],
        },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
      select: { id: true },
    });

    const settled: Array<{ paymentId: string; vendorNetAmount: number; commissionAmount: number }> = [];
    const skipped: Array<{ paymentId: string; reason: string }> = [];

    for (const candidate of candidates) {
      try {
        const result = await prisma.$transaction((tx) =>
          settlePaymentWithCommission(
            tx,
            candidate.id,
            req.user!.id,
            "Auto settlement batch run",
          ),
        );

        settled.push({
          paymentId: result.paymentId,
          vendorNetAmount: result.vendorNetAmount,
          commissionAmount: result.platformCommissionAmount,
        });
      } catch (error) {
        skipped.push({
          paymentId: candidate.id,
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return res.json({
      success: true,
      message: "Auto settlement run completed",
      data: {
        requested: limit,
        candidates: candidates.length,
        settled,
        skipped,
      },
    });
  } catch (error) {
    console.error("POST /financial-ledger/auto-settle error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to run auto settlement",
    });
  }
});

export default router;
