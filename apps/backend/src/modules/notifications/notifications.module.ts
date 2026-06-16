import { Module } from '@nestjs/common';
import { FcmService } from '../../common/services/fcm.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, FcmService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
