function required(name) {
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
    /** Separate signing key for delivery personnel tokens (must not match jwtSecret in production). */
    jwtSecretDelivery: process.env.JWT_SECRET_DELIVERY ?? "dev-delivery-secret",
    /** Separate signing key for delivery operations admin (must not match other secrets in production). */
    jwtSecretDeliveryAdmin: process.env.JWT_SECRET_DELIVERY_ADMIN ?? "dev-delivery-admin-secret",
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
    smtpSecure: process.env.SMTP_SECURE === "true",
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    smtpFrom: process.env.SMTP_FROM,
};
//# sourceMappingURL=env.js.map