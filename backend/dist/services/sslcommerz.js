import SSLCommerzPayment from 'sslcommerz-lts';
import { env } from '../config/env.js';
export class SslCommerzService {
    sslcz;
    constructor() {
        const storeId = env.sslCommerzStoreId;
        const storePassword = env.sslCommerzStorePassword;
        const isLive = env.sslCommerzLive;
        this.sslcz = new SSLCommerzPayment(storeId, storePassword, isLive);
    }
    /**
     * Initialize a payment session
     */
    async init(payload) {
        try {
            return await this.sslcz.init(payload);
        }
        catch (error) {
            console.error('SSLCommerz Init Error:', error);
            throw error;
        }
    }
    /**
     * Validate a transaction after success/IPN callback
     */
    async validate(payload) {
        try {
            return await this.sslcz.validate(payload);
        }
        catch (error) {
            console.error('SSLCommerz Validation Error:', error);
            throw error;
        }
    }
    /**
     * Initiate a refund request
     */
    async initiateRefund(payload) {
        try {
            return await this.sslcz.initiateRefund(payload);
        }
        catch (error) {
            console.error('SSLCommerz Refund Error:', error);
            throw error;
        }
    }
    /**
     * Query the status of a refund request
     */
    async refundQuery(payload) {
        try {
            return await this.sslcz.refundQuery(payload);
        }
        catch (error) {
            console.error('SSLCommerz Refund Query Error:', error);
            throw error;
        }
    }
    /**
     * Query transaction status by Transaction ID
     */
    async transactionQueryByTransactionId(payload) {
        try {
            return await this.sslcz.transactionQueryByTransactionId(payload);
        }
        catch (error) {
            console.error('SSLCommerz Transaction Query Error:', error);
            throw error;
        }
    }
    /**
     * Query transaction status by Session ID
     */
    async transactionQueryBySessionId(payload) {
        try {
            return await this.sslcz.transactionQueryBySessionId(payload);
        }
        catch (error) {
            console.error('SSLCommerz Session Query Error:', error);
            throw error;
        }
    }
}
export const sslCommerzService = new SslCommerzService();
//# sourceMappingURL=sslcommerz.js.map