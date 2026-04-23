import { env } from "../config/env.js";
export async function sendDeliveryCredentialsEmail(input) {
    if (!env.enableEmailNotifications) {
        return { ok: false, skipped: true, reason: "email notifications disabled" };
    }
    if (!env.resendApiKey) {
        console.warn("[email-fallback] Resend API Key is missing. Credentials:", input.username, input.password);
        return { ok: false, skipped: true, reason: "missing api key" };
    }
    const subject = "Delivery Partner Approval - Login Credentials";
    const html = `
    <div style="font-family: Arial, sans-serif; color: #173626; line-height: 1.6;">
      <h2>Delivery Partner Registration Approved</h2>
      <p>Hello ${input.recipientName},</p>
      <p>Your delivery partner registration has been approved.</p>
      <p>Use the credentials below to sign in to the delivery portal:</p>
      <p>Username: <strong>${input.username}</strong></p>
      <p>Password: <strong>${input.password}</strong></p>
      <p>Please change your password after your first login.</p>
    </div>
  `;
    const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${env.resendApiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from: "Meramot Delivery <noreply@meramot.com>",
            to: input.toEmail,
            subject,
            html,
        }),
    });
    if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`Resend API error: ${res.status} ${errorBody}`);
    }
    return { sent: true };
}
export async function sendDeliveryRegistrationAcknowledgementEmail(input) {
    if (!env.enableEmailNotifications) {
        return { ok: false, skipped: true };
    }
    if (!env.resendApiKey) {
        return { ok: false, skipped: true };
    }
    const subject = "Delivery Registration Received - Under Review";
    const html = `
    <div style="font-family: Arial, sans-serif; color: #173626; line-height: 1.6;">
      <h2>Delivery Registration Received</h2>
      <p>Hello ${input.recipientName},</p>
      <p>We have successfully received your delivery partner registration details.</p>
      <p>Our team will review your submission and send a confirmation email after approval.</p>
      <p>Thank you for your patience.</p>
      <p>Meeramoot Delivery Team</p>
    </div>
  `;
    const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${env.resendApiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from: "Meramot Delivery <noreply@meramot.com>",
            to: input.toEmail,
            subject,
            html,
        }),
    });
    if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`Resend API error: ${res.status} ${errorBody}`);
    }
    return { sent: true };
}
//# sourceMappingURL=delivery-credentials-email-service.js.map