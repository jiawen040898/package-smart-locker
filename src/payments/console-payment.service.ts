import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { IPaymentService, PaymentResult } from '../common/interfaces';

/**
 * Stub implementation of IPaymentService that logs to the console.
 * In production, replace with Stripe, PayPal, or a cash kiosk integration.
 */
@Injectable()
export class ConsolePaymentService implements IPaymentService {
  private readonly logger = new Logger(ConsolePaymentService.name);

  processPayment(amount: number, currency: string, recipientName: string): PaymentResult {
    const transactionId = `TXN-${randomUUID().slice(0, 8).toUpperCase()}`;

    this.logger.log(
      `💳 [PAYMENT] Transaction: ${transactionId} | ` +
        `Customer: ${recipientName} | ` +
        `Amount: ${amount} ${currency} | ` +
        `Status: SUCCESS`,
    );

    return {
      success: true,
      transactionId,
      amount,
      currency,
    };
  }
}
