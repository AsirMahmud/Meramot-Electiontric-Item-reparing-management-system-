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

// ── Relevance matching (mirrors vendor-request-controller.ts) ────────────

function tokenize(parts: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      parts
        .join(" ")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .split(" ")
        .map((t) => t.trim())
        .filter((t) => t.length > 1),
    ),
  );
}

function isRelevant(
  request: {
    title: string;
    deviceType: string;
    brand: string | null;
    model: string | null;
    issueCategory: string | null;
    problem: string;
  },
  skillTags: string[],
) {
  if (!skillTags.length) return true; // no skills → show everything

  const requestText = [
    request.title,
    request.deviceType,
    request.brand,
    request.model,
    request.issueCategory,
    request.problem,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const requestTokens = new Set(
    tokenize([
      request.title,
      request.deviceType,
      request.brand,
      request.model,
      request.issueCategory,
      request.problem,
    ]),
  );

  for (const raw of skillTags) {
    const skill = raw.trim();
    if (!skill) continue;

    if (requestText.includes(skill.toLowerCase())) return true;

    const overlaps = tokenize([skill]).filter((t) => requestTokens.has(t));
    if (overlaps.length > 0) return true;
  }

  return false;
}

// ── Email builder ────────────────────────────────────────────────────────

type RequestSummary = {
  title: string;
  deviceType: string;
  brand: string | null;
  model: string | null;
  issueCategory: string | null;
};

function buildWelcomeEmailHtml(
  vendorName: string,
  shopName: string,
  requests: RequestSummary[],
) {
  const listItems = requests
    .slice(0, 15) // cap at 15 to keep email short
    .map(
      (r) =>
        `<li style="margin-bottom:8px;">
          <strong>${r.title}</strong><br/>
          <span style="color:#6B7C72;font-size:13px;">
            ${r.deviceType}${r.brand ? ` · ${r.brand}` : ""}${r.model ? ` · ${r.model}` : ""}${r.issueCategory ? ` · ${r.issueCategory}` : ""}
          </span>
        </li>`,
    )
    .join("");

  const extraNote =
    requests.length > 15
      ? `<p style="color:#6B7C72;font-size:13px;">…and ${requests.length - 15} more. Visit your dashboard to see all.</p>`
      : "";

  return `
    <div style="font-family:Arial,sans-serif;color:#173626;line-height:1.6;max-width:600px;margin:0 auto;padding:24px;border:1px solid #D7E2D2;border-radius:12px;">
      <h2 style="color:#1F4D2E;margin-bottom:4px;">Welcome to Meramot, ${vendorName}!</h2>
      <p>Your shop <strong>${shopName}</strong> has been approved. You can start receiving repair jobs right away.</p>
      
      ${
        requests.length > 0
          ? `
        <h3 style="margin-top:24px;color:#1F4D2E;">🔧 ${requests.length} repair request${requests.length > 1 ? "s" : ""} matching your skills</h3>
        <p style="color:#6B7C72;">These customers are waiting for vendor bids. Be the first to respond!</p>
        <ol style="padding-left:20px;">${listItems}</ol>
        ${extraNote}
      `
          : `<p style="margin-top:24px;color:#6B7C72;">No open repair requests match your skills right now. We'll notify you when new ones come in.</p>`
      }

      <div style="margin-top:28px;text-align:center;">
        <a href="${env.frontendOrigin}/vendor/dashboard" 
           style="background-color:#1F4D2E;color:white;padding:12px 28px;text-decoration:none;border-radius:24px;font-weight:bold;display:inline-block;">
          Open Vendor Dashboard
        </a>
      </div>

      <p style="margin-top:28px;color:#6B7C72;font-size:13px;">
        Tip: Complete your shop setup and add skill tags so we can match you with the right repair requests.
      </p>
      <p style="margin-top:16px;">Thanks,<br/>Meramot Team</p>
    </div>
  `;
}

// ── SMS builder ──────────────────────────────────────────────────────────

function buildWelcomeSms(shopName: string, matchCount: number) {
  if (matchCount > 0) {
    return `Meramot: Welcome! "${shopName}" is approved. ${matchCount} repair request${matchCount > 1 ? "s" : ""} match your skills — visit your dashboard to place bids now.`;
  }
  return `Meramot: Welcome! "${shopName}" is approved. Visit your vendor dashboard to set up your shop and start receiving repair jobs.`;
}

// ── Main export ──────────────────────────────────────────────────────────

export async function notifyVendorOfMatchingRequests(
  vendorUserId: string,
  shopSpecialties: string[],
) {
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

    // Find all BIDDING requests
    const biddingRequests = await prisma.repairRequest.findMany({
      where: { status: "BIDDING" },
      select: {
        title: true,
        deviceType: true,
        brand: true,
        model: true,
        issueCategory: true,
        problem: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50, // reasonable cap
    });

    // Filter to relevant ones
    const matchingRequests = biddingRequests.filter((req) =>
      isRelevant(req, shopSpecialties),
    );

    // ── Send email ───────────────────────────────────────────────────
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
            subject: matchingRequests.length
              ? `Welcome to Meramot — ${matchingRequests.length} repair requests match your skills!`
              : "Welcome to Meramot — your shop is approved!",
            html: buildWelcomeEmailHtml(
              vendor.name || "Vendor",
              shopName,
              matchingRequests,
            ),
          }),
        });

        if (!response.ok) {
          const err = await response.text().catch(() => "");
          console.error("[VendorOnboard] Email send failed:", err);
        } else {
          console.log(
            `[VendorOnboard] Welcome email sent to ${vendor.email} with ${matchingRequests.length} matching requests`,
          );
        }
      } catch (emailErr) {
        console.error("[VendorOnboard] Email error:", emailErr);
      }
    }

    // ── Send SMS ─────────────────────────────────────────────────────
    if (vendor.phone) {
      try {
        await sendSms(
          vendor.phone,
          buildWelcomeSms(shopName, matchingRequests.length),
        );
        console.log(
          `[VendorOnboard] Welcome SMS sent to ${vendor.phone}`,
        );
      } catch (smsErr) {
        console.error("[VendorOnboard] SMS error:", smsErr);
      }
    }
  } catch (error) {
    // Fire-and-forget — never block the approval response
    console.error("[VendorOnboard] Notification error:", error);
  }
}
