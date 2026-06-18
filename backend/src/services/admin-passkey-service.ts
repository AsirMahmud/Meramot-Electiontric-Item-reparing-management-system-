import prisma from "../models/prisma.js";
import { env } from "../config/env.js";
import { sendGmailApiEmail } from "./gmail-api-service.js";

// In-memory store for the current passkey (single shared secret)
export let currentAdminPasskey: string | null = null;
let passkeyExpiry: number | null = null;

const PASSKEY_TTL_MS = 60 * 60 * 1000; // 1 hour

function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generates a new passkey and sends it ONLY to the requesting admin.
 * Called on-demand when an admin clicks a destructive action.
 */
export async function generateAndSendPasskeyToAdmin(adminUserId: string): Promise<{
  ok: boolean;
  message: string;
}> {
  const admin = await prisma.user.findUnique({
    where: { id: adminUserId, role: "ADMIN" },
    select: { email: true, name: true },
  });

  if (!admin) {
    return { ok: false, message: "Admin user not found." };
  }

  // Rotate the passkey
  currentAdminPasskey = generatePin();
  passkeyExpiry = Date.now() + PASSKEY_TTL_MS;

  console.log(`[AdminPasskey] New passkey generated for admin ${admin.email}: ${currentAdminPasskey}`);

  if (!env.enableEmailNotifications) {
    console.log("[AdminPasskey] Email notifications disabled. DEV passkey set in memory.");
    return { ok: true, message: "Passkey generated (emails disabled in dev)." };
  }

  const result = await sendGmailApiEmail({
    to: [admin.email],
    subject: "Meramot Admin Security: Your Temporary Passkey",
    html: `
      <div style="font-family: sans-serif; color: #1C251F; padding: 20px;">
        <h2 style="color: #244233;">Admin Security Passkey</h2>
        <p>Hello${admin.name ? ` ${admin.name}` : ""},</p>
        <p>A destructive action was requested in the Meramot admin panel. Use the passkey below to confirm it.</p>
        <div style="background-color: #Eef5Ea; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #5a7566; text-transform: uppercase;">Your 1-Hour Passkey:</p>
          <h1 style="margin: 5px 0 0 0; font-size: 32px; letter-spacing: 4px; color: #1C251F;">${currentAdminPasskey}</h1>
        </div>
        <p>This passkey expires in 1 hour. If you did not request this, please review your admin account security immediately.</p>
      </div>
    `,
  });

  if (result.ok) {
    console.log(`[AdminPasskey] Passkey emailed to ${admin.email}.`);
    return { ok: true, message: `Passkey sent to ${admin.email}.` };
  } else {
    console.error("[AdminPasskey] Gmail API failed:", result.error);
    return { ok: false, message: "Failed to send passkey email." };
  }
}

/**
 * Validates a submitted passkey. Returns true if valid and not expired.
 */
export function validatePasskey(submitted: string | undefined): boolean {
  if (!submitted || !currentAdminPasskey) return false;
  if (passkeyExpiry !== null && Date.now() > passkeyExpiry) {
    // Expired — clear it
    currentAdminPasskey = null;
    passkeyExpiry = null;
    return false;
  }
  return submitted === currentAdminPasskey;
}

/**
 * Called at server start — no longer broadcasts; just sets a dev passkey locally.
 */
export function startAdminPasskeyService() {
  if (process.env.NODE_ENV !== "production" && !process.env.FORCE_PASSKEY_SERVICE) {
    currentAdminPasskey = generatePin();
    passkeyExpiry = Date.now() + PASSKEY_TTL_MS;
    console.log(`[AdminPasskey] DEV ONLY PASSKEY: ${currentAdminPasskey}`);
  }
  // In production, passkeys are generated on-demand via POST /api/admin/request-passkey
  console.log("[AdminPasskey] Service ready. Passkeys are generated on-demand per admin request.");
}
