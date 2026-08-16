import { HttpException, HttpStatus } from '@nestjs/common';

export class PaymentFailedException extends HttpException {
  constructor(message: string = 'Payment processing failed. Please try again.') {
    super(message, HttpStatus.PAYMENT_REQUIRED);
  }
}
