export type OrderStatusEmailInput = {
    to: string;
    customerName?: string | null;
    orderRef: string;
    status: string;
    shopName?: string | null;
};
export declare function sendOrderStatusEmail(input: OrderStatusEmailInput): Promise<{
    ok: boolean;
    skipped: boolean;
    reason: string;
    provider?: undefined;
    data?: undefined;
} | {
    ok: boolean;
    skipped: boolean;
    provider: string;
    data: any;
    reason?: undefined;
}>;
//# sourceMappingURL=email-service.d.ts.map