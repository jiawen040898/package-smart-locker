import { Module } from '@nestjs/common';
import { PAYMENT_SERVICE } from '../common/interfaces';
import { ConsolePaymentService } from './console-payment.service';

const paymentServiceProvider = {
  provide: PAYMENT_SERVICE,
  useClass: ConsolePaymentService,
};

@Module({
  providers: [paymentServiceProvider],
  exports: [paymentServiceProvider],
})
export class PaymentsModule {}
