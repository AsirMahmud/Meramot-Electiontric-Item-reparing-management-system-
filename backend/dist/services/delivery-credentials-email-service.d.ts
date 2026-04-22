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
export declare function sendDeliveryCredentialsEmail(input: CredentialEmailInput): Promise<{
    ok: boolean;
    skipped: boolean;
    reason: string;
    sent?: undefined;
} | {
    sent: boolean;
    ok?: undefined;
    skipped?: undefined;
    reason?: undefined;
}>;
export declare function sendDeliveryRegistrationAcknowledgementEmail(input: RegistrationAcknowledgementEmailInput): Promise<{
    ok: boolean;
    skipped: boolean;
    sent?: undefined;
} | {
    sent: boolean;
    ok?: undefined;
    skipped?: undefined;
}>;
export {};
//# sourceMappingURL=delivery-credentials-email-service.d.ts.map