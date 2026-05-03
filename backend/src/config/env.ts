import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret",
  enableEmailNotifications: process.env.ENABLE_EMAIL_NOTIFICATIONS === "true",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "",

  jwtSecretDelivery: process.env.JWT_SECRET_DELIVERY ?? "dev-delivery-secret",
  jwtSecretDeliveryAdmin:
    process.env.JWT_SECRET_DELIVERY_ADMIN ?? "dev-delivery-admin-secret",
  smtpHost: process.env.SMTP_HOST || "smtp.gmail.com",
  smtpPort: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465,
  smtpSecure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : true, // Gmail works best on 465 SSL
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  smtpFrom: process.env.SMTP_FROM,

  adminSmtpUser: process.env.ADMIN_SMTP_USER || process.env.SMTP_USER,
  adminSmtpPass: process.env.ADMIN_SMTP_PASS || process.env.SMTP_PASS,
  adminSmtpFrom: process.env.ADMIN_SMTP_FROM || process.env.SMTP_FROM,

  // Gmail API OAuth2 (used because Render blocks SMTP ports 587/465)
  gmailClientId: process.env.GMAIL_CLIENT_ID || "",
  gmailClientSecret: process.env.GMAIL_CLIENT_SECRET || "",
  gmailRefreshToken: process.env.GMAIL_REFRESH_TOKEN || "",
  gmailUser: process.env.GMAIL_USER || "",

  enableAiChat: process.env.ENABLE_AI_CHAT === "true",
  groqApiKey: process.env.GROQ_API_KEY || "",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  pusherAppId: process.env.PUSHER_APP_ID || "",
  pusherKey: process.env.PUSHER_KEY || "",
  pusherSecret: process.env.PUSHER_SECRET || "",
  pusherCluster: process.env.PUSHER_CLUSTER || "",
  sslCommerzStoreId: process.env.SSLCOMMERZ_STORE_ID || "",
  sslCommerzStorePassword: process.env.SSLCOMMERZ_STORE_PASSWORD || "",
  sslCommerzLive: process.env.SSLCOMMERZ_LIVE === "true",
};
