export type SslCommerzInitPayload = {
    total_amount: number;
    currency: string;
    tran_id: string;
    success_url: string;
    fail_url: string;
    cancel_url: string;
    ipn_url?: string;
    shipping_method: string;
    num_of_item: number;
    product_name: string;
    product_category: string;
    productcategory?: string;
    product_profile: string;
    cus_name: string;
    cus_email: string;
    cus_add1: string;
    cus_add2?: string;
    cus_city: string;
    cus_state?: string;
    cus_postcode: string;
    cus_country: string;
    cus_phone: string;
    cus_fax?: string;
    ship_name?: string;
    ship_add1?: string;
    ship_add2?: string;
    ship_city?: string;
    ship_state?: string;
    ship_postcode?: string;
    ship_country?: string;
    value_a?: string;
    value_b?: string;
    value_c?: string;
    value_d?: string;
    multi_card_name?: string;
    allowed_bin?: string;
    emi_option?: number;
};
export type SslCommerzValidatePayload = {
    val_id: string;
};
export type SslCommerzRefundPayload = {
    refund_amount: number;
    refund_remarks: string;
    bank_tran_id: string;
    refe_id: string;
};
export type SslCommerzQueryPayload = {
    tran_id?: string;
    sessionkey?: string;
};
export type SslCommerzRefundQueryPayload = {
    refund_ref_id: string;
};
export declare class SslCommerzService {
    private sslcz;
    constructor();
    /**
     * Initialize a payment session
     */
    init(payload: SslCommerzInitPayload): Promise<any>;
    /**
     * Validate a transaction after success/IPN callback
     */
    validate(payload: SslCommerzValidatePayload): Promise<any>;
    /**
     * Initiate a refund request
     */
    initiateRefund(payload: SslCommerzRefundPayload): Promise<any>;
    /**
     * Query the status of a refund request
     */
    refundQuery(payload: SslCommerzRefundQueryPayload): Promise<any>;
    /**
     * Query transaction status by Transaction ID
     */
    transactionQueryByTransactionId(payload: {
        tran_id: string;
    }): Promise<any>;
    /**
     * Query transaction status by Session ID
     */
    transactionQueryBySessionId(payload: {
        sessionkey: string;
    }): Promise<any>;
}
export declare const sslCommerzService: SslCommerzService;
//# sourceMappingURL=sslcommerz.d.ts.map