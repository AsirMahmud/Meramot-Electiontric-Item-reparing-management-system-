import { Router } from "express";
import {
  getMyPaymentById,
  handleSslCommerzCancel,
  handleSslCommerzFail,
  handleSslCommerzIpn,
  handleSslCommerzSuccess,
  initiateSslCommerzPayment,
  initiateSslCommerzRefund,
  listPaymentsForAdmin,
  querySslCommerzRefund,
  querySslCommerzTransaction,
} from "../controllers/payment-controller.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireAdmin } from "../middleware/require-admin.js";

const router = Router();

router.post("/sslcommerz/init", requireAuth, initiateSslCommerzPayment);

router.all("/sslcommerz/success", handleSslCommerzSuccess);
router.all("/sslcommerz/fail", handleSslCommerzFail);
router.all("/sslcommerz/cancel", handleSslCommerzCancel);
router.all("/sslcommerz/ipn", handleSslCommerzIpn);

router.get(
  "/admin/list",
  requireAuth,
  requireAdmin,
  listPaymentsForAdmin,
);
router.get(
  "/sslcommerz/transaction/:tranId",
  requireAuth,
  requireAdmin,
  querySslCommerzTransaction,
);
router.post(
  "/sslcommerz/refund/initiate",
  requireAuth,
  requireAdmin,
  initiateSslCommerzRefund,
);
router.get(
  "/sslcommerz/refund/:refundRefId",
  requireAuth,
  requireAdmin,
  querySslCommerzRefund,
);

router.get("/:paymentId", requireAuth, getMyPaymentById);

export default router;
