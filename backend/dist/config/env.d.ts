export declare const env: {
    nodeEnv: string;
    port: number;
    databaseUrl: string;
    frontendOrigin: string;
    jwtSecret: string;
    /** Separate signing key for delivery personnel tokens (must not match jwtSecret in production). */
    jwtSecretDelivery: string;
    /** Separate signing key for delivery operations admin (must not match other secrets in production). */
    jwtSecretDeliveryAdmin: string;
    smtpHost: string | undefined;
    smtpPort: number | undefined;
    smtpSecure: boolean;
    smtpUser: string | undefined;
    smtpPass: string | undefined;
    smtpFrom: string | undefined;
};
//# sourceMappingURL=env.d.ts.map