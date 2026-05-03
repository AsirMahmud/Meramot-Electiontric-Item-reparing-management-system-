import SSLCommerzPayment from 'sslcommerz-lts';
import { env } from '../config/env.js';

// Types for SSLCommerz Payload based on official documentation
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
  productcategory?: string; // Compatibility field
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

export class SslCommerzService {
  private sslcz: any;

  constructor() {
    const storeId = env.sslCommerzStoreId;
    const storePassword = env.sslCommerzStorePassword;
    const isLive = env.sslCommerzLive;


    this.sslcz = new (SSLCommerzPayment as any)(storeId, storePassword, isLive);
  }

  /**
   * Initialize a payment session
   */
  async init(payload: SslCommerzInitPayload): Promise<any> {
    try {
      return await this.sslcz.init(payload);
    } catch (error: any) {
      console.error('SSLCommerz Init Error:', error);
      throw error;
    }
  }

  /**
   * Validate a transaction after success/IPN callback
   */
  async validate(payload: SslCommerzValidatePayload): Promise<any> {
    try {
      return await this.sslcz.validate(payload);
    } catch (error: any) {
      console.error('SSLCommerz Validation Error:', error);
      throw error;
    }
  }

  /**
   * Initiate a refund request
   */
  async initiateRefund(payload: SslCommerzRefundPayload): Promise<any> {
    try {
      return await this.sslcz.initiateRefund(payload);
    } catch (error: any) {
      console.error('SSLCommerz Refund Error:', error);
      throw error;
    }
  }

  /**
   * Query the status of a refund request
   */
  async refundQuery(payload: SslCommerzRefundQueryPayload): Promise<any> {
    try {
      return await this.sslcz.refundQuery(payload);
    } catch (error: any) {
      console.error('SSLCommerz Refund Query Error:', error);
      throw error;
    }
  }

  /**
   * Query transaction status by Transaction ID
   */
  async transactionQueryByTransactionId(payload: { tran_id: string }): Promise<any> {
    try {
      return await this.sslcz.transactionQueryByTransactionId(payload);
    } catch (error: any) {
      console.error('SSLCommerz Transaction Query Error:', error);
      throw error;
    }
  }

  /**
   * Query transaction status by Session ID
   */
  async transactionQueryBySessionId(payload: { sessionkey: string }): Promise<any> {
    try {
      return await this.sslcz.transactionQueryBySessionId(payload);
    } catch (error: any) {
      console.error('SSLCommerz Session Query Error:', error);
      throw error;
    }
  }
}

export const sslCommerzService = new SslCommerzService();
