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
    sent: boolean;
}>;
export declare function sendDeliveryRegistrationAcknowledgementEmail(input: RegistrationAcknowledgementEmailInput): Promise<{
    sent: boolean;
}>;
export {};
//# sourceMappingURL=delivery-credentials-email-service.d.ts.map