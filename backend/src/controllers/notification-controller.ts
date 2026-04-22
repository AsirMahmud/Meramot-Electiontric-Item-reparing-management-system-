import { Request, Response } from "express";
import { sendOrderStatusEmail } from "../services/email-service";

export async function sendTestOrderStatusNotification(req: Request, res: Response) {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : undefined;
    const status = typeof req.body?.status === "string" ? req.body.status.trim() : "PROCESSING";
    const orderRef = typeof req.body?.orderRef === "string" ? req.body.orderRef.trim() : `MR-${Date.now()}`;

    if (!email) {
      return res.status(400).json({ message: "email is required" });
    }

    await sendOrderStatusEmail({
      to: email,
      customerName: name,
      status,
      orderRef,
      shopName: "Meramot Demo Shop",
    });

    return res.json({
      ok: true,
      provider: "resend",
      preview: {
        to: email,
        status,
        orderRef,
      },
    });
  } catch (error) {
    console.error("sendTestOrderStatusNotification error:", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to send test notification",
    });
  }
}
