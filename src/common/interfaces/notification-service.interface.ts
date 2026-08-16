export const NOTIFICATION_SERVICE = Symbol('NOTIFICATION_SERVICE');

export interface PickupNotificationPayload {
  recipientName: string;
  pickupCode: string;
  lockerId: string;
  lockerLocation: string;
  expiresAt: Date;
}

/**
 * Abstraction for sending notifications to customers.
 * Implementations could use SMS (Twilio), email (SendGrid), push notifications, etc.
 */
export interface INotificationService {
  /**
   * Sends the pickup details to the customer for package retrieval.
   */
  sendPickupNotification(payload: PickupNotificationPayload): void;
}
