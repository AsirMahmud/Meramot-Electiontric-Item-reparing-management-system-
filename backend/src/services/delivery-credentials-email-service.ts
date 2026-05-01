import { env } from "../config/env.js";
import nodemailer from "nodemailer";

type CredentialEmailInput = {
  toEmail: string;
  recipientName: string;
  username: string;
  password: string;
};

type RegistrationAcknowledgementEmailInput = {
  toEmail: string;
  recipientName: string;
};

export async function sendDeliveryCredentialsEmail(input: CredentialEmailInput) {
  if (!env.enableEmailNotifications) {
    return { ok: false, skipped: true, reason: "email notifications disabled" };
  }

  if (!env.smtpHost) {
    console.warn("[email-fallback] SMTP credentials missing. Credentials:", input.username, input.password);
    return { ok: false, skipped: true, reason: "missing smtp config" };
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

  // 1. Send via Nodemailer (Added because Resend is currently restricted on the free tier to verified emails only)
  if (env.smtpHost) {
    try {
      const transporter = nodemailer.createTransport({
        host: env.smtpHost,
        port: env.smtpPort,
        secure: env.smtpSecure,
        auth: {
          user: env.smtpUser,
          pass: env.smtpPass,
        },
      });

      await transporter.sendMail({
        from: env.smtpFrom || "Meramot Delivery <noreply@meramot.com>",
        to: input.toEmail,
        subject,
        html,
      });
      console.log(`[DeliveryEmail] Nodemailer successfully sent to ${input.toEmail}`);
    } catch (err) {
      console.error(`[DeliveryEmail] Nodemailer API error: ${err}`);
    }
  } else {
    console.warn("[email-fallback] SMTP credentials missing. Credentials:", input.username, input.password);
  }

  // 2. Send via Resend (Original Logic)
  if (env.resendApiKey) {
    try {
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
        console.error(`[DeliveryEmail] Resend API error: ${res.status} ${errorBody}`);
      }
    } catch (err) {
      console.error(`[DeliveryEmail] Resend network error: ${err}`);
    }
  } else {
    console.warn("[email-fallback] Resend API Key is missing. Credentials:", input.username, input.password);
  }

  return { sent: true };
}

export async function sendDeliveryRegistrationAcknowledgementEmail(
  input: RegistrationAcknowledgementEmailInput,
) {
  if (!env.enableEmailNotifications) {
    return { ok: false, skipped: true };
  }

  if (!env.smtpHost) {
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

  // 1. Send via Nodemailer (Added because Resend is currently restricted on the free tier to verified emails only)
  if (env.smtpHost) {
    try {
      const transporter = nodemailer.createTransport({
        host: env.smtpHost,
        port: env.smtpPort,
        secure: env.smtpSecure,
        auth: {
          user: env.smtpUser,
          pass: env.smtpPass,
        },
      });

      await transporter.sendMail({
        from: env.smtpFrom || "Meramot Delivery <noreply@meramot.com>",
        to: input.toEmail,
        subject,
        html,
      });
    } catch (err) {
      console.error(`[DeliveryEmail] Nodemailer API error: ${err}`);
    }
  }

  // 2. Send via Resend (Original Logic)
  if (env.resendApiKey) {
    try {
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
        console.error(`[DeliveryEmail] Resend API error: ${res.status} ${errorBody}`);
      }
    } catch (err) {
      console.error(`[DeliveryEmail] Resend network error: ${err}`);
    }
  }

  return { sent: true };
}
