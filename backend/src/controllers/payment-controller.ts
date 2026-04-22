import type { Request, Response } from "express";
import { createHash } from "crypto";
import prisma from "../models/prisma.js";
import { env } from "../config/env.js";
import { sslCommerzService } from "../services/sslcommerz.js";
import { sendInvoiceLinkEmail } from "../services/email-service.js";

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    role: string;
    username?: string;
    email?: string;
  };
};

type SslValidationResponse = {
  status?: string;
  tran_id?: string;
  amount?: string | number;
  currency_type?: string;
  currency?: string;
  verify_sign?: string;
  verify_key?: string;
  [key: string]: unknown;
};

type SslInitResponse = {
  status?: string;
  failedreason?: string;
  GatewayPageURL?: string;
  sessionkey?: string;
  [key: string]: unknown;
};

function callbackBaseUrl() {
  return `${env.backendBaseUrl.replace(/\/$/, "")}/api/payments/sslcommerz`;
}

function frontendPaymentResultUrl(params: Record<string, string | undefined>) {
  const target = new URL(env.frontendPaymentResultPath, env.frontendOrigin);

  for (const [key, value] of Object.entries(params)) {
    if (!value) {
      continue;
    }

    target.searchParams.set(key, value);
  }

  return target.toString();
}

function isSslValidationSuccess(value: unknown) {
  const response = value as SslValidationResponse;
  const status = String(response?.status ?? "").toUpperCase();
  return status === "VALID" || status === "VALIDATED";
}

function normalizeFieldValue(value: unknown): string {
  if (Array.isArray(value)) {
    return normalizeFieldValue(value[0]);
  }

  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function getCallbackPayload(req: Request) {
  const payload: Record<string, string> = {};

  const query = req.query as Record<string, unknown>;
  const body = req.body as Record<string, unknown>;

  for (const [key, value] of Object.entries(query || {})) {
    payload[key] = normalizeFieldValue(value);
  }

  for (const [key, value] of Object.entries(body || {})) {
    payload[key] = normalizeFieldValue(value);
  }

  return payload;
}

function toMoneyNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value.trim());
  }

  if (value && typeof value === "object" && "toString" in value) {
    return Number(String(value));
  }

  return NaN;
}

function amountsEqual(left: unknown, right: unknown) {
  const a = toMoneyNumber(left);
  const b = toMoneyNumber(right);

  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return false;
  }

  return Math.abs(a - b) < 0.01;
}

function md5Upper(value: string) {
  return createHash("md5").update(value).digest("hex").toUpperCase();
}

function verifyCallbackSignature(payload: Record<string, string>) {
  const verifySign = (payload.verify_sign || "").toUpperCase();
  const verifyKey = payload.verify_key || "";

  if (!verifySign || !verifyKey) {
    return {
      ok: false,
      reason: "verify_sign or verify_key is missing",
    };
  }

  const keys = verifyKey
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (keys.length === 0) {
    return {
      ok: false,
      reason: "verify_key contains no signable fields",
    };
  }

  const map: Record<string, string> = {};
  for (const key of keys) {
    map[key] = payload[key] ?? "";
  }

  map.store_passwd = md5Upper(env.sslCommerzStorePassword);

  const sortedKeys = Object.keys(map).sort();
  const signatureBase = sortedKeys.map((key) => `${key}=${map[key]}`).join("&");
  const expected = md5Upper(signatureBase);

  return {
    ok: expected === verifySign,
    provided: verifySign,
    expected,
    reason: expected === verifySign ? "ok" : "signature mismatch",
  };
}

function readCallbackField(req: Request, key: string): string {
  const bodyValue = (req.body as Record<string, unknown> | undefined)?.[key];
  const queryValue = (req.query as Record<string, unknown> | undefined)?.[key];

  const rawValue = bodyValue ?? queryValue;
  return rawValue === undefined || rawValue === null ? "" : String(rawValue).trim();
}

function createTransactionRef() {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 10);
  return `MMT-${ts}-${rnd}`.toUpperCase().slice(0, 30);
}

function ensureSslCommerzConfigured(res: Response) {
  if (!env.sslCommerzStoreId || !env.sslCommerzStorePassword) {
    res.status(500).json({
      success: false,
      message:
        "SSLCommerz is not configured. Set SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWORD.",
    });
    return false;
  }

  return true;
}

export async function initiateSslCommerzPayment(req: AuthenticatedRequest, res: Response) {
  try {
    if (!ensureSslCommerzConfigured(res)) {
      return;
    }

    const amount = Number(req.body?.amount);
    const currency = String(req.body?.currency || "BDT").trim().toUpperCase();
    const repairRequestId = req.body?.repairRequestId ? String(req.body.repairRequestId) : null;
    const productName = String(req.body?.productName || "Repair service payment").trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "amount must be a positive number",
      });
    }

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        address: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (repairRequestId) {
      const request = await prisma.repairRequest.findUnique({
        where: { id: repairRequestId },
        select: { id: true, userId: true },
      });

      if (!request || request.userId !== req.user.id) {
        return res.status(404).json({
          success: false,
          message: "Repair request not found",
        });
      }
    }

    const transactionRef = createTransactionRef();

    const payment = await prisma.payment.create({
      data: {
        userId: req.user.id,
        repairRequestId,
        amount,
        currency,
        method: "SSLCOMMERZ",
        status: "PENDING",
        transactionRef,
      },
      select: {
        id: true,
        transactionRef: true,
        status: true,
        amount: true,
        currency: true,
      },
    });

    const gatewayResponse = (await sslCommerzService.init({
      total_amount: amount,
      currency,
      tran_id: transactionRef,
      success_url: `${callbackBaseUrl()}/success`,
      fail_url: `${callbackBaseUrl()}/fail`,
      cancel_url: `${callbackBaseUrl()}/cancel`,
      ipn_url: `${callbackBaseUrl()}/ipn`,
      shipping_method: "NO",
      product_name: productName,
      product_category: "Repair",
      product_profile: "general",
      cus_name: user.name || "Customer",
      cus_email: user.email,
      cus_add1: user.address || "Dhaka",
      cus_add2: user.address || "Dhaka",
      cus_city: user.city || "Dhaka",
      cus_state: user.city || "Dhaka",
      cus_postcode: "1000",
      cus_country: "Bangladesh",
      cus_phone: user.phone || "01700000000",
      ship_name: user.name || "Customer",
      ship_add1: user.address || "Dhaka",
      ship_city: user.city || "Dhaka",
      ship_postcode: "1000",
      ship_country: "Bangladesh",
      value_a: payment.id,
      value_b: req.user.id,
      value_c: repairRequestId || "",
    })) as SslInitResponse;

    if (!gatewayResponse?.GatewayPageURL) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      });

      return res.status(502).json({
        success: false,
        message: gatewayResponse?.failedreason || "Failed to initialize SSLCommerz payment",
        gateway: gatewayResponse,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Payment session initialized",
      data: {
        payment,
        gatewayUrl: gatewayResponse.GatewayPageURL,
        sessionkey: gatewayResponse.sessionkey,
        gatewayStatus: gatewayResponse.status,
      },
    });
  } catch (error) {
    console.error("POST /payments/sslcommerz/init error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to initialize payment",
    });
  }
}

async function markPaymentSuccessful(
  paymentId: string,
  validationResponse: unknown,
  source: "success" | "ipn",
) {
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        userId: true,
        repairRequestId: true,
        amount: true,
        status: true,
      },
    });

    if (!payment || payment.status === "PAID") {
      return;
    }

    if (!["PENDING", "AUTHORIZED"].includes(payment.status)) {
      throw new Error(`Invalid payment state transition from ${payment.status} to PAID`);
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "PAID",
        escrowStatus: "HELD",
        paidAt: new Date(),
        method: "SSLCOMMERZ",
      },
    });

    await tx.escrowLedger.create({
      data: {
        paymentId: payment.id,
        repairRequestId: payment.repairRequestId,
        customerUserId: payment.userId,
        amount: payment.amount,
        action: "PAYMENT_HELD",
        note: `Payment marked as paid via SSLCommerz ${source} callback`,
      },
    });
  });

  // Fetch the full payment with user details to send the email
  const fullPayment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { user: true },
  });

  if (fullPayment && fullPayment.user) {
    const invoiceUrl = new URL(`/payment/invoice/${fullPayment.id}`, env.frontendOrigin).toString();
    
    sendInvoiceLinkEmail({
      to: fullPayment.user.email,
      customerName: fullPayment.user.name || fullPayment.user.username,
      transactionRef: fullPayment.transactionRef || fullPayment.id,
      amount: Number(fullPayment.amount),
      currency: fullPayment.currency,
      invoiceUrl,
    }).catch(err => {
      console.error("Failed to send invoice email after payment success:", err);
    });
  }


  return {
    success: true,
    validation: validationResponse,
  };
}

async function processSuccessLikeCallback(req: Request, res: Response, source: "success" | "ipn") {
  try {
    const isGatewayReturn = source === "success";

    if (!env.sslCommerzStoreId || !env.sslCommerzStorePassword) {
      if (isGatewayReturn) {
        return res.redirect(
          frontendPaymentResultUrl({
            status: "error",
            message: "Payment gateway is not configured",
          }),
        );
      }

      return res.status(500).json({
        success: false,
        message:
          "SSLCommerz is not configured. Set SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWORD.",
      });
    }

    const callbackPayload = getCallbackPayload(req);
    const tranId = callbackPayload.tran_id || readCallbackField(req, "tran_id");
    const valId = callbackPayload.val_id || readCallbackField(req, "val_id");

    if (!tranId) {
      if (isGatewayReturn) {
        return res.redirect(
          frontendPaymentResultUrl({
            status: "error",
            message: "Missing transaction id in callback",
          }),
        );
      }

      return res.status(400).json({
        success: false,
        message: "tran_id is required",
      });
    }

    if (!valId) {
      if (isGatewayReturn) {
        return res.redirect(
          frontendPaymentResultUrl({
            status: "error",
            tranId,
            message: "Missing val_id in callback",
          }),
        );
      }

      return res.status(400).json({
        success: false,
        message: "val_id is required for callback verification",
      });
    }

    if (source === "ipn" || callbackPayload.verify_sign) {
      const signatureResult = verifyCallbackSignature(callbackPayload);

      if (!signatureResult.ok) {
        if (isGatewayReturn) {
          return res.redirect(
            frontendPaymentResultUrl({
              status: "error",
              tranId,
              message: "Invalid callback signature",
            }),
          );
        }

        return res.status(401).json({
          success: false,
          message: "Invalid SSLCommerz callback signature",
          reason: signatureResult.reason,
        });
      }
    }

    const payment = await prisma.payment.findUnique({
      where: { transactionRef: tranId },
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        transactionRef: true,
      },
    });

    if (!payment) {
      if (isGatewayReturn) {
        return res.redirect(
          frontendPaymentResultUrl({
            status: "failed",
            tranId,
            message: "Payment record not found",
          }),
        );
      }

      return res.status(404).json({
        success: false,
        message: "Payment not found for tran_id",
      });
    }

    if (payment.status === "PAID") {
      if (isGatewayReturn) {
        return res.redirect(
          frontendPaymentResultUrl({
            status: "success",
            tranId,
            paymentId: payment.id,
            valId,
          }),
        );
      }

      return res.json({
        success: true,
        message: "Payment already marked as paid",
        data: {
          tranId,
          source,
        },
      });
    }

    if (!["PENDING", "AUTHORIZED"].includes(payment.status)) {
      if (isGatewayReturn) {
        return res.redirect(
          frontendPaymentResultUrl({
            status: "failed",
            tranId,
            paymentId: payment.id,
            message: `Invalid payment state: ${payment.status}`,
          }),
        );
      }

      return res.status(409).json({
        success: false,
        message: `Cannot confirm payment from current state: ${payment.status}`,
      });
    }

    const validationResponse = await sslCommerzService.validate({ val_id: valId });
    const validation = validationResponse as SslValidationResponse;

    const validated = isSslValidationSuccess(validation);
    const validationTranId = String(validation.tran_id || "").trim();
    const validationCurrency = String(validation.currency_type || validation.currency || "")
      .trim()
      .toUpperCase();

    const amountMatches = amountsEqual(validation.amount, payment.amount);
    const currencyMatches =
      validationCurrency.length > 0 && validationCurrency === payment.currency.toUpperCase();
    const tranIdMatches = validationTranId.length > 0 && validationTranId === payment.transactionRef;

    if (!validated || !tranIdMatches || !amountMatches || !currencyMatches) {
      if (isGatewayReturn) {
        return res.redirect(
          frontendPaymentResultUrl({
            status: "failed",
            tranId,
            paymentId: payment.id,
            message: "Validation cross-check failed",
          }),
        );
      }

      return res.status(400).json({
        success: false,
        message: "Payment validation cross-check failed",
        checks: {
          validated,
          tranIdMatches,
          amountMatches,
          currencyMatches,
        },
        validation: {
          status: validation.status,
          tran_id: validation.tran_id,
          amount: validation.amount,
          currency_type: validation.currency_type || validation.currency,
        },
      });
    }

    await markPaymentSuccessful(payment.id, validationResponse, source);

    if (isGatewayReturn) {
      return res.redirect(
        frontendPaymentResultUrl({
          status: "success",
          tranId,
          paymentId: payment.id,
          valId,
        }),
      );
    }

    return res.json({
      success: true,
      message: "Payment marked as paid",
      data: {
        tranId,
        valId,
        source,
        validation: validationResponse,
      },
    });
  } catch (error) {
    console.error(`POST /payments/sslcommerz/${source} error:`, error);

    if (source === "success") {
      return res.redirect(
        frontendPaymentResultUrl({
          status: "error",
          message: "Failed to process payment callback",
        }),
      );
    }

    return res.status(500).json({
      success: false,
      message: "Failed to process payment callback",
    });
  }
}

export async function handleSslCommerzSuccess(req: Request, res: Response) {
  return processSuccessLikeCallback(req, res, "success");
}

export async function handleSslCommerzIpn(req: Request, res: Response) {
  return processSuccessLikeCallback(req, res, "ipn");
}

async function processFailureLikeCallback(
  req: Request,
  res: Response,
  source: "fail" | "cancel",
) {
  try {
    const callbackPayload = getCallbackPayload(req);
    const tranId = callbackPayload.tran_id || readCallbackField(req, "tran_id");

    if (!tranId) {
      return res.redirect(
        frontendPaymentResultUrl({
          status: source === "cancel" ? "cancelled" : "failed",
          message: "Missing transaction id in callback",
        }),
      );
    }

    if (callbackPayload.verify_sign) {
      const signatureResult = verifyCallbackSignature(callbackPayload);

      if (!signatureResult.ok) {
        return res.redirect(
          frontendPaymentResultUrl({
            status: "error",
            tranId,
            message: "Invalid callback signature",
          }),
        );
      }
    }

    const payment = await prisma.payment.findUnique({
      where: { transactionRef: tranId },
      select: { id: true, status: true },
    });

    if (!payment) {
      return res.redirect(
        frontendPaymentResultUrl({
          status: source === "cancel" ? "cancelled" : "failed",
          tranId,
          message: "Payment record not found",
        }),
      );
    }

    if (["PENDING", "AUTHORIZED"].includes(payment.status)) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
        },
      });
    }

    return res.redirect(
      frontendPaymentResultUrl({
        status: source === "cancel" ? "cancelled" : "failed",
        tranId,
        paymentId: payment.id,
      }),
    );
  } catch (error) {
    console.error(`POST /payments/sslcommerz/${source} error:`, error);
    return res.redirect(
      frontendPaymentResultUrl({
        status: "error",
        message: "Failed to process payment callback",
      }),
    );
  }
}

export async function handleSslCommerzFail(req: Request, res: Response) {
  return processFailureLikeCallback(req, res, "fail");
}

export async function handleSslCommerzCancel(req: Request, res: Response) {
  return processFailureLikeCallback(req, res, "cancel");
}

export async function getMyPaymentById(req: AuthenticatedRequest, res: Response) {
  try {
    const paymentId = String(req.params.paymentId || "").trim();

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "paymentId is required",
      });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        refunds: true,
        disputeCases: true,
      },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    if (payment.userId !== req.user?.id && req.user?.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    return res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error("GET /payments/:paymentId error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment",
    });
  }
}

export async function listPaymentsForAdmin(req: Request, res: Response) {
  try {
    const status = String(req.query.status || "").trim().toUpperCase();
    const method = String(req.query.method || "").trim().toUpperCase();
    const userId = String(req.query.userId || "").trim();
    const takeRaw = Number(req.query.take || 25);
    const take = Number.isFinite(takeRaw)
      ? Math.min(100, Math.max(1, Math.floor(takeRaw)))
      : 25;

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (method) {
      where.method = method;
    }

    if (userId) {
      where.userId = userId;
    }

    const payments = await prisma.payment.findMany({
      where,
      take,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        userId: true,
        repairRequestId: true,
        amount: true,
        currency: true,
        method: true,
        status: true,
        escrowStatus: true,
        transactionRef: true,
        paidAt: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error("GET /payments/admin/list error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load payments",
    });
  }
}

export async function querySslCommerzTransaction(req: Request, res: Response) {
  try {
    if (!ensureSslCommerzConfigured(res)) {
      return;
    }

    const tranId = String(req.params.tranId || "").trim();

    if (!tranId) {
      return res.status(400).json({
        success: false,
        message: "tranId is required",
      });
    }

    const result = await sslCommerzService.transactionQueryByTransactionId({
      tran_id: tranId,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("GET /payments/sslcommerz/transaction/:tranId error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to query transaction from SSLCommerz",
    });
  }
}

export async function initiateSslCommerzRefund(req: Request, res: Response) {
  try {
    if (!ensureSslCommerzConfigured(res)) {
      return;
    }

    const paymentId = String(req.body?.paymentId || "").trim();
    const refundAmount = Number(req.body?.refundAmount);
    const refundRemarks = String(req.body?.refundRemarks || "").trim() || "Refund requested";
    const referenceId = String(req.body?.referenceId || "").trim();

    if (!paymentId || !Number.isFinite(refundAmount) || refundAmount <= 0 || !referenceId) {
      return res.status(400).json({
        success: false,
        message: "paymentId, refundAmount, and referenceId are required",
      });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        transactionRef: true,
      },
    });

    if (!payment?.transactionRef) {
      return res.status(404).json({
        success: false,
        message: "Payment not found or missing transaction reference",
      });
    }

    const refundResponse = await sslCommerzService.initiateRefund({
      refund_amount: refundAmount,
      refund_remarks: refundRemarks,
      bank_tran_id: payment.transactionRef,
      refe_id: referenceId,
    });

    return res.json({
      success: true,
      data: refundResponse,
    });
  } catch (error) {
    console.error("POST /payments/sslcommerz/refund/initiate error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to initiate refund at SSLCommerz",
    });
  }
}

export async function querySslCommerzRefund(req: Request, res: Response) {
  try {
    if (!ensureSslCommerzConfigured(res)) {
      return;
    }

    const refundRefId = String(req.params.refundRefId || "").trim();

    if (!refundRefId) {
      return res.status(400).json({
        success: false,
        message: "refundRefId is required",
      });
    }

    const result = await sslCommerzService.refundQuery({
      refund_ref_id: refundRefId,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("GET /payments/sslcommerz/refund/:refundRefId error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to query refund from SSLCommerz",
    });
  }
}
