import { sslCommerzService } from '../src/services/sslcommerz.js';
import { env } from '../src/config/env.js';

async function testInit() {
  console.log('Testing SSLCommerz Init with Store ID:', env.sslCommerzStoreId);
  try {
    const result = await sslCommerzService.init({
      total_amount: 100,
      currency: 'BDT',
      tran_id: 'TEST_' + Date.now(),
      success_url: 'http://localhost:4000/api/payments/sslcommerz/success',
      fail_url: 'http://localhost:4000/api/payments/sslcommerz/fail',
      cancel_url: 'http://localhost:4000/api/payments/sslcommerz/cancel',
      shipping_method: 'NO',
      num_of_item: 1,
      product_name: 'Test Product',
      product_category: 'Repair',
      product_profile: 'general',
      cus_name: 'Test Customer',
      cus_email: 'test@example.com',
      cus_add1: 'Dhaka',
      cus_city: 'Dhaka',
      cus_postcode: '1000',
      cus_country: 'Bangladesh',
      cus_phone: '01711111111'
    });
    console.log('Success! Gateway URL:', result.GatewayPageURL);
  } catch (error) {
    console.error('Failed!', error);
  }
}

testInit();
