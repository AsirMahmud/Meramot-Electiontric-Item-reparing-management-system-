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
  updatePayment,
} from "../controllers/payment-controller.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireAdmin } from "../middleware/require-admin.js";

const router = Router();

router.post("/sslcommerz/init", requireAuth, initiateSslCommerzPayment);
router.post("/init", requireAuth, initiateSslCommerzPayment); // Compatibility alias

router.all("/sslcommerz/success", async (req, res) => {
  try { await handleSslCommerzSuccess(req, res); } catch (err) {
    console.error("SSLCommerz success callback error:", err);
    if (!res.headersSent) res.redirect(`${process.env.FRONTEND_ORIGIN || "http://localhost:3000"}/payment/result?status=error&message=Internal+callback+error`);
  }
});
router.all("/sslcommerz/fail", async (req, res) => {
  try { await handleSslCommerzFail(req, res); } catch (err) {
    console.error("SSLCommerz fail callback error:", err);
    if (!res.headersSent) res.redirect(`${process.env.FRONTEND_ORIGIN || "http://localhost:3000"}/payment/result?status=failed&message=Callback+processing+error`);
  }
});
router.all("/sslcommerz/cancel", async (req, res) => {
  try { await handleSslCommerzCancel(req, res); } catch (err) {
    console.error("SSLCommerz cancel callback error:", err);
    if (!res.headersSent) res.redirect(`${process.env.FRONTEND_ORIGIN || "http://localhost:3000"}/payment/result?status=cancelled&message=Callback+processing+error`);
  }
});
router.all("/sslcommerz/ipn", async (req, res) => {
  try { await handleSslCommerzIpn(req, res); } catch (err) {
    console.error("SSLCommerz IPN callback error:", err);
    if (!res.headersSent) res.status(500).json({ success: false, message: "IPN processing error" });
  }
});

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
router.patch("/:paymentId", requireAuth, updatePayment);

export default router;
