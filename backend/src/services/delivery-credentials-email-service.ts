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

type DeliveryEmailInput = {
  toEmail: string;
  subject: string;
  html: string;
};

function hasSmtpConfig() {
  return Boolean(env.smtpHost && env.smtpPort && env.smtpUser && env.smtpPass && env.smtpFrom);
}

async function sendDeliveryModuleEmail(input: DeliveryEmailInput) {
  if (!env.enableEmailNotifications) {
    return { ok: false, skipped: true, reason: "email notifications disabled" };
  }

  if (!hasSmtpConfig()) {
    return { ok: false, skipped: true, reason: "missing smtp config" };
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

  await transporter.sendMail({
    from: env.smtpFrom,
    to: input.toEmail,
    subject: input.subject,
    html: input.html,
  });

  return { sent: true, provider: "nodemailer" };
}

export async function sendDeliveryCredentialsEmail(input: CredentialEmailInput) {
  if (!hasSmtpConfig()) {
    console.warn("[delivery-email] SMTP config missing. Credentials:", input.username, input.password);
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

  return sendDeliveryModuleEmail({
    toEmail: input.toEmail,
    subject,
    html,
  });
}

export async function sendDeliveryRegistrationAcknowledgementEmail(
  input: RegistrationAcknowledgementEmailInput,
) {
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

  return sendDeliveryModuleEmail({
    toEmail: input.toEmail,
    subject,
    html,
  });
}
