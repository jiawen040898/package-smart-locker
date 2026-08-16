export const PAYMENT_SERVICE = Symbol('PAYMENT_SERVICE');

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  amount: number;
  currency: string;
}

/**
 * Abstraction for processing payments.
 * Implementations could use Stripe, PayPal, cash kiosk, etc.
 */
export interface IPaymentService {
  /**
   * Processes a payment for the storage charge.
   * @param amount - The amount to charge
   * @param currency - The currency code (e.g., 'MYR')
   * @param recipientName - Name of the customer being charged
   * @returns Payment result with transaction ID
   */
  processPayment(amount: number, currency: string, recipientName: string): PaymentResult;
}
