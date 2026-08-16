import { Module } from '@nestjs/common';
import { NOTIFICATION_SERVICE } from '../common/interfaces';
import { ConsoleNotificationService } from './console-notification.service';

const notificationServiceProvider = {
  provide: NOTIFICATION_SERVICE,
  useClass: ConsoleNotificationService,
};

@Module({
  providers: [notificationServiceProvider],
  exports: [notificationServiceProvider],
})
export class NotificationsModule {}
