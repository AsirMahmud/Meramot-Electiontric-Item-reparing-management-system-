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
          requestedShop: {
            select: {
              id: true,
              name: true,
            },
          },
          repairJob: {
            select: {
              id: true,
              shop: {
                select: {
                  id: true,
                  name: true,
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

  const shopId = payment.repairRequest?.requestedShop?.id ?? payment.repairRequest?.repairJob?.shop.id ?? null;

  if (!shopId) {
    throw new HttpError(400, "Unable to resolve shop from repair request");
  }

  const existingPayout = await tx.ledgerEntry.findFirst({
    where: {
      paymentId,
      type: "VENDOR_EARNING",
    },
    select: { id: true },
  });

  const approvedRefunds = await tx.ledgerEntry.aggregate({
    where: {
      paymentId,
      type: "REFUND",
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
    commissionEntry = await tx.ledgerEntry.create({
      data: {
        paymentId,
        shopId,
        amount: platformCommissionAmount,
        type: "PLATFORM_COMMISSION",
        direction: "CREDIT",
        description: `${ledgerNote} (admin: ${settledByAdminId})`,
      },
    });
  }

  let payoutEntry = null;
  if (vendorNetAmount > 0) {
    payoutEntry = await tx.ledgerEntry.create({
      data: {
        paymentId,
        shopId,
        amount: vendorNetAmount,
        type: "VENDOR_EARNING",
        direction: "CREDIT",
        description: `${ledgerNote} (admin: ${settledByAdminId})`,
      },
    });
  }

  await tx.payment.update({
    where: { id: paymentId },
    data: {
      escrowStatus: "RELEASED",
    },
  });

  await tx.payment.update({
    where: { id: paymentId },
    data: {
      escrowStatus: "RELEASED",
    },
  });

  return {
    paymentId,
    repairRequestId: payment.repairRequestId,
    shopId,
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

    const commissionWhere: Prisma.LedgerEntryWhereInput = {
      type: "PLATFORM_COMMISSION",
      ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
    };

    const vendorWhere: Prisma.LedgerEntryWhereInput = {
      type: "VENDOR_EARNING",
      ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
    };

    const heldWhere: Prisma.PaymentWhereInput = {
      status: {
        in: ["PAID", "PARTIALLY_REFUNDED"],
      },
      ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
    };

    const refundWhere: Prisma.LedgerEntryWhereInput = {
      type: "REFUND",
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
      prisma.ledgerEntry.aggregate({
        _sum: { amount: true },
        where: refundWhere,
      }),
      prisma.ledgerEntry.aggregate({
        _sum: { amount: true },
        where: commissionWhere,
      }),
      prisma.ledgerEntry.aggregate({
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

router.get("/financial-ledger/chart-data", async (req: Request, res: Response) => {
  try {
    const days = Number(req.query.days ?? 30);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [entries, typeDistribution] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where: {
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: "asc" },
        select: {
          amount: true,
          type: true,
          createdAt: true,
        },
      }),
      prisma.ledgerEntry.groupBy({
        by: ["type"],
        where: {
          createdAt: { gte: startDate },
        },
        _sum: {
          amount: true,
        },
        _count: {
          id: true,
        },
      }),
    ]);

    // Daily aggregation
    const dailyData: Record<string, { date: string; revenue: number; commission: number; payouts: number }> = {};
    
    // Initialize last X days
    for (let i = 0; i <= days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      dailyData[dateStr] = { date: dateStr, revenue: 0, commission: 0, payouts: 0 };
    }

    entries.forEach((entry) => {
      const dateStr = entry.createdAt.toISOString().split("T")[0];
      if (dailyData[dateStr]) {
        const amt = toMoneyNumber(entry.amount);
        if (entry.type === "CUSTOMER_PAYMENT") {
          dailyData[dateStr].revenue += amt;
        } else if (entry.type === "PLATFORM_COMMISSION") {
          dailyData[dateStr].commission += amt;
        } else if (entry.type === "VENDOR_EARNING") {
          dailyData[dateStr].payouts += amt;
        }
      }
    });

    const timeline = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));

    const distribution = typeDistribution.map((item) => ({
      name: item.type || "OTHER",
      value: toMoneyNumber(item._sum.amount),
      count: item._count.id,
    }));

    return res.json({
      success: true,
      data: {
        timeline,
        distribution,
      },
    });
  } catch (error) {
    console.error("GET /financial-ledger/chart-data error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load chart data",
    });
  }
});

router.get("/financial-ledger/entries", async (req: Request, res: Response) => {
  try {
    const type = typeof req.query.type === "string" ? req.query.type.trim() : "";
    const paymentId = typeof req.query.paymentId === "string" ? req.query.paymentId.trim() : "";
    const shopId =
      typeof req.query.shopId === "string" ? req.query.shopId.trim() : "";

    const requestedTake = Number(req.query.take ?? DEFAULT_PAGE_SIZE);
    const requestedPage = Number(req.query.page ?? 1);

    const take = Number.isFinite(requestedTake)
      ? Math.min(Math.max(Math.trunc(requestedTake), 1), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
    const page = Number.isFinite(requestedPage) ? Math.max(Math.trunc(requestedPage), 1) : 1;
    const skip = (page - 1) * take;

    const createdAtFilter = buildCreatedAtFilter(req.query.from, req.query.to);

    const where: Prisma.LedgerEntryWhereInput = {
      ...(type ? { type: type as any } : {}),
      ...(paymentId ? { paymentId } : {}),
      ...(shopId ? { shopId } : {}),
      ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
    };

    const [entries, total] = await Promise.all([
      prisma.ledgerEntry.findMany({
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
              transactionRef: true,
            },
          },
          shop: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
            },
          },
          payout: {
            select: {
              id: true,
              amount: true,
              status: true,
            },
          },
        },
      }),
      prisma.ledgerEntry.count({ where }),
    ]);

    return res.json({
      success: true,
      data: entries.map((e) => ({
        ...e,
        action: e.type || "UNKNOWN",
        note: e.description || "",
      })),
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
