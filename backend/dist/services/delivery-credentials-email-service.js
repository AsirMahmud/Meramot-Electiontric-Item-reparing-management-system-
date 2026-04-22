import nodemailer from "nodemailer";
import { env } from "../config/env.js";
function hasSmtpConfig() {
    return Boolean(env.smtpHost && env.smtpPort && env.smtpUser && env.smtpPass && env.smtpFrom);
}
export async function sendDeliveryCredentialsEmail(input) {
    const subject = "Delivery Partner Approval - Login Credentials";
    const text = [
        `Hello ${input.recipientName},`,
        "",
        "Your delivery partner registration has been approved.",
        "Use the credentials below to sign in to the delivery portal:",
        "",
        `Username: ${input.username}`,
        `Password: ${input.password}`,
        "",
        "Please change your password after first login.",
    ].join("\n");
    if (!hasSmtpConfig()) {
        console.warn(`[email-fallback] SMTP is not configured. Credentials for ${input.toEmail}: ${input.username} / ${input.password}`);
        return { sent: false };
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
        subject,
        text,
    });
    return { sent: true };
}
export async function sendDeliveryRegistrationAcknowledgementEmail(input) {
    const subject = "Delivery Registration Received - Under Review";
    const text = [
        `Hello ${input.recipientName},`,
        "",
        "We have successfully received your delivery partner registration details.",
        "Our team will review your submission and send a confirmation email after approval.",
        "",
        "Thank you for your patience.",
        "Meeramoot Delivery Team",
    ].join("\n");
    if (!hasSmtpConfig()) {
        console.warn(`[email-fallback] SMTP is not configured. Registration acknowledgement not sent to ${input.toEmail}.`);
        return { sent: false };
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
        subject,
        text,
    });
    return { sent: true };
}
//# sourceMappingURL=delivery-credentials-email-service.js.map