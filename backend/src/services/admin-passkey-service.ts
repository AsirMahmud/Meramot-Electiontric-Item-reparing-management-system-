import prisma from "../models/prisma.js";
import { env } from "../config/env.js";
import { sendGmailApiEmail } from "./gmail-api-service.js";

// In-memory store for the passkey
export let currentAdminPasskey: string | null = null;
let passkeyTimer: NodeJS.Timeout | null = null;

function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}


export async function generateAndSendAdminPasskey() {
  currentAdminPasskey = generatePin();
  console.log(`[AdminPasskey] New passkey generated: ${currentAdminPasskey}`);

  try {
    // Get all admin emails
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { email: true }
    });

    const adminEmails = admins.map(a => a.email);

    if (adminEmails.length === 0) {
      console.warn("[AdminPasskey] No admins found to send passkey.");
      return;
    }

    if (!env.enableEmailNotifications) {
      console.log("[AdminPasskey] Email notifications disabled. Skipping send.");
      return;
    }

    // Using Gmail REST API over HTTPS because Render blocks SMTP ports (587/465)
    const result = await sendGmailApiEmail({
      to: adminEmails,
      subject: "Meramot Admin Security: Your Temporary Passkey",
      html: `
        <div style="font-family: sans-serif; color: #1C251F; padding: 20px;">
          <h2 style="color: #244233;">Admin Security Passkey</h2>
          <p>A new secure passkey has been generated for destructive admin actions (like deleting applications).</p>
          <div style="background-color: #Eef5Ea; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #5a7566; text-transform: uppercase;">Your 1-Hour Passkey:</p>
            <h1 style="margin: 5px 0 0 0; font-size: 32px; letter-spacing: 4px; color: #1C251F;">${currentAdminPasskey}</h1>
          </div>
          <p>This passkey will expire and rotate in exactly 1 hour.</p>
        </div>
      `,
    });

    if (result.ok) {
      console.log(`[AdminPasskey] Gmail API: Passkey emailed to ${adminEmails.length} admins.`);
    } else {
      console.error(`[AdminPasskey] Gmail API failed:`, result.error);
    }
  } catch (error) {
    console.error("[AdminPasskey] Failed to send passkey emails:", error);
  }
}

export function startAdminPasskeyService() {
  if (passkeyTimer) return;
  
  // Generate first key immediately
  generateAndSendAdminPasskey();

  // Then every 60 minutes
  passkeyTimer = setInterval(generateAndSendAdminPasskey, 60 * 60 * 1000);
  console.log("[AdminPasskey] Service started. Generating new keys every 60 minutes.");
}
