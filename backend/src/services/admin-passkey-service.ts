import prisma from "../models/prisma.js";
import { env } from "../config/env.js";
import nodemailer from "nodemailer";

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

    const transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
    });

    const result = await transporter.sendMail({
      from: env.smtpFrom || env.emailFrom,
      to: adminEmails.join(", "),
      subject: "Meramot Admin Security: Your Temporary Passkey",
      html: `
        <div style="font-family: sans-serif; color: #1C251F; padding: 20px;">
          <h2 style="color: #244233;">Admin Security Passkey</h2>
          <p>A new secure passkey has been generated for destructive admin actions (like deleting applications).</p>
          <div style="background-color: #Eef5Ea; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #5a7566; text-transform: uppercase;">Your 10-Minute Passkey:</p>
            <h1 style="margin: 5px 0 0 0; font-size: 32px; letter-spacing: 4px; color: #1C251F;">${currentAdminPasskey}</h1>
          </div>
          <p>This passkey will expire in exactly 10 minutes.</p>
        </div>
      `,
    });

    console.log(`[AdminPasskey] SMTP Response:`, result.response);
    console.log(`[AdminPasskey] Passkey emailed to ${adminEmails.length} admins.`);
  } catch (error) {
    console.error("[AdminPasskey] Failed to send passkey emails:", error);
  }
}

export function startAdminPasskeyService() {
  if (passkeyTimer) return;
  
  // Generate first key immediately
  generateAndSendAdminPasskey();

  // Then every 10 minutes
  passkeyTimer = setInterval(generateAndSendAdminPasskey, 10 * 60 * 1000);
  console.log("[AdminPasskey] Service started. Generating new keys every 10 minutes.");
}
