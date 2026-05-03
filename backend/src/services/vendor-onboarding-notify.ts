// @ts-nocheck
/**
 * Notifies a newly approved vendor about all currently open repair requests
 * that match their shop's skill tags.
 *
 * Called once after admin approves the vendor application.
 */

import prisma from "../models/prisma.js";
import { env } from "../config/env.js";
import { sendSms } from "./sms-service.js";
import { sendGmailApiEmail } from "./gmail-api-service.js";

function buildWelcomeEmailHtml(vendorName: string, shopName: string) {
  return `
    <div style="font-family:Arial,sans-serif;color:#173626;line-height:1.6;max-width:600px;margin:0 auto;padding:24px;border:1px solid #D7E2D2;border-radius:12px;">
      <h2 style="color:#1F4D2E;margin-bottom:4px;">Welcome to Meramot, ${vendorName}!</h2>
      <p>Your shop <strong>${shopName}</strong> has been approved.</p>
      
      <p style="margin-top:24px;">To start receiving live repair job notifications, you need to log in and complete your shop setup.</p>
      
      <div style="margin-top:28px;text-align:center;">
        <a href="${env.frontendOrigin}/login" 
           style="background-color:#1F4D2E;color:white;padding:12px 28px;text-decoration:none;border-radius:24px;font-weight:bold;display:inline-block;">
          Log In & Set Up Shop
        </a>
      </div>

      <p style="margin-top:28px;color:#6B7C72;font-size:13px;">
        Tip: Make sure to add accurate skill tags so we can match you with the right customers.
      </p>
      <p style="margin-top:16px;">Thanks,<br/>Meramot Team</p>
    </div>
  `;
}

// ── SMS builder ──────────────────────────────────────────────────────────

function buildWelcomeSms(shopName: string) {
  return `Meramot: Welcome! "${shopName}" is approved. Log in to the website to set up your shop and start receiving repair jobs.`;
}

// ── Main export ──────────────────────────────────────────────────────────

export async function sendVendorWelcomeNotification(vendorUserId: string) {
  try {
    // Get vendor contact info
    const vendor = await prisma.user.findUnique({
      where: { id: vendorUserId },
      select: { name: true, email: true, phone: true },
    });

    if (!vendor) return;

    // Get the shop name
    const staff = await prisma.shopStaff.findFirst({
      where: { userId: vendorUserId, role: "OWNER" },
      select: { shop: { select: { name: true } } },
    });

    const shopName = staff?.shop?.name || "your shop";

    // ── Send email ───────────────────────────────────────────────────
    if (vendor.email && env.enableEmailNotifications) {
      try {
        await sendGmailApiEmail({
          to: vendor.email,
          subject: "Welcome to Meramot — your shop is approved!",
          html: buildWelcomeEmailHtml(vendor.name || "Vendor", shopName),
        });
        console.log(`[VendorOnboard] Welcome email sent to ${vendor.email} (Gmail API)`);
      } catch (emailErr) {
        console.error("[VendorOnboard] Email error (Gmail API):", emailErr);
      }
    }

    if (vendor.email && env.enableEmailNotifications && env.resendApiKey && env.emailFrom) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: env.emailFrom,
            to: [vendor.email],
            subject: "Welcome to Meramot — your shop is approved!",
            html: buildWelcomeEmailHtml(vendor.name || "Vendor", shopName),
          }),
        });

        if (!response.ok) {
          const err = await response.text().catch(() => "");
          console.error("[VendorOnboard] Email send failed (Resend):", err);
        } else {
          console.log(`[VendorOnboard] Welcome email sent to ${vendor.email} (Resend)`);
        }
      } catch (emailErr) {
        console.error("[VendorOnboard] Email error (Resend):", emailErr);
      }
    }

    // ── Send SMS ─────────────────────────────────────────────────────
    if (vendor.phone) {
      try {
        await sendSms(vendor.phone, buildWelcomeSms(shopName));
        console.log(`[VendorOnboard] Welcome SMS sent to ${vendor.phone}`);
      } catch (smsErr) {
        console.error("[VendorOnboard] SMS error:", smsErr);
      }
    }
  } catch (error) {
    console.error("[VendorOnboard] Notification error:", error);
  }
}
