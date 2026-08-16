import { Injectable, Logger } from '@nestjs/common';
import type {
  INotificationService,
  PickupNotificationPayload,
} from '../common/interfaces';

/**
 * Stub implementation of INotificationService that logs to the console.
 * In production, replace with an SMS provider (e.g., Twilio) or
 * email service (e.g., SendGrid) by implementing INotificationService.
 */
@Injectable()
export class ConsoleNotificationService implements INotificationService {
  private readonly logger = new Logger(ConsoleNotificationService.name);

  sendPickupNotification(payload: PickupNotificationPayload): void {
    this.logger.log(
      `📦 [NOTIFICATION] To: ${payload.recipientName}\n` +
        `   Your package is ready for pickup!\n` +
        `   Location: ${payload.lockerLocation}\n` +
        `   Locker: ${payload.lockerId}\n` +
        `   Pickup Code: ${payload.pickupCode}\n` +
        `   Please collect before: ${payload.expiresAt.toISOString()}`,
    );
  }
}
