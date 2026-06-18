/**
 * Gmail API Email Service (HTTPS-based)
 *
 * Added because Render's hosting blocks outbound SMTP ports (587/465).
 * This service uses Google's Gmail REST API over HTTPS (port 443) to send emails,
 * completely bypassing the SMTP restriction.
 *
 * Uses OAuth2 refresh token flow to obtain access tokens automatically.
 */

import { env } from "../config/env.js";

let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * Get a valid access token using the refresh token.
 * Caches the token and only refreshes when expired.
 */
async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < tokenExpiresAt) {
    return cachedAccessToken;
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.gmailClientId,
      client_secret: env.gmailClientSecret,
      refresh_token: env.gmailRefreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Failed to refresh Gmail access token: ${JSON.stringify(data)}`);
  }

  cachedAccessToken = data.access_token;
  // Expire 5 minutes early to be safe
  tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;

  return cachedAccessToken!;
}

/**
 * Build a RFC 2822 compliant email message and encode it to base64url.
 */
function buildRawEmail(options: {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
}): string {
  const toList = Array.isArray(options.to) ? options.to.join(", ") : options.to;
  const boundary = `boundary_${Date.now()}`;

  const messageParts = [
    `From: ${options.from}`,
    `To: ${toList}`,
    `Subject: ${options.subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(options.html).toString("base64"),
    ``,
    `--${boundary}--`,
  ];

  const rawMessage = messageParts.join("\r\n");

  // Gmail API requires base64url encoding (not standard base64)
  return Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Send an email using the Gmail REST API over HTTPS.
 */
export async function sendGmailApiEmail(options: {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}): Promise<{ ok: boolean; data?: any; error?: string }> {
  if (!env.gmailClientId || !env.gmailClientSecret || !env.gmailRefreshToken) {
    console.warn("[GmailAPI] Gmail API credentials missing. Skipping send.");
    return { ok: false, error: "Gmail API credentials not configured" };
  }

  const fromAddress = options.from || `Meramot Official <${env.gmailUser || "meramotbd.official@gmail.com"}>`;

  try {
    const accessToken = await getAccessToken();

    const raw = buildRawEmail({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    const response = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("[GmailAPI] Send failed:", data);
      return { ok: false, error: JSON.stringify(data) };
    }

    console.log(`[GmailAPI] Email sent successfully. Message ID: ${data.id}`);
    return { ok: true, data };
  } catch (error) {
    console.error("[GmailAPI] Error:", error);
    return { ok: false, error: String(error) };
  }
}
